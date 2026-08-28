"""Rate limiter to manage free-tier monthly/daily request limits."""
import time, threading
from typing import Optional

RATE_LIMITS = {
    "hunter": {"limit": 25, "window": 86400 * 30},
    "securitytrails": {"limit": 50, "window": 86400 * 30},
    "shodan": {"limit": 1000, "window": 86400 * 30},
    "virustotal": {"limit": 500, "window": 86400, "rate_per_min": 4},
    "hibp": {"limit": 1000, "window": 86400},
    "urlscan": {"limit": 1000, "window": 86400},
}

_usage_history: dict[str, list[float]] = {}
_lock = threading.Lock()


def check_rate_limit(service: str) -> tuple[bool, str]:
    """Check if service is within budget limits. Returns (allowed, reason)"""
    config = RATE_LIMITS.get(service)
    if not config:
        return True, "No limit configured"

    now = time.time()
    window = config.get("window", 86400)
    limit = config.get("limit", 100)
    rate_per_min = config.get("rate_per_min")

    with _lock:
        timestamps = _usage_history.get(service, [])
        # Filter timestamps within window
        valid_ts = [ts for ts in timestamps if now - ts < window]
        _usage_history[service] = valid_ts

        if len(valid_ts) >= limit:
            return False, f"Rate limit reached: {len(valid_ts)}/{limit} requests in {window}s window"

        if rate_per_min:
            recent_min = [ts for ts in valid_ts if now - ts < 60]
            if len(recent_min) >= rate_per_min:
                return False, f"Per-minute rate limit reached: {len(recent_min)}/{rate_per_min} req/min"

        return True, f"OK ({len(valid_ts)}/{limit} used)"


def record_request(service: str):
    """Record an API request to a service"""
    now = time.time()
    with _lock:
        if service not in _usage_history:
            _usage_history[service] = []
        _usage_history[service].append(now)


def get_usage_stats() -> dict:
    """Get current usage breakdown across all monitored services"""
    now = time.time()
    stats = {}
    with _lock:
        for service, config in RATE_LIMITS.items():
            window = config.get("window", 86400)
            limit = config.get("limit", 100)
            valid_ts = [ts for ts in _usage_history.get(service, []) if now - ts < window]
            stats[service] = {
                "used": len(valid_ts),
                "limit": limit,
                "remaining": max(0, limit - len(valid_ts)),
                "window_seconds": window,
                "reset_in_seconds": int(window - (now - valid_ts[0])) if valid_ts else 0
            }
    return stats
