"""Smart caching layer for API responses to conserve free-tier quotas."""
import json, os, time, threading
from typing import Optional, Any

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".cache")

DEFAULT_TTLS = {
    "hunter": 86400 * 7, "hibp": 86400, "emailrep": 86400,
    "dehashed": 86400 * 3, "intelx": 86400, "securitytrails": 86400 * 7,
    "urlscan": 86400 * 7, "builtwith": 86400 * 30, "virustotal": 3600,
    "shodan": 86400, "greynoise": 3600, "censys": 86400,
    "abuseipdb": 3600, "phishtank": 3600, "urlhaus": 3600,
    "etherscan": 300, "google_cse": 86400 * 7, "numverify": 86400 * 30,
    "twilio": 86400 * 30, "ipinfo": 86400, "reddit": 600,
}

_memory_cache: dict[str, dict] = {}
_memory_cache_lock = threading.Lock()


def _get_cache_path(service: str, key: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    safe_key = key.replace("/", "_").replace(":", "_").replace(".", "_")
    return os.path.join(CACHE_DIR, f"{service}__{safe_key}.json")


def _load_file_cache(path: str) -> Optional[dict]:
    try:
        if not os.path.exists(path):
            return None
        with open(path, "r") as f:
            entry = json.load(f)
        if time.time() < entry.get("expires_at", 0):
            return entry
        os.remove(path)
    except Exception:
        pass
    return None


def _save_file_cache(path: str, entry: dict):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(entry, f, indent=2)
    except Exception:
        pass


def get(service: str, cache_key: str) -> Optional[Any]:
    mem_key = f"{service}:{cache_key}"
    with _memory_cache_lock:
        if mem_key in _memory_cache:
            entry = _memory_cache[mem_key]
            if time.time() < entry.get("expires_at", 0):
                return entry.get("data")
            else:
                del _memory_cache[mem_key]
    path = _get_cache_path(service, cache_key)
    entry = _load_file_cache(path)
    if entry:
        with _memory_cache_lock:
            _memory_cache[mem_key] = entry
        return entry.get("data")
    return None


def set(service: str, cache_key: str, data: Any, ttl: Optional[int] = None):
    if ttl is None:
        ttl = DEFAULT_TTLS.get(service, 3600)
    entry = {
        "data": data, "cached_at": time.time(),
        "expires_at": time.time() + ttl,
        "service": service, "key": cache_key
    }
    mem_key = f"{service}:{cache_key}"
    with _memory_cache_lock:
        _memory_cache[mem_key] = entry
        if len(_memory_cache) > 1000:
            oldest = sorted(_memory_cache.keys(), key=lambda k: _memory_cache[k].get("cached_at", 0))[:200]
            for k in oldest:
                del _memory_cache[k]
    path = _get_cache_path(service, cache_key)
    _save_file_cache(path, entry)


def clear(service: Optional[str] = None):
    with _memory_cache_lock:
        if service:
            keys = [k for k in _memory_cache if k.startswith(f"{service}:")]
            for k in keys:
                del _memory_cache[k]
        else:
            _memory_cache.clear()
    if os.path.exists(CACHE_DIR):
        for fname in os.listdir(CACHE_DIR):
            if service and not fname.startswith(f"{service}__"):
                continue
            try:
                os.remove(os.path.join(CACHE_DIR, fname))
            except Exception:
                pass


def stats() -> dict:
    mem_count = len(_memory_cache)
    file_count = 0
    service_counts = {}
    if os.path.exists(CACHE_DIR):
        for fname in os.listdir(CACHE_DIR):
            file_count += 1
            svc = fname.split("__")[0] if "__" in fname else "unknown"
            service_counts[svc] = service_counts.get(svc, 0) + 1
    return {
        "memory_entries": mem_count, "file_entries": file_count,
        "per_service": service_counts, "cache_dir": CACHE_DIR,
    }
