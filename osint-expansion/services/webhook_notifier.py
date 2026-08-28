"""Webhook and alert notifier for Discord, Slack, and Email."""
import httpx
from config import settings


class WebhookNotifier:
    """Dispatches alerts to external channels on threat discoveries."""

    @staticmethod
    async def send_discord(title: str, description: str, color: int = 0x06b6d4) -> dict:
        if not settings.discord_webhook:
            return {"status": "skipped", "reason": "No Discord webhook configured"}
        payload = {
            "embeds": [{
                "title": f"🚨 TraceMesh Alert: {title}",
                "description": description,
                "color": color,
                "footer": {"text": "TraceMesh Autonomous OSINT Engine"}
            }]
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(settings.discord_webhook, json=payload)
            return {"status": "success" if resp.status_code in (200, 204) else "error", "code": resp.status_code}

    @staticmethod
    async def send_slack(text: str) -> dict:
        if not settings.slack_webhook:
            return {"status": "skipped", "reason": "No Slack webhook configured"}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(settings.slack_webhook, json={"text": f"*TraceMesh Intel Alert*\n{text}"})
            return {"status": "success" if resp.status_code == 200 else "error", "code": resp.status_code}
