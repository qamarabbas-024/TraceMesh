"""SQLite Database - Persistent storage for OSINT results, investigations, and audit trails."""
import sqlite3, json, os, time, threading
from typing import Optional, Any

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".db")
DB_PATH = os.path.join(DB_DIR, "tracemesh.db")
_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        os.makedirs(DB_DIR, exist_ok=True)
        _local.conn = sqlite3.connect(DB_PATH)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA busy_timeout=5000")
    return _local.conn


def init():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS investigations (
            id INTEGER PRIMARY KEY AUTOINCREMENT, target TEXT NOT NULL,
            target_type TEXT NOT NULL, results_json TEXT, summary TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            status TEXT DEFAULT 'completed', source TEXT DEFAULT 'api'
        );
        CREATE INDEX IF NOT EXISTS idx_investigations_target ON investigations(target);
        CREATE INDEX IF NOT EXISTS idx_investigations_type ON investigations(target_type);
        CREATE INDEX IF NOT EXISTS idx_investigations_created ON investigations(created_at);
        CREATE TABLE IF NOT EXISTS cached_results (
            cache_key TEXT PRIMARY KEY, service TEXT NOT NULL,
            data_json TEXT NOT NULL, created_at REAL NOT NULL, expires_at REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON cached_results(expires_at);
        CREATE TABLE IF NOT EXISTS api_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT, service TEXT NOT NULL,
            endpoint TEXT, used_at REAL NOT NULL DEFAULT (strftime('%s','now')), blocked INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_usage_service ON api_usage(service);
        CREATE TABLE IF NOT EXISTS monitoring_tasks (
            task_id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target TEXT NOT NULL,
            interval_minutes INTEGER DEFAULT 60, enabled INTEGER DEFAULT 1,
            webhook_enabled INTEGER DEFAULT 1, tags TEXT DEFAULT '[]',
            last_run TEXT, last_result_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, target_type TEXT,
            target TEXT, change_detected TEXT, sent_at TEXT NOT NULL DEFAULT (datetime('now')), channel TEXT
        );
    """)
    conn.commit()


def save_investigation(target: str, target_type: str, results: dict, summary: str = "", source: str = "api") -> int:
    conn = _get_conn()
    conn.execute("INSERT INTO investigations (target, target_type, results_json, summary, source) VALUES (?, ?, ?, ?, ?)", (target, target_type, json.dumps(results, default=str)[:100000], summary[:500], source))
    conn.commit()
    return conn.lastrowid


def get_investigations(target: str = None, target_type: str = None, limit: int = 50, offset: int = 0) -> list[dict]:
    conn = _get_conn()
    query = "SELECT * FROM investigations WHERE 1=1"
    params = []
    if target:
        query += " AND target LIKE ?"
        params.append(f"%{target}%")
    if target_type:
        query += " AND target_type = ?"
        params.append(target_type)
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def get_investigation(investigation_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM investigations WHERE id = ?", (investigation_id,)).fetchone()
    return dict(row) if row else None


def cache_set_db(service: str, cache_key: str, data: Any, ttl: int = 3600):
    conn = _get_conn()
    now = time.time()
    conn.execute("INSERT OR REPLACE INTO cached_results (cache_key, service, data_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?)", (f"{service}:{cache_key}", service, json.dumps(data, default=str), now, now + ttl))
    conn.commit()


def cache_get_db(service: str, cache_key: str) -> Optional[Any]:
    conn = _get_conn()
    row = conn.execute("SELECT data_json FROM cached_results WHERE cache_key = ? AND expires_at > ?", (f"{service}:{cache_key}", time.time())).fetchone()
    if row:
        return json.loads(row["data_json"])
    return None


def log_api_usage(service: str, endpoint: str = None, blocked: bool = False):
    conn = _get_conn()
    conn.execute("INSERT INTO api_usage (service, endpoint, blocked) VALUES (?, ?, ?)", (service, endpoint, 1 if blocked else 0))
    conn.commit()


def get_api_usage_stats(days: int = 30) -> dict:
    conn = _get_conn()
    rows = conn.execute("SELECT service, COUNT(*) as total, SUM(blocked) as blocked_count, COUNT(*) - SUM(blocked) as success_count FROM api_usage WHERE used_at > strftime('%s','now') - ? GROUP BY service ORDER BY total DESC", (days * 86400,)).fetchall()
    return {"period_days": days, "services": [dict(r) for r in rows], "total_requests": sum(r["total"] for r in rows)}


def clean_expired_cache():
    conn = _get_conn()
    conn.execute("DELETE FROM cached_results WHERE expires_at < ?", (time.time(),))
    conn.commit()
    return conn.total_changes


def get_stats() -> dict:
    conn = _get_conn()
    stats = {}
    for table in ["investigations", "cached_results", "api_usage", "monitoring_tasks", "alerts"]:
        row = conn.execute(f"SELECT COUNT(*) as count FROM {table}").fetchone()
        stats[table] = row["count"] if row else 0
    stats["db_path"] = DB_PATH
    stats["db_size_mb"] = round(os.path.getsize(DB_PATH) / 1024 / 1024, 2) if os.path.exists(DB_PATH) else 0
    return stats


init()
