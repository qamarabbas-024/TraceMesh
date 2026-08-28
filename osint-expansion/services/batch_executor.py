"""Parallel batch executor for multi-target and multi-service OSINT operations."""
import asyncio, time
from typing import Callable, Any, Coroutine


async def execute_parallel(tasks: list[tuple[str, Coroutine[Any, Any, dict]]], timeout: int = 25) -> dict:
    """Execute a list of named async tasks concurrently and gather results with timeout guards."""
    results = {}
    start_time = time.time()

    async def _wrap_task(name: str, coro: Coroutine):
        try:
            res = await asyncio.wait_for(coro, timeout=timeout)
            return name, res
        except asyncio.TimeoutError:
            return name, {"error": f"Task '{name}' timed out after {timeout}s"}
        except Exception as e:
            return name, {"error": f"Task '{name}' failed: {str(e)}"}

    wrapped = [_wrap_task(name, coro) for name, coro in tasks]
    completed = await asyncio.gather(*wrapped, return_exceptions=False)

    for name, res in completed:
        results[name] = res

    results["_meta"] = {
        "total_tasks": len(tasks),
        "execution_duration_ms": int((time.time() - start_time) * 1000),
        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    return results
