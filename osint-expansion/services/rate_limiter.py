"""Per-service rate limiter — token bucket algorithm per service."""
import time, threading
from typing import Optional

SERVICE_LIMITS = {
    "hunter":         (25, 2592000),    "hibp":           (1000, 86400),
    "dehashed":       (20, 2592000),    "intelx":         (200, 2592000),
    "securitytrails": (50, 2592000),    "virustotal":     (500, 86400),
    "urlscan":        (50, 86400),      "builtwith":      (50, 2592000),
    "shodan":         (1000, 2592000),  "greynoise":      (10000, 2592000),
    "censys":         (250, 2592000),   "abuseipdb":      (1000, 86400),
    "phishtank":      (100, 86400),     "etherscan":      (432000, 86400),
    "openphish":      (100, 86400),     "urlhaus":        (100, 86400),
    "numverify":      (100, 2592000),   "emailrep":       (1000, 86400),
    "ipinfo":         (50000, 86400),   "google_cse":     (100, 86400),
}

_buckets: dict[str, dict] = {}
_lock = threading.Lock()


def _get_bucket(service: str) -> dict:
    with _lock:
        if service not in _buckets:
            limit, window = SERVICE_LIMITS.get(service, (30, 3600))
            _buckets[service] = {
                "tokens": limit, "max_tokens": limit, "window": window,
                "last_refill": time.time(), "total_used": 0, "total_blocked": 0,
            }
        return _buckets[service]


def _refill(bucket: dict):
    elapsed = time.time() - bucket["last_refill"]
    refill_rate = bucket["max_tokens"] / bucket["window"]
    new_tokens = elapsed * refill_rate
    if new_tokens > 1:
        bucket["tokens"] = min(bucket["max_tokens"], bucket["tokens"] + new_tokens)
        bucket["last_refill"] = time.time()


def check(service: str) -> tuple[bool, Optional[str]]:
    bucket = _get_bucket(service)
    _refill(bucket)
    with _lock:
        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            bucket["total_used"] += 1
            return True, None
        else:
            bucket["total_blocked"] += 1
            wait_time = bucket["window"] / bucket["max_tokens"]
            return False, f"Rate limited '{service}': wait ~{wait_time:.1f}s or reset period"


def consume(service: str) -> Optional[str]:
    allowed, error = check(service)
    return None if allowed else error


def stats() -> dict:
    result = {}
    with _lock:
        for service, bucket in _buckets.items():
            result[service] = {
                "tokens_remaining": round(bucket["tokens"], 1),
                "max_tokens": bucket["max_tokens"],
                "window_seconds": bucket["window"],
                "total_used": bucket["total_used"],
                "total_blocked": bucket["total_blocked"],
                "available_pct": round(bucket["tokens"] / bucket["max_tokens"] * 100, 1),
            }
    return result
