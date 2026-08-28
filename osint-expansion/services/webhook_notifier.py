"""Webhook Notifications - Slack, Discord, Email, Custom webhooks."""
import httpx
import asyncio
from email.mime.text import MIMEText
from config import settings


class WebhookNotifier:

    @staticmethod
    async def send_discord(webhook_url: str, title: str, description: str, fields: list = None, color: int = 3447003) -> dict:
        if not webhook_url:
            return {"error": "No Discord webhook URL configured"}
        embed = {"embeds": [{"title": title[:256], "description": description[:2048], "color": color, "timestamp": asyncio.get_event_loop().time()}]}
        if fields:
            embed["embeds"][0]["fields"] = [{"name": f["name"][:256], "value": f["value"][:1024], "inline": f.get("inline", False)} for f in fields[:25]]
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(webhook_url, json=embed)
            if resp.status_code in (200, 204):
                return {"status": "sent", "service": "discord"}
            return {"error": f"Discord HTTP {resp.status_code}"}

    @staticmethod
    async def send_slack(webhook_url: str, title: str, message: str, fields: list = None) -> dict:
        if not webhook_url:
            return {"error": "No Slack webhook URL configured"}
        blocks = [{"type": "header", "text": {"type": "plain_text", "text": title[:150]}}, {"type": "section", "text": {"type": "mrkdwn", "text": message[:3000]}}]
        if fields:
            for f in fields[:10]:
                blocks.append({"type": "section", "fields": [{"type": "mrkdwn", "text": f"*{f.get('name', '')}:*"}, {"type": "plain_text", "text": str(f.get('value', ''))[:200]}]})
        payload = {"text": f"*{title}*", "blocks": blocks}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(webhook_url, json=payload)
            if resp.status_code in (200, 204):
                return {"status": "sent", "service": "slack"}
            return {"error": f"Slack HTTP {resp.status_code}"}

    @staticmethod
    async def send_email(subject: str, body: str, to_email: str = None) -> dict:
        import smtplib
        if not settings.smtp_host or not settings.smtp_port:
            return {"error": "SMTP not configured"}
        to = to_email or settings.notification_email
        if not to:
            return {"error": "No recipient email configured"}
        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = settings.smtp_user
            msg["To"] = to
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                if settings.smtp_tls:
                    server.starttls()
                if settings.smtp_user and settings.smtp_pass:
                    server.login(settings.smtp_user, settings.smtp_pass)
                server.send_message(msg)
            return {"status": "sent", "service": "email", "to": to}
        except Exception as e:
            return {"error": f"Email failed: {str(e)[:200]}"}

    @staticmethod
    async def send_notification(title: str, message: str, data: dict = None) -> dict:
        results = {}
        tasks = []
        if settings.discord_webhook:
            tasks.append(("discord", WebhookNotifier.send_discord(settings.discord_webhook, title, message, [{"name": k, "value": str(v)[:200]} for k, v in (data or {}).items()])))
        if settings.slack_webhook:
            tasks.append(("slack", WebhookNotifier.send_slack(settings.slack_webhook, title, message, [{"name": k, "value": str(v)[:200]} for k, v in (data or {}).items()])))
        if settings.notification_email:
            tasks.append(("email", WebhookNotifier.send_email(title, message)))
        if not tasks:
            return {"error": "No notification channels configured"}
        for name, coro in tasks:
            results[name] = await coro
        return {"title": title, "channels": results}

    @staticmethod
    async def send_osint_alert(target_type: str, target: str, findings: dict) -> dict:
        import json as j
        title = f"TraceMesh OSINT Alert - {target_type.upper()}: {target}"
        message = f"New {target_type} investigation completed.\nTarget: {target}\nFindings: {j.dumps(findings, indent=2)[:2000]}"
        return await WebhookNotifier.send_notification(title, message, findings)
