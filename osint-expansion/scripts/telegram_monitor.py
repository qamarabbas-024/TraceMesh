"""Telegram threat monitor script."""
import asyncio
from services.telegram_scraper import TelegramOSINT


async def monitor_channels(channels: list[str]):
    print(f"Monitoring {len(channels)} Telegram channels for intelligence...")
    for chan in channels:
        res = await TelegramOSINT.scan_channel(chan)
        print(f"Channel: {chan} -> Posts Found: {res.get('post_count', 0)}")


if __name__ == "__main__":
    asyncio.run(monitor_channels(["durov", "telegram"]))
