"""Automated API key connectivity and quota verification script."""
import asyncio, httpx
from config import settings


async def verify_keys():
    print("=== TRACEMESH API KEY VERIFICATION ===")
    results = {}

    # Hunter
    if settings.hunter_api_key:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"https://api.hunter.io/v2/account?api_key={settings.hunter_api_key}")
            results["Hunter.io"] = "ACTIVE" if r.status_code == 200 else f"ERROR {r.status_code}"
    else:
        results["Hunter.io"] = "NO KEY CONFIGURED"

    # Shodan
    if settings.shodan_api_key:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"https://api.shodan.io/api-info?key={settings.shodan_api_key}")
            results["Shodan"] = "ACTIVE" if r.status_code == 200 else f"ERROR {r.status_code}"
    else:
        results["Shodan"] = "NO KEY CONFIGURED"

    for service, status in results.items():
        print(f"[{status}] {service}")


if __name__ == "__main__":
    asyncio.run(verify_keys())
