"""CLI interface for running direct TraceMesh expansion queries from terminal."""
import asyncio, sys, json


async def run_cli():
    if len(sys.argv) < 3:
        print("Usage: python -m services.cli_tool <email|domain|ip|btc> <target>")
        return

    mode = sys.argv[1].lower()
    target = sys.argv[2]

    if mode == "email":
        from .external_email_osint import EmailOSINT
        res = await EmailOSINT.emailrep(target)
        print(json.dumps(res, indent=2))
    elif mode == "domain":
        from .external_threat_osint import ThreatOSINT
        res = await ThreatOSINT.urlhaus_domain(target)
        print(json.dumps(res, indent=2))
    elif mode == "btc":
        from .external_crypto_osint import CryptoOSINT
        res = await CryptoOSINT.blockchain_btc(target)
        print(json.dumps(res, indent=2))
    else:
        print(f"Unknown target mode: {mode}")


if __name__ == "__main__":
    asyncio.run(run_cli())
