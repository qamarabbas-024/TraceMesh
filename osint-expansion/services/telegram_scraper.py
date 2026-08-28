"""Telegram OSINT - Monitor public groups, channels, and users."""
import asyncio
from config import settings

try:
    from telethon import TelegramClient
    from telethon.errors import SessionPasswordNeededError
    HAS_TELETHON = True
except ImportError:
    HAS_TELETHON = False


class TelegramOSINT:

    @staticmethod
    def available() -> bool:
        return HAS_TELETHON

    @staticmethod
    async def search_public_groups(query: str, limit: int = 20) -> dict:
        if not HAS_TELETHON:
            return {"error": "Telethon not installed: pip install telethon"}
        if not settings.telegram_api_id or not settings.telegram_api_hash or not settings.telegram_phone:
            return {"error": "Telegram credentials not configured."}
        try:
            client = TelegramClient('tracemesh_telegram_session', settings.telegram_api_id, settings.telegram_api_hash, timeout=15)
            await client.start(phone=settings.telegram_phone)
            results = []
            async for dialog in client.iter_dialogs():
                if query.lower() in dialog.name.lower():
                    results.append({"id": dialog.id, "name": dialog.name, "title": getattr(dialog.entity, 'title', dialog.name), "username": getattr(dialog.entity, 'username', None), "participants_count": getattr(dialog.entity, 'participants_count', 0), "is_channel": hasattr(dialog.entity, 'megagroup') and not dialog.entity.megagroup, "is_group": hasattr(dialog.entity, 'megagroup') and dialog.entity.megagroup, "about": getattr(dialog.entity, 'about', '')[:200] if hasattr(dialog.entity, 'about') else ''})
                if len(results) >= limit:
                    break
            await client.disconnect()
            return {"query": query, "results": results, "count": len(results)}
        except SessionPasswordNeededError:
            return {"error": "2FA enabled. Set TELEGRAM_PASS in .env"}
        except Exception as e:
            return {"error": f"Telegram error: {str(e)[:200]}"}

    @staticmethod
    async def get_channel_messages(channel_username: str, limit: int = 50) -> dict:
        if not HAS_TELETHON:
            return {"error": "Telethon not installed"}
        if not settings.telegram_api_id or not settings.telegram_api_hash:
            return {"error": "Telegram credentials not configured"}
        try:
            client = TelegramClient('tracemesh_telegram_session', settings.telegram_api_id, settings.telegram_api_hash, timeout=15)
            await client.start(phone=settings.telegram_phone)
            entity = await client.get_entity(channel_username)
            messages = []
            async for msg in client.iter_messages(entity, limit=limit):
                messages.append({"id": msg.id, "date": msg.date.isoformat() if msg.date else None, "sender_id": msg.sender_id, "text": (msg.text or "")[:500], "has_media": bool(msg.media), "media_type": type(msg.media).__name__ if msg.media else None, "forwards": msg.forwards or 0, "replies": msg.replies.replies if msg.replies else 0})
            await client.disconnect()
            return {"channel": channel_username, "entity_name": getattr(entity, 'title', channel_username), "participants": getattr(entity, 'participants_count', 0), "messages": messages, "message_count": len(messages)}
        except Exception as e:
            return {"error": f"Telegram error: {str(e)[:200]}"}

    @staticmethod
    async def search_public_chats_by_username(username: str) -> dict:
        if not HAS_TELETHON:
            return {"error": "Telethon not installed"}
        if not settings.telegram_api_id or not settings.telegram_api_hash:
            return {"error": "Telegram credentials not configured"}
        try:
            client = TelegramClient('tracemesh_telegram_session', settings.telegram_api_id, settings.telegram_api_hash, timeout=15)
            await client.start(phone=settings.telegram_phone)
            try:
                entity = await client.get_entity(f"@{username}")
                result = {"username": username, "found": True, "id": entity.id, "title": getattr(entity, 'title', username), "about": getattr(entity, 'about', '')[:300] if hasattr(entity, 'about') else '', "participants_count": getattr(entity, 'participants_count', 0), "is_channel": hasattr(entity, 'megagroup') and not entity.megagroup, "is_group": hasattr(entity, 'megagroup') and entity.megagroup, "is_bot": getattr(entity, 'bot', False) if hasattr(entity, 'bot') else False, "verified": getattr(entity, 'verified', False) if hasattr(entity, 'verified') else False, "restricted": getattr(entity, 'restricted', False) if hasattr(entity, 'restricted') else False}
            except ValueError:
                result = {"username": username, "found": False, "error": "Username not found or not public"}
            await client.disconnect()
            return result
        except Exception as e:
            return {"error": f"Telegram error: {str(e)[:200]}"}

    @staticmethod
    async def monitor_keywords_in_channels(keywords: list[str], channels: list[str], limit: int = 30) -> dict:
        results = {}
        for channel in channels:
            msgs = await TelegramOSINT.get_channel_messages(channel, limit)
            if "error" in msgs:
                results[channel] = msgs
                continue
            matches = []
            for msg in msgs.get("messages", []):
                text = (msg.get("text") or "").lower()
                matched_keywords = [kw for kw in keywords if kw.lower() in text]
                if matched_keywords:
                    matches.append({**msg, "matched_keywords": matched_keywords})
            results[channel] = {"channel": channel, "total_messages_scanned": len(msgs.get("messages", [])), "matches_found": len(matches), "matches": matches}
        return {"keywords": keywords, "channels_scanned": channels, "channel_count": len(channels), "results": results}
