"""Domain OSINT APIs - SecurityTrails, URLScan, BuiltWith, VirusTotal, Wappalyzer"""
import httpx
import asyncio
from config import settings


class DomainOSINT:

    @staticmethod
    async def securitytrails_dns_history(domain: str) -> dict:
        if not settings.securitytrails_api_key:
            return {"error": "No SecurityTrails API key"}
        try:
            headers = {"APIKEY": settings.securitytrails_api_key}
            async with httpx.AsyncClient(timeout=10) as client:
                sub_resp = await client.get(f"https://api.securitytrails.com/v1/domain/{domain}/subdomains", headers=headers)
                subs = []
                if sub_resp.status_code == 200:
                    subs = sub_resp.json().get("subdomains", [])
                hist_resp = await client.get(f"https://api.securitytrails.com/v1/history/{domain}/dns/a", headers=headers)
                history = []
                if hist_resp.status_code == 200:
                    history = hist_resp.json().get("records", [])
                return {
                    "domain": domain, "subdomains": [f"{s}.{domain}" for s in subs[:50]],
                    "subdomain_count": len(subs),
                    "dns_history": [{"ip": r.get("ip"), "first_seen": r.get("first_seen"), "last_seen": r.get("last_seen"), "organizations": r.get("organizations", [])} for r in history[:20]],
                }
        except Exception as e:
            return {"error": f"SecurityTrails error: {str(e)[:100]}"}

    @staticmethod
    async def urlscan(domain: str) -> dict:
        if not settings.urlscan_api_key:
            return {"error": "No URLScan API key"}
        try:
            headers = {"API-Key": settings.urlscan_api_key, "Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=10) as client:
                search_resp = await client.get("https://urlscan.io/api/v1/search/", params={"q": f"domain:{domain} OR hostname:{domain}", "size": 10}, headers=headers)
                if search_resp.status_code == 200:
                    results = search_resp.json().get("results", [])
                    return {"domain": domain, "total_scans": search_resp.json().get("total", 0), "scans": [{"url": r.get("page", {}).get("url"), "ip": r.get("page", {}).get("ip"), "country": r.get("page", {}).get("country"), "server": r.get("page", {}).get("server"), "status": r.get("page", {}).get("status"), "screenshot": r.get("screenshot"), "scan_date": r.get("task", {}).get("time"), "malicious": r.get("verdicts", {}).get("malicious", {}).get("score", 0)} for r in results]}
                return {"error": f"URLScan HTTP {search_resp.status_code}"}
        except Exception as e:
            return {"error": f"URLScan error: {str(e)[:100]}"}

    @staticmethod
    async def urlscan_submit_and_wait(domain: str) -> dict:
        if not settings.urlscan_api_key:
            return {"error": "No URLScan API key"}
        try:
            headers = {"API-Key": settings.urlscan_api_key, "Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=20) as client:
                submit_resp = await client.post("https://urlscan.io/api/v1/scan/", headers=headers, json={"url": f"https://{domain}", "public": "on"})
                if submit_resp.status_code == 429:
                    return {"error": "URLScan rate limited - wait and retry"}
                if submit_resp.status_code not in (200, 201):
                    return {"error": f"URLScan submit HTTP {submit_resp.status_code}"}
                scan_uuid = submit_resp.json().get("uuid")
                if not scan_uuid:
                    return {"error": "No UUID returned"}
                for _ in range(5):
                    await asyncio.sleep(2)
                    result_resp = await client.get(f"https://urlscan.io/api/v1/result/{scan_uuid}/", headers=headers)
                    if result_resp.status_code == 200:
                        data = result_resp.json()
                        page = data.get("page", {})
                        verdicts = data.get("verdicts", {})
                        tech = []
                        try:
                            tech = [t.get("name") for t in data.get("meta", {}).get("processors", {}).get("wappalyzer", {}).get("data", [])]
                        except Exception:
                            pass
                        return {"domain": domain, "url": page.get("url"), "ip": page.get("ip"), "country": page.get("country"), "server": page.get("server"), "tech": tech, "screenshot": f"https://urlscan.io/screenshots/{scan_uuid}.png", "dom": f"https://urlscan.io/dom/{scan_uuid}", "malicious_score": verdicts.get("malicious", {}).get("score", 0)}
                return {"error": "URLScan timeout waiting for result"}
        except Exception as e:
            return {"error": f"URLScan submit error: {str(e)[:100]}"}

    @staticmethod
    async def builtwith(domain: str) -> dict:
        if not settings.builtwith_api_key:
            return {"error": "No BuiltWith API key"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get("https://api.builtwith.com/v21/api.json", params={"KEY": settings.builtwith_api_key, "LOOKUP": domain})
                if resp.status_code == 200:
                    data = resp.json()
                    groups = data.get("Results", [{}])[0].get("Result", {}).get("Paths", [])
                    techs = []
                    for path in groups:
                        for sub in path.get("SubDomain", []):
                            techs.append({"technology": sub.get("Technology"), "category": sub.get("Tag"), "link": sub.get("Link")})
                    seen = set()
                    unique_techs = []
                    for t in techs:
                        if t["technology"] and t["technology"] not in seen:
                            seen.add(t["technology"])
                            unique_techs.append(t)
                    return {"domain": domain, "technologies": unique_techs, "count": len(unique_techs)}
                return {"error": f"BuiltWith HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"BuiltWith error: {str(e)[:100]}"}

    @staticmethod
    async def virustotal_domain(domain: str) -> dict:
        if not settings.virustotal_api_key:
            return {"error": "No VT API key"}
        try:
            headers = {"x-apikey": settings.virustotal_api_key}
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"https://www.virustotal.com/api/v3/domains/{domain}", headers=headers)
                if resp.status_code == 200:
                    attr = resp.json().get("data", {}).get("attributes", {})
                    stats = attr.get("last_analysis_stats", {})
                    return {"domain": domain, "malicious": stats.get("malicious", 0), "suspicious": stats.get("suspicious", 0), "harmless": stats.get("harmless", 0), "undetected": stats.get("undetected", 0), "categories": attr.get("categories", {}), "popularity": attr.get("popularity_ranks", {}), "last_analysis": attr.get("last_analysis_date"), "reputation": attr.get("reputation", 0)}
                return {"error": f"VT HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"VirusTotal error: {str(e)[:100]}"}

    @staticmethod
    async def wappalyzer_api(domain: str) -> dict:
        if not settings.wappalyzer_api_key:
            return {"error": "No Wappalyzer API key. Use self-hosted: docker run wappalyzer/cli https://domain"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"https://api.wappalyzer.com/v2/lookup/{domain}", params={"sets": "all"}, headers={"x-api-key": settings.wappalyzer_api_key})
                if resp.status_code == 200:
                    data = resp.json()
                    technologies = [{"name": t.get("name"), "category": [c.get("name") for c in t.get("categories", [])], "version": t.get("version"), "confidence": t.get("confidence")} for t in data.get("technologies", [])]
                    return {"domain": domain, "technologies": technologies, "count": len(technologies)}
                return {"error": f"Wappalyzer HTTP {resp.status_code}"}
        except Exception as e:
            return {"error": f"Wappalyzer error: {str(e)[:100]}"}
