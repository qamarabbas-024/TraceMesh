"""Entity correlation and deduplication engine."""
import re
from typing import Any


class CorrelationEngine:

    @staticmethod
    def extract_entities_from_email_results(results: dict) -> dict:
        entities = {"emails": set(), "domains": set(), "names": set(), "breaches": set(), "services_registered": set(), "social_profiles": []}
        hunter = results.get("hunter", {}).get("data", {}) or results.get("hunter", {})
        if isinstance(hunter, dict):
            if hunter.get("first_name") or hunter.get("last_name"):
                entities["names"].add(f"{hunter.get('first_name', '')} {hunter.get('last_name', '')}".strip())
        hibp = results.get("hibp", {}).get("data", {}) or results.get("hibp", {})
        if isinstance(hibp, dict):
            for breach in hibp.get("breaches", []):
                if breach.get("name"):
                    entities["breaches"].add(breach["name"])
                if breach.get("domain"):
                    entities["domains"].add(breach["domain"])
        emailrep = results.get("emailrep", {}).get("data", {}) or results.get("emailrep", {})
        if isinstance(emailrep, dict):
            for ref in emailrep.get("references", []):
                if isinstance(ref, str) and "@" in ref:
                    entities["emails"].add(ref.lower())
        dehashed = results.get("dehashed", {}).get("data", {}) or results.get("dehashed", {})
        if isinstance(dehashed, dict):
            for entry in dehashed.get("results", []):
                if entry.get("email"):
                    entities["emails"].add(entry["email"].lower())
                if entry.get("domain"):
                    entities["domains"].add(entry["domain"].lower())
        return {k: list(v) if isinstance(v, set) else v for k, v in entities.items()}

    @staticmethod
    def extract_entities_from_domain_results(results: dict) -> dict:
        entities = {"ips": set(), "subdomains": set(), "nameservers": set(), "technologies": set(), "asns": set(), "email_servers": set()}
        dns = results.get("dns", {}).get("data", {}) or results.get("dns", {})
        if isinstance(dns, dict):
            for ip in dns.get("A", []):
                if re.match(r'^\d+\.\d+\.\d+\.\d+$', ip):
                    entities["ips"].add(ip)
            for mx in dns.get("MX", []):
                entities["email_servers"].add(mx)
            for ns in dns.get("NS", []):
                entities["nameservers"].add(ns)
        st = results.get("securitytrails", {}).get("data", {}) or results.get("securitytrails", {})
        if isinstance(st, dict):
            for sub in st.get("subdomains", []):
                entities["subdomains"].add(sub)
            for record in st.get("dns_history", []):
                if record.get("ip") and re.match(r'^\d+\.\d+\.\d+\.\d+$', record["ip"]):
                    entities["ips"].add(record["ip"])
        bw = results.get("builtwith", {}).get("data", {}) or results.get("builtwith", {})
        if isinstance(bw, dict):
            for tech in bw.get("technologies", []):
                entities["technologies"].add(tech.get("technology", ""))
        vt = results.get("virustotal", {}).get("data", {}) or results.get("virustotal", {})
        if isinstance(vt, dict):
            for res in vt.get("resolutions", []):
                if res.get("hostname"):
                    entities["subdomains"].add(res["hostname"])
        return {k: list(v) if isinstance(v, set) else v for k, v in entities.items() if v}

    @staticmethod
    def generate_leads(entities: dict) -> list[dict]:
        leads = []
        seen = set()
        for domain in entities.get("domains", []):
            if domain not in seen:
                seen.add(domain)
                leads.append({"type": "domain", "value": domain, "reason": "Discovered from breach data", "priority": "high" if ".com" in domain else "medium"})
        for email in entities.get("emails", []):
            if email not in seen:
                seen.add(email)
                leads.append({"type": "email", "value": email, "reason": "Discovered from dehashed/correlation", "priority": "high"})
        for ip in entities.get("ips", []):
            if ip not in seen:
                seen.add(ip)
                leads.append({"type": "ip", "value": ip, "reason": "Resolved from DNS/history", "priority": "medium"})
        return leads

    @staticmethod
    def deduplicate_results(results: list[dict], key_field: str = "label") -> list[dict]:
        seen = set()
        unique = []
        for item in results:
            key = item.get(key_field, str(item))
            if key not in seen:
                seen.add(key)
                unique.append(item)
        return unique
