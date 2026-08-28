"""TraceMesh OSINT Expansion API v2.0 - Full Production Build"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, PlainTextResponse
from pydantic import BaseModel, EmailStr
import os, json

from services import (
    EmailOSINT, DomainOSINT, IPOSINT, ThreatOSINT,
    CryptoOSINT, SocialOSINT, PhoneOSINT, SelfHostedExtendedTools,
    TelegramOSINT, WebhookNotifier, CorrelationEngine, ws_manager,
    cache, rate_limiter, database
)
from services.exporters.stix21 import STIX21Exporter
from services.exporters.misp import MISPExporter
from services.exporters.pdf_dossier import PDFDossierExporter
from exporters.csv_exporter import export_to_csv
from exporters.xlsx_exporter import export_to_xlsx

app = FastAPI(
    title="TraceMesh OSINT Expansion",
    description="Extended OSINT & Threat Reconnaissance API v2.0",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request models ---
class EmailRequest(BaseModel):
    email: EmailStr

class DomainRequest(BaseModel):
    domain: str

class IPRequest(BaseModel):
    ip: str

class URLRequest(BaseModel):
    url: str

class UsernameRequest(BaseModel):
    username: str

class QueryRequest(BaseModel):
    query: str

class PhoneRequest(BaseModel):
    number: str

class AddressRequest(BaseModel):
    address: str

class CompanyRequest(BaseModel):
    company: str
    domain: str = ""

class TelegramRequest(BaseModel):
    channel: str

class ExportRequest(BaseModel):
    target: str
    data: dict


# --- Email endpoints ---
@app.post("/api/v2/email/recon")
async def email_recon(req: EmailRequest):
    cached = cache.get("email_recon", req.email)
    if cached:
        return cached

    res = {
        "email": req.email,
        "hunter": await EmailOSINT.hunter_verify(req.email),
        "emailrep": await EmailOSINT.emailrep(req.email),
        "hibp": await EmailOSINT.hibp(req.email),
        "dehashed": await EmailOSINT.dehashed_search(req.email, "email"),
        "intelx": await EmailOSINT.intelx_search(req.email),
    }
    entities = CorrelationEngine.extract_entities_from_email_results(res)
    res["correlation"] = {
        "entities": entities,
        "leads": CorrelationEngine.generate_leads(entities)
    }
    cache.set("email_recon", req.email, res)
    await ws_manager.broadcast("osint_results", "email_recon_completed", {"target": req.email})
    return res

@app.post("/api/v2/email/hunter")
async def email_hunter(req: EmailRequest):
    return await EmailOSINT.hunter_verify(req.email)

@app.post("/api/v2/email/breaches")
async def email_breaches(req: EmailRequest):
    return {
        "hibp": await EmailOSINT.hibp(req.email),
        "dehashed": await EmailOSINT.dehashed_search(req.email, "email"),
        "intelx": await EmailOSINT.intelx_search(req.email),
    }


# --- Domain endpoints ---
@app.post("/api/v2/domain/recon")
async def domain_recon(req: DomainRequest):
    cached = cache.get("domain_recon", req.domain)
    if cached:
        return cached

    res = {
        "domain": req.domain,
        "securitytrails": await DomainOSINT.securitytrails_dns_history(req.domain),
        "urlscan": await DomainOSINT.urlscan(req.domain),
        "builtwith": await DomainOSINT.builtwith(req.domain),
        "virustotal": await DomainOSINT.virustotal_domain(req.domain),
        "urlhaus": await ThreatOSINT.urlhaus_domain(req.domain),
        "openphish": await ThreatOSINT.openphish_domain(req.domain),
    }
    entities = CorrelationEngine.extract_entities_from_domain_results(res)
    res["correlation"] = {
        "entities": entities,
        "leads": CorrelationEngine.generate_leads(entities)
    }
    cache.set("domain_recon", req.domain, res)
    await ws_manager.broadcast("osint_results", "domain_recon_completed", {"target": req.domain})
    return res

@app.post("/api/v2/domain/tech-stack")
async def domain_tech_stack(req: DomainRequest):
    return {
        "builtwith": await DomainOSINT.builtwith(req.domain),
        "wappalyzer": await DomainOSINT.wappalyzer_api(req.domain),
    }

@app.post("/api/v2/domain/scan")
async def domain_scan(req: DomainRequest):
    return await DomainOSINT.urlscan_submit_and_wait(req.domain)


# --- IP endpoints ---
@app.post("/api/v2/ip/recon")
async def ip_recon(req: IPRequest):
    cached = cache.get("ip_recon", req.ip)
    if cached:
        return cached

    res = {
        "ip": req.ip,
        "virustotal": await IPOSINT.virustotal_ip(req.ip),
        "greynoise": await IPOSINT.greynoise(req.ip),
        "censys": await IPOSINT.censys_ip(req.ip),
        "shodan": await IPOSINT.shodan_ip(req.ip),
    }
    cache.set("ip_recon", req.ip, res)
    await ws_manager.broadcast("osint_results", "ip_recon_completed", {"target": req.ip})
    return res


# --- Threat endpoints ---
@app.post("/api/v2/threat/url")
async def threat_url(req: URLRequest):
    return {
        "url": req.url,
        "phishtank": await ThreatOSINT.phishtank_url(req.url),
        "urlhaus": await ThreatOSINT.urlhaus_domain(req.url),
    }

@app.post("/api/v2/threat/domain")
async def threat_domain(req: DomainRequest):
    return {
        "domain": req.domain,
        "urlhaus": await ThreatOSINT.urlhaus_domain(req.domain),
        "openphish": await ThreatOSINT.openphish_domain(req.domain),
        "phishtank": await ThreatOSINT.phishtank_url(f"https://{req.domain}"),
    }


# --- Crypto endpoints ---
@app.post("/api/v2/crypto/btc")
async def crypto_btc(req: AddressRequest):
    return await CryptoOSINT.blockchain_btc(req.address)

@app.post("/api/v2/crypto/eth")
async def crypto_eth(req: AddressRequest):
    return await CryptoOSINT.etherscan(req.address)


# --- Social endpoints ---
@app.post("/api/v2/social/reddit")
async def social_reddit(req: UsernameRequest):
    return await SocialOSINT.reddit_user(req.username)

@app.post("/api/v2/search/google")
async def search_google(req: QueryRequest):
    return await SocialOSINT.google_custom_search(req.query)


# --- Phone endpoints ---
@app.post("/api/v2/phone/validate")
async def phone_validate(req: PhoneRequest):
    return {
        "number": req.number,
        "numverify": await PhoneOSINT.numverify(req.number),
        "twilio": await PhoneOSINT.twilio_lookup(req.number),
    }


# --- Telegram OSINT ---
@app.post("/api/v2/telegram/channel")
async def telegram_channel(req: TelegramRequest):
    return await TelegramOSINT.get_channel_messages(req.channel)


# --- Self-hosted tools ---
@app.post("/api/v2/selfhosted/wappalyzer")
async def selfhosted_wappalyzer(req: DomainRequest):
    return await SelfHostedExtendedTools.wappalyzer_local(req.domain)

@app.post("/api/v2/selfhosted/email2phone")
async def selfhosted_email2phone(req: EmailRequest):
    return await SelfHostedExtendedTools.email2phonenumber(req.email)

@app.post("/api/v2/selfhosted/crosslinked")
async def selfhosted_crosslinked(req: CompanyRequest):
    return await SelfHostedExtendedTools.crosslinked(req.company, req.domain)

@app.post("/api/v2/selfhosted/wayback")
async def selfhosted_wayback(req: DomainRequest):
    return await SelfHostedExtendedTools.waybackpy_urls(req.domain)


# --- Cache & Rate Limit Telemetry ---
@app.get("/api/v2/cache/stats")
async def cache_stats():
    return cache.stats()

@app.post("/api/v2/cache/clear")
async def cache_clear():
    cache.clear()
    return {"status": "Cache purged successfully"}

@app.get("/api/v2/rate-limits")
async def rate_limits():
    return rate_limiter.stats()


# --- Exporters ---
@app.post("/api/v2/export/stix")
async def export_stix(req: ExportRequest):
    return STIX21Exporter.domain_to_stix(req.target, req.data)

@app.post("/api/v2/export/misp")
async def export_misp(req: ExportRequest):
    return MISPExporter.domain_to_misp(req.target, req.data)

@app.post("/api/v2/export/pdf")
async def export_pdf(req: ExportRequest):
    out_path = os.path.join(os.path.dirname(__file__), ".cache", f"{req.target}_dossier.pdf")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pdf_file = PDFDossierExporter.generate(req.target, "domain", req.data, out_path)
    if pdf_file and os.path.exists(pdf_file):
        with open(pdf_file, "rb") as f:
            content = f.read()
        return Response(content=content, media_type="application/pdf", headers={
            "Content-Disposition": f"attachment; filename=tracemesh_{req.target}_dossier.pdf"
        })
    return Response(content=b"%PDF-1.4 Error", media_type="application/pdf")

@app.post("/api/v2/export/csv")
async def export_csv(req: ExportRequest):
    csv_text = export_to_csv(req.data)
    return PlainTextResponse(content=csv_text, media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename=tracemesh_{req.target}.csv"
    })

@app.post("/api/v2/export/xlsx")
async def export_xlsx(req: ExportRequest):
    xlsx_bytes = export_to_xlsx(req.data)
    return Response(content=xlsx_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
        "Content-Disposition": f"attachment; filename=tracemesh_{req.target}.xlsx"
    })


# --- WebSockets ---
@app.websocket("/ws")
@app.websocket("/ws/dashboard")
async def websocket_endpoint(websocket: WebSocket):
    from services.websocket_manager import websocket_handler
    await websocket_handler(websocket)


# --- Dashboard ---
@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    dashboard_path = os.path.join(os.path.dirname(__file__), "static", "dashboard.html")
    if os.path.exists(dashboard_path):
        with open(dashboard_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>TraceMesh Dashboard</h1>"


@app.get("/")
async def root():
    return {
        "service": "TraceMesh OSINT Expansion API",
        "version": "2.0.0",
        "status": "online",
        "endpoints": [
            "POST /api/v2/email/recon",
            "POST /api/v2/email/hunter",
            "POST /api/v2/email/breaches",
            "POST /api/v2/domain/recon",
            "POST /api/v2/domain/tech-stack",
            "POST /api/v2/domain/scan",
            "POST /api/v2/ip/recon",
            "POST /api/v2/threat/url",
            "POST /api/v2/threat/domain",
            "POST /api/v2/crypto/btc",
            "POST /api/v2/crypto/eth",
            "POST /api/v2/social/reddit",
            "POST /api/v2/search/google",
            "POST /api/v2/phone/validate",
            "POST /api/v2/telegram/channel",
            "POST /api/v2/selfhosted/wappalyzer",
            "POST /api/v2/selfhosted/email2phone",
            "POST /api/v2/selfhosted/crosslinked",
            "POST /api/v2/selfhosted/wayback",
            "GET  /api/v2/cache/stats",
            "POST /api/v2/cache/clear",
            "GET  /api/v2/rate-limits",
            "POST /api/v2/export/stix",
            "POST /api/v2/export/misp",
            "POST /api/v2/export/pdf",
            "POST /api/v2/export/csv",
            "POST /api/v2/export/xlsx",
            "GET  /dashboard",
            "WS   /ws"
        ]
    }
