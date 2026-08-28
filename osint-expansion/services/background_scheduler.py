"""Background recurring scheduler for target monitoring."""
import asyncio, time


class BackgroundScheduler:
    """Runs scheduled recurring checks on target assets."""

    def __init__(self):
        self._running = False
        self._monitored_targets: list[dict] = []

    def add_target(self, target: str, target_type: str, interval_seconds: int = 3600):
        self._monitored_targets.append({
            "target": target,
            "type": target_type,
            "interval": interval_seconds,
            "last_run": 0
        })

    async def start(self):
        self._running = True
        while self._running:
            now = time.time()
            for t in self._monitored_targets:
                if now - t["last_run"] >= t["interval"]:
                    t["last_run"] = now
                    # Perform background probe logic here
            await asyncio.sleep(10)

    def stop(self):
        self._running = False


scheduler = BackgroundScheduler()
