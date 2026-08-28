"""Threat intel - PhishTank, URLhaus, OpenPhish, MISP"""
import httpx
from config import settings


class ThreatOSINT:
    """Threat intelligence feeds + phishing/malware databases"""

    @staticmethod
    async def phishtank_url(url: str) -> dict:
        """Check if URL is in PhishTank database"""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://checkurl.phishtank.com/checkurl/",
                data={
                    "url": url,
                    "format": "json",
                    "app_key": settings.phishtank_api_key or "tracemesh"
                }
            )
            if resp.status_code == 200:
                data = resp.json().get("results", {})
                return {
                    "url": url,
                    "in_database": data.get("in_database", False),
                    "phishing": data.get("phish_id") is not None,
                    "phish_id": data.get("phish_id"),
                    "verified": data.get("verified"),
                    "verified_at": data.get("verified_at"),
                    "target": data.get("target"),
                }
            return {"error": f"PhishTank HTTP {resp.status_code}"}

    @staticmethod
    async def urlhaus_domain(domain: str) -> dict:
        """URLhaus - is domain hosting malware?"""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post("https://urlhaus-api.abuse.ch/v1/host/", data={"host": domain})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("query_status") == "ok":
                    urls = data.get("urls", [])
                    return {
                        "domain": domain,
                        "malicious_url_count": len(urls),
                        "urls": [{
                            "url": u.get("url"),
                            "threat": u.get("threat"),
                            "tags": u.get("tags"),
                            "date_added": u.get("date_added"),
                            "reporter": u.get("reporter"),
                        } for u in urls[:20]],
                        "first_seen": data.get("firstseen"),
                        "last_seen": data.get("lastseen"),
                    }
                return {"domain": domain, "malicious_url_count": 0, "urls": [], "note": data.get("query_status")}
            return {"error": f"URLhaus HTTP {resp.status_code}"}

    @staticmethod
    async def openphish_domain(domain: str) -> dict:
        """OpenPhish - live phishing feed check (no key)"""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get("https://openphish.com/feed.txt")
            if resp.status_code == 200:
                feed = resp.text.split("\n")
                matching = [url for url in feed if domain in url]
                return {
                    "domain": domain,
                    "in_openphish_feed": len(matching) > 0,
                    "matched_urls": matching[:20],
                    "match_count": len(matching),
                }
            return {"error": f"OpenPhish HTTP {resp.status_code}"}

    @staticmethod
    async def misp_lookup(ioc: str, ioc_type: str = "domain") -> dict:
        """MISP instance lookup (optional - needs your own MISP server)"""
        if not settings.misp_url or not settings.misp_api_key:
            return {"error": "No MISP instance configured"}
        headers = {
            "Authorization": settings.misp_api_key,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{settings.misp_url}/attributes/restSearch",
                headers=headers,
                json={"returnFormat": "json", "value": ioc, "type": ioc_type, "limit": 20}
            )
            if resp.status_code == 200:
                data = resp.json()
                attributes = data.get("response", {}).get("Attribute", [])
                return {
                    "ioc": ioc,
                    "attributes_count": len(attributes),
                    "attributes": [{
                        "type": a.get("type"),
                        "value": a.get("value"),
                        "category": a.get("category"),
                        "event_id": a.get("event_id"),
                        "threat_level": a.get("threat_level_id"),
                        "to_ids": a.get("to_ids"),
                        "tags": [t.get("name") for t in (a.get("Tag") or [])],
                    } for a in attributes[:20]],
                }
            return {"error": f"MISP HTTP {resp.status_code}"}
