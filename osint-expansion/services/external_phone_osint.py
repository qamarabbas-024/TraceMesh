"""Phone OSINT - Numverify, Twilio Lookup"""
import httpx
from config import settings


class PhoneOSINT:
    """Extended phone intelligence - carrier, line type, validation"""

    @staticmethod
    async def numverify(number: str) -> dict:
        """Numverify - phone validation + carrier details"""
        if not settings.numverify_api_key:
            return {"error": "No Numverify API key"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.apilayer.com/number_verification/validate",
                params={"number": number},
                headers={"apikey": settings.numverify_api_key}
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "number": number,
                    "valid": data.get("valid", False),
                    "international_format": data.get("international_format"),
                    "local_format": data.get("local_format"),
                    "country": data.get("country_name"),
                    "country_code": data.get("country_code"),
                    "carrier": data.get("carrier"),
                    "line_type": data.get("line_type"),
                    "location": data.get("location"),
                }
            return {"error": f"Numverify HTTP {resp.status_code}"}

    @staticmethod
    async def twilio_lookup(number: str) -> dict:
        """Twilio Lookup - carrier, line type, caller name"""
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            return {"error": "No Twilio credentials"}
        auth = httpx.BasicAuth(settings.twilio_account_sid, settings.twilio_auth_token)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://lookups.twilio.com/v1/PhoneNumbers/{number}",
                params={"Type": ["carrier", "caller-name"]},
                auth=auth
            )
            if resp.status_code == 200:
                data = resp.json()
                carrier = data.get("carrier", {})
                caller_name = data.get("caller_name", {})
                return {
                    "number": number,
                    "country_code": data.get("country_code"),
                    "national_format": data.get("national_format"),
                    "carrier": {
                        "type": carrier.get("type"),
                        "name": carrier.get("name"),
                        "mobile_country_code": carrier.get("mobile_country_code"),
                        "mobile_network_code": carrier.get("mobile_network_code"),
                    },
                    "caller_name": caller_name.get("caller_name"),
                    "caller_type": caller_name.get("caller_type"),
                }
            return {"error": f"Twilio HTTP {resp.status_code}"}
