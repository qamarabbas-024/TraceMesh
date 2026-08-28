"""WebSocket Manager - Real-time streaming of OSINT results to frontend."""
import asyncio, json
from datetime import datetime, timezone
from typing import Any


class WebSocketManager:
    def __init__(self):
        self._connections: dict[str, set] = {}
        self._stats = {"total_broadcasts": 0, "total_connections": 0, "active_connections": 0}

    def register(self, channel: str = "osint_results") -> str:
        if channel not in self._connections:
            self._connections[channel] = set()
        self._stats["total_connections"] += 1
        self._stats["active_connections"] = sum(len(c) for c in self._connections.values())
        return channel

    def subscribe(self, channel: str, callback) -> bool:
        if channel not in self._connections:
            return False
        self._connections[channel].add(callback)
        self._stats["active_connections"] = sum(len(c) for c in self._connections.values())
        return True

    def unsubscribe(self, channel: str, callback) -> bool:
        if channel in self._connections and callback in self._connections[channel]:
            self._connections[channel].remove(callback)
            self._stats["active_connections"] = sum(len(c) for c in self._connections.values())
            return True
        return False

    async def broadcast(self, channel: str, event_type: str, data: Any):
        if channel not in self._connections:
            return
        message = json.dumps({"type": event_type, "data": data, "timestamp": datetime.now(timezone.utc).isoformat(), "channel": channel}, default=str)
        dead = set()
        for callback in self._connections[channel]:
            try:
                await callback(message)
            except Exception:
                dead.add(callback)
        for cb in dead:
            self._connections[channel].discard(cb)
        self._stats["total_broadcasts"] += 1

    async def broadcast_investigation_complete(self, target: str, target_type: str, results: dict):
        await self.broadcast("osint_results", "investigation_complete", {"target": target, "target_type": target_type, "summary": {k: list(v.keys()) if isinstance(v, dict) else type(v).__name__ for k, v in results.items()}, "result_count": len(results)})

    async def broadcast_alert(self, title: str, message: str, severity: str = "info"):
        await self.broadcast("alerts", "alert", {"title": title, "message": message, "severity": severity})

    def get_stats(self) -> dict:
        return {**self._stats, "channels": {k: len(v) for k, v in self._connections.items()}}


ws_manager = WebSocketManager()


async def websocket_handler(websocket):
    from fastapi import WebSocket
    await websocket.accept()
    channel = ws_manager.register("osint_results")
    async def send_message(message: str):
        try:
            await websocket.send_text(message)
        except Exception:
            ws_manager.unsubscribe(channel, send_message)
    ws_manager.subscribe(channel, send_message)
    try:
        await websocket.send_text(json.dumps({"type": "connected", "message": "TraceMesh WebSocket connected", "timestamp": datetime.now(timezone.utc).isoformat()}))
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                try:
                    cmd = json.loads(data)
                    if cmd.get("action") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except json.JSONDecodeError:
                    pass
            except asyncio.TimeoutError:
                try:
                    await websocket.send_text(json.dumps({"type": "heartbeat"}))
                except Exception:
                    break
    except Exception:
        pass
    finally:
        ws_manager.unsubscribe(channel, send_message)
        try:
            await websocket.close()
        except Exception:
            pass
