"""SQLite asynchronous persistence layer for OSINT investigations and scans."""
import os, json, aiosqlite, time
from config import settings

DB_DIR = os.path.dirname(os.path.abspath(settings.database_path))


async def init_db():
    """Initialize database schema"""
    os.makedirs(DB_DIR, exist_ok=True)
    async with aiosqlite.connect(settings.database_path) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target TEXT NOT NULL,
                target_type TEXT NOT NULL,
                data_json TEXT NOT NULL,
                risk_score INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def save_scan(target: str, target_type: str, data: dict, risk_score: int = 0) -> int:
    """Save an investigation scan result"""
    await init_db()
    async with aiosqlite.connect(settings.database_path) as db:
        cursor = await db.execute(
            "INSERT INTO scans (target, target_type, data_json, risk_score) VALUES (?, ?, ?, ?)",
            (target, target_type, json.dumps(data), risk_score)
        )
        await db.commit()
        return cursor.lastrowid


async def get_recent_scans(limit: int = 20) -> list[dict]:
    """Retrieve history of recent investigations"""
    await init_db()
    async with aiosqlite.connect(settings.database_path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT id, target, target_type, risk_score, created_at FROM scans ORDER BY id DESC LIMIT ?", (limit,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
