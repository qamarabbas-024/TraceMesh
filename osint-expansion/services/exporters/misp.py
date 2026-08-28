"""MISP Event JSON Exporter - compatible with MISP threat sharing platform."""
import uuid, json
from datetime import datetime, timezone


def _misp_id() -> str:
    return str(uuid.uuid4())


def _epoch() -> int:
    return int(datetime.now(timezone.utc).timestamp())


class MISPExporter:

    @staticmethod
    def _base_event(info: str) -> dict:
        return {"Event": {"uuid": _misp_id(), "info": info, "published": False, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "timestamp": _epoch(), "threat_level_id": 3, "analysis": 0, "distribution": 3, "Attribute": [], "Tag": []}}

    @staticmethod
    def _attribute(type_: str, value: str, **kwargs) -> dict:
        return {"uuid": _misp_id(), "type": type_, "value": value, "category": kwargs.get("category", "Network activity"), "timestamp": _epoch(), "to_ids": kwargs.get("to_ids", True), "comment": kwargs.get("comment", "")}

    @staticmethod
    def email_to_misp(email: str, results: dict) -> dict:
        event = MISPExporter._base_event(f"TraceMesh OSINT: Email {email}")
        attributes = event["Event"]["Attribute"]
        attributes.append(MISPExporter._attribute("email", email, category="Payload delivery"))
        hibp = results.get("hibp", {})
        if isinstance(hibp, dict):
            for breach in hibp.get("breaches", []):
                attributes.append(MISPExporter._attribute("text", f"Breach: {breach.get('name')} ({breach.get('domain')}) - {breach.get('date')}", category="Attribution", comment=f"{breach.get('pwn_count', 'Unknown')} accounts compromised"))
                for dc in breach.get("data_classes", []):
                    attributes.append(MISPExporter._attribute("text", f"Data type exposed: {dc}", category="Attribution"))
        hunter = results.get("hunter", {})
        if isinstance(hunter, dict) and hunter.get("first_name"):
            attributes.append(MISPExporter._attribute("text", f"Name: {hunter.get('first_name')} {hunter.get('last_name')}", category="Person", comment=f"Score: {hunter.get('score')} | Pattern: {hunter.get('pattern')}"))
        emailrep = results.get("emailrep", {})
        if isinstance(emailrep, dict) and emailrep.get("reputation"):
            attributes.append(MISPExporter._attribute("text", f"EmailRep reputation: {emailrep.get('reputation')}", category="Other", comment=f"Suspicious: {emailrep.get('suspicious')} | References: {emailrep.get('references', 0)}"))
        return event

    @staticmethod
    def domain_to_misp(domain: str, results: dict) -> dict:
        event = MISPExporter._base_event(f"TraceMesh OSINT: Domain {domain}")
        attributes = event["Event"]["Attribute"]
        attributes.append(MISPExporter._attribute("domain", domain))
        st = results.get("securitytrails", {})
        if isinstance(st, dict):
            for sub in st.get("subdomains", [])[:30]:
                attributes.append(MISPExporter._attribute("domain", sub, comment="Subdomain via SecurityTrails"))
        dns = results.get("dns", {})
        if isinstance(dns, dict):
            for ip in dns.get("A", []):
                attributes.append(MISPExporter._attribute("ip-dst", ip, comment=f"A record for {domain}"))
            for mx in dns.get("MX", []):
                attributes.append(MISPExporter._attribute("domain", mx, comment="MX server"))
        vt = results.get("virustotal", {})
        if isinstance(vt, dict) and vt.get("malicious", 0) > 0:
            event["Event"]["threat_level_id"] = 2
            attributes.append(MISPExporter._attribute("text", f"VirusTotal: {vt['malicious']} malicious / {vt.get('suspicious', 0)} suspicious", category="External analysis"))
        bw = results.get("builtwith", {})
        if isinstance(bw, dict):
            techs = [t["technology"] for t in bw.get("technologies", [])[:10] if t.get("technology")]
            if techs:
                attributes.append(MISPExporter._attribute("text", f"Technologies: {', '.join(techs)}", category="Other"))
        return event

    @staticmethod
    def ip_to_misp(ip: str, results: dict) -> dict:
        event = MISPExporter._base_event(f"TraceMesh OSINT: IP {ip}")
        attributes = event["Event"]["Attribute"]
        attributes.append(MISPExporter._attribute("ip-dst", ip))
        vt = results.get("virustotal", {})
        if isinstance(vt, dict):
            if vt.get("malicious", 0) > 0:
                event["Event"]["threat_level_id"] = 2
            attributes.append(MISPExporter._attribute("text", f"VT: {vt['malicious']} malicious / {vt.get('suspicious', 0)} suspicious", category="External analysis"))
        gn = results.get("greynoise", {})
        if isinstance(gn, dict):
            community = gn.get("community", {})
            if community.get("noise"):
                attributes.append(MISPExporter._attribute("text", f"GreyNoise: {community.get('classification', 'unknown')} noise", category="Other"))
        shodan = results.get("shodan", {})
        if isinstance(shodan, dict) and shodan.get("ports"):
            attributes.append(MISPExporter._attribute("text", f"Open ports: {', '.join(map(str, shodan['ports']))}", category="Network activity"))
        return event

    @staticmethod
    def to_json(data: dict, indent: int = 2) -> str:
        return json.dumps(data, indent=indent, default=str)
