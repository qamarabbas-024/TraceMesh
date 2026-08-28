"""Complete API key configuration"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ===== EMAIL =====
    hunter_api_key: str = ""
    hibp_api_key: str = ""
    dehashed_api_key: str = ""
    dehashed_email: str = ""
    intelx_api_key: str = ""

    # ===== DOMAIN =====
    securitytrails_api_key: str = ""
    urlscan_api_key: str = ""
    builtwith_api_key: str = ""
    virustotal_api_key: str = ""
    wappalyzer_api_key: str = ""

    # ===== IP / NETWORK =====
    shodan_api_key: str = ""
    abuseipdb_api_key: str = ""
    greynoise_api_key: str = ""
    censys_api_id: str = ""
    censys_api_secret: str = ""
    ipinfo_api_key: str = ""

    # ===== THREAT INTEL =====
    phishtank_api_key: str = ""
    misp_url: str = ""
    misp_api_key: str = ""

    # ===== PHONE =====
    numverify_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""

    # ===== CRYPTO =====
    etherscan_api_key: str = ""

    # ===== SOCIAL / SEARCH =====
    google_cse_key: str = ""
    google_cse_cx: str = ""

    # ===== TELEGRAM =====
    telegram_api_id: str = ""
    telegram_api_hash: str = ""
    telegram_phone: str = ""
    telegram_pass: str = ""

    # ===== NOTIFICATIONS =====
    discord_webhook: str = ""
    slack_webhook: str = ""
    notification_email: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_tls: bool = True

    # ===== DATABASE =====
    database_path: str = ".db/tracemesh.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
