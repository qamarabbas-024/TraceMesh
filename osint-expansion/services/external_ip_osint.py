"""IP/Network OSINT APIs - VirusTotal IP, GreyNoise, Censys, Shodan"""
import httpx
from config import settings


class IPOSINT:
    """Extended IP intelligence - noise classification, internet scanning, reputation"""

    @staticmethod
    async def virustotal_ip(ip: str) -> dict:
        """VirusTotal IP reputation"""
        if not settings.virustotal_api_key:
            return {"error": "No VT API key"}
        headers = {"x-apikey": settings.virustotal_api_key}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                headers=headers
            )
            if resp.status_code == 200:
                attr = resp.json().get("data", {}).get("attributes", {})
                stats = attr.get("last_analysis_stats", {})
                return {
                    "ip": ip,
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "country": attr.get("country"),
                    "asn": attr.get("asn"),
                    "as_owner": attr.get("as_owner"),
                    "network": attr.get("network"),
                    "reputation": attr.get("reputation", 0),
                    "resolutions": [{
                        "hostname": r.get("host_name"),
                        "resolved_at": r.get("date"),
                    } for r in (attr.get("resolutions") or [])[:10]],
                }
            return {"error": f"VT IP HTTP {resp.status_code}"}

    @staticmethod
    async def greynoise(ip: str) -> dict:
        """GreyNoise - is this IP scanning the internet / noise?"""
        if not settings.greynoise_api_key:
            return {"error": "No GreyNoise API key"}
        headers = {"key": settings.greynoise_api_key, "Accept": "application/json"}
        async with httpx.AsyncClient(timeout=15) as client:
            quick_data, context_data = {}, {}
            quick_resp = await client.get(f"https://api.greynoise.io/v3/community/{ip}", headers=headers)
            if quick_resp.status_code == 200:
                qd = quick_resp.json()
                quick_data = {
                    "noise": qd.get("noise"),
                    "riot": qd.get("riot"),
                    "classification": qd.get("classification"),
                    "name": qd.get("name"),
                    "last_seen": qd.get("last_seen"),
                }

            context_resp = await client.get(f"https://api.greynoise.io/v2/noise/context/{ip}", headers=headers)
            if context_resp.status_code == 200:
                cd = context_resp.json()
                context_data = {
                    "actor": cd.get("actor"),
                    "category": cd.get("category"),
                    "cve": cd.get("cve"),
                    "first_seen": cd.get("first_seen"),
                    "last_seen": cd.get("last_seen"),
                    "ports": cd.get("ports"),
                    "tags": cd.get("tags"),
                    "metadata": {
                        "city": cd.get("metadata", {}).get("city"),
                        "country": cd.get("metadata", {}).get("country"),
                        "organization": cd.get("metadata", {}).get("organization"),
                        "asn": cd.get("metadata", {}).get("asn"),
                    }
                }

            return {"ip": ip, "community": quick_data, "context": context_data}

    @staticmethod
    async def censys_ip(ip: str) -> dict:
        """Censys - certificates, open ports, services on IP"""
        if not settings.censys_api_id or not settings.censys_api_secret:
            return {"error": "No Censys credentials"}
        auth = httpx.BasicAuth(settings.censys_api_id, settings.censys_api_secret)
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(f"https://search.censys.io/api/v2/hosts/{ip}", auth=auth)
            if resp.status_code == 200:
                data = resp.json().get("result", {})
                services = data.get("services", [])
                location = data.get("location", {})
                return {
                    "ip": ip,
                    "location": {
                        "city": location.get("city"),
                        "country": location.get("country"),
                        "coordinates": location.get("coordinates"),
                    },
                    "asn": data.get("asn"),
                    "asn_name": data.get("asn_name"),
                    "os": data.get("operating_system"),
                    "services": [{
                        "port": s.get("port"),
                        "protocol": s.get("protocol"),
                        "service_name": s.get("service_name"),
                        "software": s.get("software", []),
                        "certificate": s.get("certificate"),
                    } for s in (services or [])[:20]],
                    "service_count": len(services or []),
                }
            return {"error": f"Censys HTTP {resp.status_code}"}

    @staticmethod
    async def shodan_ip(ip: str) -> dict:
        """Shodan - device exposure data"""
        if not settings.shodan_api_key:
            return {"error": "No Shodan API key"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://api.shodan.io/shodan/host/{ip}",
                params={"key": settings.shodan_api_key}
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ip": ip,
                    "organization": data.get("org"),
                    "os": data.get("os"),
                    "country": data.get("country_name"),
                    "city": data.get("city"),
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "asn": data.get("asn"),
                    "ports": data.get("ports", []),
                    "vulns": data.get("vulns", {}),
                    "hostnames": data.get("hostnames", []),
                    "services": [{
                        "port": s.get("port"),
                        "transport": s.get("transport"),
                        "product": s.get("product"),
                        "version": s.get("version"),
                        "banner": s.get("data", "")[:200],
                        "cpe": s.get("cpe", []),
                    } for s in (data.get("data") or [])[:15]],
                }
            return {"error": f"Shodan HTTP {resp.status_code}"}
