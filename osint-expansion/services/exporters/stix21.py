"""STIX 2.1 JSON Bundle Exporter - enterprise threat intel format."""
import uuid, json
from datetime import datetime, timezone
from typing import Any, Optional


def _stix_id(prefix: str) -> str:
    return f"{prefix}--{uuid.uuid4()}"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class STIX21Exporter:

    @staticmethod
    def email_to_stix(email: str, results: dict) -> dict:
        objects = []
        identity_id = _stix_id("identity")
        objects.append({"type": "identity", "id": identity_id, "name": "TraceMesh OSINT Platform", "identity_class": "system", "created": _timestamp(), "modified": _timestamp()})
        email_id = _stix_id("indicator")
        objects.append({"type": "indicator", "id": email_id, "name": f"Email: {email}", "description": f"OSINT analysis of {email}", "pattern": f"[email-addr:value = '{email}']", "pattern_type": "stix", "created": _timestamp(), "modified": _timestamp(), "indicator_types": ["anonymization", "unknown"]})
        hibp = results.get("hibp", {})
        if isinstance(hibp, dict):
            for breach in hibp.get("breaches", []):
                campaign_id = _stix_id("campaign")
                objects.append({"type": "campaign", "id": campaign_id, "name": f"Data Breach: {breach.get('name', 'Unknown')}", "description": breach.get("description", "")[:500], "aliases": [breach.get("domain", "")] if breach.get("domain") else [], "first_seen": breach.get("date", _timestamp()), "created": _timestamp(), "modified": _timestamp()})
                objects.append({"type": "relationship", "id": _stix_id("relationship"), "relationship_type": "indicates", "source_ref": email_id, "target_ref": campaign_id, "created": _timestamp(), "modified": _timestamp()})
        hunter = results.get("hunter", {})
        if isinstance(hunter, dict) and hunter.get("status"):
            obs_id = _stix_id("observed-data")
            objects.append({"type": "observed-data", "id": obs_id, "first_observed": _timestamp(), "last_observed": _timestamp(), "number_observed": 1, "objects": {"0": {"type": "email-addr", "value": email, "display_name": f"{hunter.get('first_name', '')} {hunter.get('last_name', '')}".strip()}}})
        return {"type": "bundle", "id": f"bundle--{uuid.uuid4()}", "spec_version": "2.1", "created": _timestamp(), "objects": objects}

    @staticmethod
    def domain_to_stix(domain: str, results: dict) -> dict:
        objects = []
        domain_id = _stix_id("indicator")
        objects.append({"type": "indicator", "id": domain_id, "name": f"Domain: {domain}", "pattern": f"[domain-name:value = '{domain}']", "pattern_type": "stix", "created": _timestamp(), "modified": _timestamp()})
        vt = results.get("virustotal", {})
        if isinstance(vt, dict) and vt.get("malicious", 0) > 0:
            objects.append({"type": "indicator", "id": _stix_id("indicator"), "name": f"Malicious domain: {domain}", "description": f"VT detected {vt['malicious']} malicious + {vt.get('suspicious', 0)} suspicious", "pattern": f"[domain-name:value = '{domain}']", "pattern_type": "stix", "indicator_types": ["malicious-activity"], "created": _timestamp(), "modified": _timestamp()})
        st = results.get("securitytrails", {})
        if isinstance(st, dict):
            for sub in st.get("subdomains", [])[:20]:
                objects.append({"type": "domain-name", "id": _stix_id("domain-name"), "value": sub})
        return {"type": "bundle", "id": f"bundle--{uuid.uuid4()}", "spec_version": "2.1", "created": _timestamp(), "objects": objects}

    @staticmethod
    def ip_to_stix(ip: str, results: dict) -> dict:
        objects = []
        ip_id = _stix_id("indicator")
        objects.append({"type": "indicator", "id": ip_id, "name": f"IP: {ip}", "pattern": f"[ipv4-addr:value = '{ip}']", "pattern_type": "stix", "created": _timestamp(), "modified": _timestamp()})
        gn = results.get("greynoise", {})
        if isinstance(gn, dict):
            context = gn.get("context", {})
            if context.get("tags"):
                objects.append({"type": "threat-actor", "id": _stix_id("threat-actor"), "name": context.get("actor", "Unknown Actor"), "description": f"Tags: {', '.join(context.get('tags', []))}", "aliases": [context.get("actor")] if context.get("actor") else [], "created": _timestamp(), "modified": _timestamp()})
        vt = results.get("virustotal", {})
        if isinstance(vt, dict) and vt.get("malicious", 0) > 0:
            objects.append({"type": "indicator", "id": _stix_id("indicator"), "name": f"Malicious IP: {ip}", "description": f"{vt['malicious']} engines detected malicious activity", "pattern": f"[ipv4-addr:value = '{ip}']", "pattern_type": "stix", "indicator_types": ["malicious-activity"], "created": _timestamp(), "modified": _timestamp()})
        return {"type": "bundle", "id": f"bundle--{uuid.uuid4()}", "spec_version": "2.1", "created": _timestamp(), "objects": objects}

    @staticmethod
    def to_json(data: dict, indent: int = 2) -> str:
        return json.dumps(data, indent=indent, default=str)
