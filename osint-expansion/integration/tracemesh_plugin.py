"""TraceMesh Python Integration Plugin SDK."""
import httpx


class TraceMeshPlugin:
    """Python Client SDK for communicating with TraceMesh OSINT Expansion API."""

    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url

    async def email_recon(self, email: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{self.base_url}/api/v2/email/recon", json={"email": email})
            return r.json()

    async def domain_recon(self, domain: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{self.base_url}/api/v2/domain/recon", json={"domain": domain})
            return r.json()

    async def ip_recon(self, ip: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{self.base_url}/api/v2/ip/recon", json={"ip": ip})
            return r.json()
