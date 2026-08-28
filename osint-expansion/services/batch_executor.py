"""Parallel batch execution engine with concurrency control & timeouts."""
import asyncio
from typing import Any, Coroutine


class BatchExecutor:
    def __init__(self, max_concurrent: int = 5, default_timeout: int = 30):
        self.max_concurrent = max_concurrent
        self.default_timeout = default_timeout
        self._semaphore = asyncio.Semaphore(max_concurrent)

    async def _run_with_limits(self, coro: Coroutine, timeout: int) -> dict:
        async with self._semaphore:
            try:
                result = await asyncio.wait_for(coro, timeout=timeout)
                return {"status": "success", "data": result, "error": None}
            except asyncio.TimeoutError:
                return {"status": "timeout", "data": None, "error": f"Timed out after {timeout}s"}
            except Exception as e:
                return {"status": "error", "data": None, "error": str(e)}

    async def execute(self, tasks: list[tuple[str, Coroutine]], timeouts: dict[str, int] = None) -> dict[str, Any]:
        if timeouts is None:
            timeouts = {}
        wrapped = [self._run_with_limits(coro, timeouts.get(name, self.default_timeout)) for name, coro in tasks]
        results = await asyncio.gather(*wrapped, return_exceptions=True)
        output = {}
        for (name, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                output[name] = {"status": "error", "data": None, "error": str(result)}
            else:
                output[name] = result
        return output

    async def execute_email_full(self, email: str, services: dict) -> dict:
        tasks = []
        if "hunter" in services:
            tasks.append(("hunter", services["hunter"].hunter_verify(email)))
        if "emailrep" in services:
            tasks.append(("emailrep", services["emailrep"].emailrep(email)))
        if "hibp" in services:
            tasks.append(("hibp", services["hibp"].hibp(email)))
        if "dehashed" in services:
            tasks.append(("dehashed", services["dehashed"].dehashed_search(email, "email")))
        if "intelx" in services:
            tasks.append(("intelx", services["intelx"].intelx_search(email)))
        return await self.execute(tasks)

    async def execute_domain_full(self, domain: str, services: dict) -> dict:
        tasks = []
        if "securitytrails" in services:
            tasks.append(("securitytrails", services["securitytrails"].securitytrails_dns_history(domain)))
        if "urlscan" in services:
            tasks.append(("urlscan", services["urlscan"].urlscan(domain)))
        if "builtwith" in services:
            tasks.append(("builtwith", services["builtwith"].builtwith(domain)))
        if "virustotal" in services:
            tasks.append(("virustotal", services["virustotal"].virustotal_domain(domain)))
        if "urlhaus" in services:
            from services.external_threat_osint import ThreatOSINT
            tasks.append(("urlhaus", ThreatOSINT.urlhaus_domain(domain)))
        return await self.execute(tasks)

    async def execute_ip_full(self, ip: str, services: dict) -> dict:
        tasks = []
        if "virustotal" in services:
            tasks.append(("virustotal", services["virustotal"].virustotal_ip(ip)))
        if "greynoise" in services:
            tasks.append(("greynoise", services["greynoise"].greynoise(ip)))
        if "censys" in services:
            tasks.append(("censys", services["censys"].censys_ip(ip)))
        if "shodan" in services:
            tasks.append(("shodan", services["shodan"].shodan_ip(ip)))
        return await self.execute(tasks)
