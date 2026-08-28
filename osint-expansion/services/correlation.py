"""Entity correlation and risk scoring engine across multi-source OSINT results."""
from typing import Any


def correlate_results(raw_data: dict[str, Any]) -> dict[str, Any]:
    """Analyze raw batch outputs and correlate discovered identities, IPs, breaches, and threats."""
    entities = []
    breaches = []
    threats = []
    related_ips = set()
    related_domains = set()
    related_emails = set()
    total_risk = 0

    # 1. Process Email Intelligence
    email_data = raw_data.get("email") or raw_data.get("hunter") or {}
    if isinstance(email_data, dict) and "score" in email_data:
        score = email_data.get("score", 0)
        if score < 50:
            total_risk += 15

    # 2. Process Breach Intelligence
    hibp = raw_data.get("hibp") or (raw_data.get("email_recon", {})).get("hibp") or {}
    if isinstance(hibp, dict) and hibp.get("breach_count", 0) > 0:
        count = hibp.get("breach_count", 0)
        total_risk += min(40, count * 5)
        for b in hibp.get("breaches", []):
            breaches.append({
                "source": "HIBP",
                "title": b.get("name"),
                "domain": b.get("domain"),
                "date": b.get("date"),
                "classes": b.get("data_classes", [])
            })

    # 3. Process Threat Feeds
    virustotal = raw_data.get("virustotal") or (raw_data.get("domain_recon", {})).get("virustotal") or {}
    if isinstance(virustotal, dict) and virustotal.get("malicious", 0) > 0:
        mal = virustotal.get("malicious", 0)
        total_risk += min(50, mal * 10)
        threats.append({
            "source": "VirusTotal",
            "type": "Malware/Phishing Flag",
            "detection_count": mal
        })

    # 4. Extract Linked Hosts / IPs
    shodan = raw_data.get("shodan") or (raw_data.get("ip_recon", {})).get("shodan") or {}
    if isinstance(shodan, dict) and "ports" in shodan:
        ports = shodan.get("ports", [])
        if ports:
            total_risk += min(20, len(ports) * 2)

    risk_level = "LOW"
    if total_risk >= 70:
        risk_level = "CRITICAL"
    elif total_risk >= 45:
        risk_level = "HIGH"
    elif total_risk >= 20:
        risk_level = "MEDIUM"

    return {
        "calculated_risk_score": min(100, total_risk),
        "threat_level": risk_level,
        "correlated_breach_count": len(breaches),
        "correlated_threat_count": len(threats),
        "breaches": breaches,
        "threats": threats,
        "related_entities": {
            "ips": list(related_ips),
            "domains": list(related_domains),
            "emails": list(related_emails)
        }
    }
