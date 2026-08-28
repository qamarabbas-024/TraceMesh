"""Self-hosted OSINT tool wrappers - no API keys needed"""
import asyncio


async def run_subprocess(cmd: list[str], timeout: int = 30) -> str:
    """Run a shell command asynchronously and return stdout"""
    import subprocess
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        if proc.returncode != 0:
            return f"[ERROR] {stderr.decode(errors='ignore')}"
        return stdout.decode(errors='ignore')
    except asyncio.TimeoutError:
        return "[ERROR] Command timed out"
    except FileNotFoundError:
        return "[ERROR] Tool not installed"


class SelfHostedExtendedTools:
    """Additional self-hosted tool wrappers"""

    @staticmethod
    async def wappalyzer_local(domain: str) -> dict:
        """Run Wappalyzer CLI in Docker (free, no key)"""
        output = await run_subprocess(
            ["docker", "run", "--rm", "wappalyzer/cli", f"https://{domain}"],
            timeout=60
        )
        return {"domain": domain, "raw": output[:5000]}

    @staticmethod
    async def email2phonenumber(email: str) -> dict:
        """email2phonenumber - email to phone number association"""
        output = await run_subprocess(
            ["email2phonenumber", "--email", email, "--timeout", "15"],
            timeout=30
        )
        return {"email": email, "results": output[:2000]}

    @staticmethod
    async def crosslinked(company: str, domain: str = "") -> dict:
        """CrossLinked - LinkedIn employee email enumeration"""
        fmt = "-f {first}.{last}@" + (domain or "example.com")
        output = await run_subprocess(
            ["crosslinked", fmt, company],
            timeout=60
        )
        return {"company": company, "emails_found": output[:3000]}

    @staticmethod
    async def waybackpy_urls(domain: str) -> dict:
        """Wayback Machine - historical URLs"""
        output = await run_subprocess(
            ["waybackpy", "--url", f"https://{domain}",
             "--user_agent", "TraceMesh/1.0", "--known_urls"],
            timeout=30
        )
        urls = [u for u in output.split("\n") if u.strip()]
        return {"domain": domain, "historical_urls": urls[:100], "total": len(urls)}
