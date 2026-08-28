"""TraceMesh CLI Tool - Command-line interface for OSINT investigations."""
import asyncio, json, sys, os, argparse
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def print_header():
    print("""
╔══════════════════════════════════════════════╗
║        TRACEMESH OSINT CLI v2.0              ║
║     Unified Intelligence Terminal            ║
╚══════════════════════════════════════════════╝
    """)


def print_result(label: str, data, indent: int = 2):
    prefix = "  " * indent
    if isinstance(data, dict):
        print(f"{prefix}{label}:")
        if "error" in data:
            print(f"{prefix}  [ERROR] {data['error']}")
        else:
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    print(f"{prefix}  {k}: {json.dumps(v, indent=2, default=str)[:500]}")
                else:
                    print(f"{prefix}  {k}: {v}")
    elif isinstance(data, list):
        print(f"{prefix}{label}: [{len(data)} items]")
        for item in data[:10]:
            print(f"{prefix}  - {json.dumps(item, default=str)[:200]}")
    else:
        print(f"{prefix}{label}: {data}")
    print()


async def cmd_email(args):
    from services.external_email_osint import EmailOSINT
    return {"emailrep": await EmailOSINT.emailrep(args.email), "hibp": await EmailOSINT.hibp(args.email), "hunter": await EmailOSINT.hunter_verify(args.email)}


async def cmd_domain(args):
    from services.external_domain_osint import DomainOSINT
    from services.external_threat_osint import ThreatOSINT
    return {"virustotal": await DomainOSINT.virustotal_domain(args.domain), "builtwith": await DomainOSINT.builtwith(args.domain), "urlhaus": await ThreatOSINT.urlhaus_domain(args.domain)}


async def cmd_ip(args):
    from services.external_ip_osint import IPOSINT
    return {"virustotal": await IPOSINT.virustotal_ip(args.ip), "greynoise": await IPOSINT.greynoise(args.ip), "shodan": await IPOSINT.shodan_ip(args.ip)}


async def cmd_username(args):
    from services.external_social_osint import SocialOSINT
    return {"reddit": await SocialOSINT.reddit_user(args.username)}


async def cmd_phone(args):
    from services.external_phone_osint import PhoneOSINT
    return {"numverify": await PhoneOSINT.numverify(args.number)}


async def cmd_monitor(args):
    from services.background_scheduler import MonitorTask, scheduler
    if args.add:
        task = MonitorTask(task_id=f"{args.add_type}_{args.add_value}_{int(datetime.now().timestamp())}", target_type=args.add_type, target=args.add_value, interval_minutes=args.interval or 60)
        return scheduler.add_task(task)
    elif args.list:
        return {"tasks": scheduler.list_tasks()}
    elif args.remove:
        return scheduler.remove_task(args.remove)
    return {}


async def cmd_history(args):
    from services.database import get_investigations
    return {"investigations": get_investigations(target=args.target, target_type=args.type, limit=args.limit or 20)}


async def cmd_correlate(args):
    from services.correlation import CorrelationEngine
    from services.external_email_osint import EmailOSINT
    from services.external_domain_osint import DomainOSINT
    if args.type == "email":
        results = {"hibp": await EmailOSINT.hibp(args.value), "emailrep": await EmailOSINT.emailrep(args.value)}
        return {"entities": CorrelationEngine.extract_entities_from_email_results(results), "leads": CorrelationEngine.generate_leads(CorrelationEngine.extract_entities_from_email_results(results))}
    else:
        results = {"securitytrails": await DomainOSINT.securitytrails_dns_history(args.value)}
        return {"entities": CorrelationEngine.extract_entities_from_domain_results(results), "leads": CorrelationEngine.generate_leads(CorrelationEngine.extract_entities_from_domain_results(results))}


async def cmd_export(args):
    from services.database import get_investigation
    inv = get_investigation(args.id)
    if not inv:
        return {"error": "Not found"}
    results = json.loads(inv.get("results_json", "{}"))
    target = inv["target"]
    target_type = inv["target_type"]
    if args.format == "stix":
        from services.exporters import STIX21Exporter
        exporter = STIX21Exporter()
        if target_type == "email":
            bundle = exporter.email_to_stix(target, results)
        elif target_type == "domain":
            bundle = exporter.domain_to_stix(target, results)
        else:
            bundle = exporter.ip_to_stix(target, results)
        output = json.dumps(bundle, indent=2, default=str)
    elif args.format == "misp":
        from services.exporters import MISPExporter
        exporter = MISPExporter()
        if target_type == "email":
            event = exporter.email_to_misp(target, results)
        elif target_type == "domain":
            event = exporter.domain_to_misp(target, results)
        else:
            event = exporter.ip_to_misp(target, results)
        output = json.dumps(event, indent=2, default=str)
    else:
        return {"error": "Unknown format"}
    outfile = args.output or f"tracemesh_export_{target}_{args.format}.json"
    with open(outfile, "w") as f:
        f.write(output)
    return {"file": outfile, "size": len(output)}


async def main():
    parser = argparse.ArgumentParser(description="TraceMesh OSINT CLI")
    parser.add_argument("--json", "-j", action="store_true", help="Output raw JSON")
    subparsers = parser.add_subparsers(dest="command", help="Command")

    p_email = subparsers.add_parser("email", help="Email OSINT")
    p_email.add_argument("email")
    p_domain = subparsers.add_parser("domain", help="Domain OSINT")
    p_domain.add_argument("domain")
    p_ip = subparsers.add_parser("ip", help="IP OSINT")
    p_ip.add_argument("ip")
    p_user = subparsers.add_parser("username", help="Username OSINT")
    p_user.add_argument("username")
    p_phone = subparsers.add_parser("phone", help="Phone OSINT")
    p_phone.add_argument("number")
    p_mon = subparsers.add_parser("monitor", help="Background monitoring")
    p_mon.add_argument("--add", action="store_true")
    p_mon.add_argument("--add-type", choices=["email", "domain", "ip", "username"])
    p_mon.add_argument("--add-value")
    p_mon.add_argument("--interval", type=int, default=60)
    p_mon.add_argument("--list", action="store_true")
    p_mon.add_argument("--remove")
    p_hist = subparsers.add_parser("history", help="View investigation history")
    p_hist.add_argument("--target")
    p_hist.add_argument("--type", choices=["email", "domain", "ip"])
    p_hist.add_argument("--limit", type=int, default=20)
    p_corr = subparsers.add_parser("correlate", help="Entity correlation")
    p_corr.add_argument("type", choices=["email", "domain"])
    p_corr.add_argument("value")
    p_exp = subparsers.add_parser("export", help="Export investigation")
    p_exp.add_argument("id", type=int)
    p_exp.add_argument("--format", choices=["stix", "misp"], default="stix")
    p_exp.add_argument("--output", "-o")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return
    if not args.json:
        print_header()
    cmd_map = {"email": cmd_email, "domain": cmd_domain, "ip": cmd_ip, "username": cmd_username, "phone": cmd_phone, "monitor": cmd_monitor, "history": cmd_history, "correlate": cmd_correlate, "export": cmd_export}
    result = await cmd_map[args.command](args)
    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print("\n[✓] Done. Use --json for raw output.")


if __name__ == "__main__":
    asyncio.run(main())
