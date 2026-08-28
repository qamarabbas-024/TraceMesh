"""Telegram channel and group OSINT monitor."""
from config import settings


class TelegramOSINT:
    """Telegram OSINT scraper and message scanner"""

    @staticmethod
    async def scan_channel(channel_username: str, limit: int = 20) -> dict:
        """Scan public Telegram channel messages (using client or web preview)"""
        import httpx
        clean_channel = channel_username.replace("@", "").replace("https://t.me/", "")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"https://t.me/s/{clean_channel}")
            if resp.status_code == 200:
                html = resp.text
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                messages = []
                for msg in soup.find_all("div", class_="tgme_widget_message_text")[:limit]:
                    text = msg.get_text(separator=" ", strip=True)
                    messages.append(text)
                title = soup.find("div", class_="tgme_channel_info_title")
                channel_title = title.get_text(strip=True) if title else clean_channel
                return {
                    "channel": clean_channel,
                    "title": channel_title,
                    "post_count": len(messages),
                    "recent_posts": messages
                }
            return {"channel": clean_channel, "error": f"Telegram preview returned HTTP {resp.status_code}"}
