"""API key configuration - load from .env"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Email
    hunter_api_key: str = ""
    hibp_api_key: str = ""
    dehashed_api_key: str = ""
    dehashed_email: str = ""
    intelx_api_key: str = ""

    # Domain
    securitytrails_api_key: str = ""
    urlscan_api_key: str = ""
    builtwith_api_key: str = ""
    virustotal_api_key: str = ""
    wappalyzer_api_key: str = ""

    # IP / Network
    shodan_api_key: str = ""
    abuseipdb_api_key: str = ""
    greynoise_api_key: str = ""
    censys_api_id: str = ""
    censys_api_secret: str = ""
    ipinfo_api_key: str = ""

    # Threat intel
    phishtank_api_key: str = ""
    misp_url: str = ""
    misp_api_key: str = ""

    # Phone
    numverify_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""

    # Crypto
    etherscan_api_key: str = ""

    # Social / Search
    google_cse_key: str = ""
    google_cse_cx: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
