"""Email OSINT APIs - Hunter.io, EmailRep, HIBP, Dehashed, IntelX"""
import httpx
import asyncio
from config import settings


class EmailOSINT:

    @staticmethod
    async def hunter_verify(email: str) -> dict:
        if not settings.hunter_api_key:
            return {"error": "No Hunter API key configured"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.hunter.io/v2/email-verifier",
                    params={"email": email, "api_key": settings.hunter_api_key}
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    return {
                        "email": email, "status": data.get("status"), "score": data.get("score"),
                        "disposable": data.get("disposable"), "webmail": data.get("webmail"),
                        "mx_records": data.get("mx_records"), "smtp_server": data.get("smtp_server"),
                        "smtp_check": data.get("smtp_check"), "first_name": data.get("firstname"),
                        "last_name": data.get("lastname"), "pattern": data.get("pattern"),
                    }
                return {"error": f"Hunter HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"Hunter connection error: {str(e)[:100]}"}

    @staticmethod
    async def emailrep(email: str) -> dict:
        try:
            headers = {"User-Agent": "TraceMesh-OSINT/1.0"}
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(f"https://emailrep.io/{email}", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "email": email, "reputation": data.get("reputation"),
                        "suspicious": data.get("suspicious"), "references": data.get("references"),
                        "details": {
                            "malicious_activity": data.get("details", {}).get("malicious_activity"),
                            "credential_leaked": data.get("details", {}).get("credential_leaked"),
                            "data_breach": data.get("details", {}).get("data_breach"),
                            "spam": data.get("details", {}).get("spam"),
                        }
                    }
                return {"error": f"EmailRep HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"EmailRep connection error: {str(e)[:100]}"}

    @staticmethod
    async def hibp(email: str) -> dict:
        if not settings.hibp_api_key:
            return {"error": "No HIBP API key"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}",
                    headers={"hibp-api-key": settings.hibp_api_key, "user-agent": "TraceMesh-OSINT/1.0"},
                    params={"truncateResponse": "false"}
                )
                if resp.status_code == 200:
                    breaches = resp.json()
                    return {
                        "email": email, "breach_count": len(breaches),
                        "breaches": [{
                            "name": b.get("Name"), "domain": b.get("Domain"), "date": b.get("BreachDate"),
                            "data_classes": b.get("DataClasses"), "description": b.get("Description"),
                            "pwn_count": b.get("PwnCount"), "verified": b.get("IsVerified"),
                        } for b in breaches]
                    }
                elif resp.status_code == 404:
                    return {"email": email, "breach_count": 0, "breaches": [], "note": "No breaches found"}
                return {"error": f"HIBP HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"HIBP connection error: {str(e)[:100]}"}

    @staticmethod
    async def dehashed_search(query: str, query_type: str = "email") -> dict:
        if not settings.dehashed_api_key or not settings.dehashed_email:
            return {"error": "No Dehashed credentials configured"}
        try:
            auth = httpx.BasicAuth(settings.dehashed_email, settings.dehashed_api_key)
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.dehashed.com/search",
                    params={"query": f"{query_type}:{query}", "size": 50}, auth=auth
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {"query": query, "total": data.get("total", 0), "results": data.get("entries", []), "balance": data.get("balance", 0)}
                return {"error": f"Dehashed HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"Dehashed connection error: {str(e)[:100]}"}

    @staticmethod
    async def intelx_search(query: str) -> dict:
        if not settings.intelx_api_key:
            return {"error": "No IntelX API key"}
        try:
            headers = {"x-key": settings.intelx_api_key, "x-user": settings.dehashed_email or "tracemesh"}
            async with httpx.AsyncClient(timeout=15) as client:
                search_resp = await client.post(
                    "https://2.intelx.io/intelligent/search", headers=headers,
                    json={"term": query, "buckets": ["leaks.public", "darknet.public"], "lookuplevel": 1, "maxresults": 50, "timeoutsec": 10}
                )
                if search_resp.status_code != 200:
                    return {"error": f"IntelX search HTTP {search_resp.status_code}"}
                search_id = search_resp.json().get("id")
                if not search_id:
                    return {"query": query, "results": []}
                await asyncio.sleep(2)
                result_resp = await client.get(f"https://2.intelx.io/intelligent/search/result?id={search_id}&limit=50", headers=headers)
                if result_resp.status_code == 200:
                    data = result_resp.json()
                    records = data.get("records", [])
                    return {"query": query, "total": data.get("total", len(records)), "results": [{"name": r.get("name"), "bucket": r.get("bucket"), "date": r.get("date"), "system": r.get("system")} for r in records]}
                return {"error": f"IntelX result HTTP {result_resp.status_code}"}
        except Exception as e:
            return {"error": f"IntelX connection error: {str(e)[:100]}"}
