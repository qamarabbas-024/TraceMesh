"""TraceMesh OSINT Expansion API - unified endpoint for all new services"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from services import (
    EmailOSINT, DomainOSINT, IPOSINT, ThreatOSINT,
    CryptoOSINT, SocialOSINT, PhoneOSINT, SelfHostedExtendedTools
)

app = FastAPI(
    title="TraceMesh OSINT Expansion",
    description="Extended OSINT resolvers - email, domain, IP, threat, crypto, social, phone",
    version="1.0.0"
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


# --- Email endpoints ---
@app.post("/api/v2/email/recon")
async def email_recon(req: EmailRequest):
    """Full email intelligence: Hunter + EmailRep + HIBP + Dehashed + IntelX"""
    return {
        "email": req.email,
        "hunter": await EmailOSINT.hunter_verify(req.email),
        "emailrep": await EmailOSINT.emailrep(req.email),
        "hibp": await EmailOSINT.hibp(req.email),
        "dehashed": await EmailOSINT.dehashed_search(req.email, "email"),
        "intelx": await EmailOSINT.intelx_search(req.email),
    }

@app.post("/api/v2/email/hunter")
async def email_hunter(req: EmailRequest):
    return await EmailOSINT.hunter_verify(req.email)

@app.post("/api/v2/email/breaches")
async def email_breaches(req: EmailRequest):
    """HIBP + Dehashed + IntelX breach search"""
    return {
        "hibp": await EmailOSINT.hibp(req.email),
        "dehashed": await EmailOSINT.dehashed_search(req.email, "email"),
        "intelx": await EmailOSINT.intelx_search(req.email),
    }


# --- Domain endpoints ---
@app.post("/api/v2/domain/recon")
async def domain_recon(req: DomainRequest):
    """Full domain intelligence: SecurityTrails + URLScan + BuiltWith + VT"""
    return {
        "domain": req.domain,
        "securitytrails": await DomainOSINT.securitytrails_dns_history(req.domain),
        "urlscan": await DomainOSINT.urlscan(req.domain),
        "builtwith": await DomainOSINT.builtwith(req.domain),
        "virustotal": await DomainOSINT.virustotal_domain(req.domain),
        "urlhaus": await ThreatOSINT.urlhaus_domain(req.domain),
        "openphish": await ThreatOSINT.openphish_domain(req.domain),
    }

@app.post("/api/v2/domain/tech-stack")
async def domain_tech_stack(req: DomainRequest):
    """Technology detection: BuiltWith + Wappalyzer"""
    return {
        "builtwith": await DomainOSINT.builtwith(req.domain),
        "wappalyzer": await DomainOSINT.wappalyzer_api(req.domain),
    }

@app.post("/api/v2/domain/scan")
async def domain_scan(req: DomainRequest):
    """Submit a fresh URLScan and wait for result"""
    return await DomainOSINT.urlscan_submit_and_wait(req.domain)


# --- IP endpoints ---
@app.post("/api/v2/ip/recon")
async def ip_recon(req: IPRequest):
    """Full IP intelligence: VT + GreyNoise + Censys + Shodan"""
    return {
        "ip": req.ip,
        "virustotal": await IPOSINT.virustotal_ip(req.ip),
        "greynoise": await IPOSINT.greynoise(req.ip),
        "censys": await IPOSINT.censys_ip(req.ip),
        "shodan": await IPOSINT.shodan_ip(req.ip),
    }


# --- Threat endpoints ---
@app.post("/api/v2/threat/url")
async def threat_url(req: URLRequest):
    """URL phishing/malware checks"""
    return {
        "url": req.url,
        "phishtank": await ThreatOSINT.phishtank_url(req.url),
        "urlhaus": await ThreatOSINT.urlhaus_domain(req.url),
    }

@app.post("/api/v2/threat/domain")
async def threat_domain(req: DomainRequest):
    """Domain threat feeds"""
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
    """Numverify + Twilio carrier lookup"""
    return {
        "number": req.number,
        "numverify": await PhoneOSINT.numverify(req.number),
        "twilio": await PhoneOSINT.twilio_lookup(req.number),
    }


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


@app.get("/")
async def root():
    return {
        "service": "TraceMesh OSINT Expansion API",
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
            "POST /api/v2/selfhosted/wappalyzer",
            "POST /api/v2/selfhosted/email2phone",
            "POST /api/v2/selfhosted/crosslinked",
            "POST /api/v2/selfhosted/wayback",
        ]
    }
