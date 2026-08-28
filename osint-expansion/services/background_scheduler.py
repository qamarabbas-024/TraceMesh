"""Background Task Scheduler - Periodic OSINT monitoring and alerts."""
import asyncio, json, os, time
from datetime import datetime, timezone
from typing import Optional
from config import settings

SCHEDULE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".schedules.json")


class MonitorTask:
    def __init__(self, task_id: str, target_type: str, target: str, interval_minutes: int = 60, enabled: bool = True, webhook_enabled: bool = True, tags: list[str] = None):
        self.task_id = task_id
        self.target_type = target_type
        self.target = target
        self.interval_minutes = interval_minutes
        self.enabled = enabled
        self.webhook_enabled = webhook_enabled
        self.tags = tags or []
        self.last_run = None
        self.last_result_hash = None

    def to_dict(self) -> dict:
        return {"task_id": self.task_id, "target_type": self.target_type, "target": self.target, "interval_minutes": self.interval_minutes, "enabled": self.enabled, "webhook_enabled": self.webhook_enabled, "tags": self.tags, "last_run": self.last_run, "last_result_hash": self.last_result_hash}

    @classmethod
    def from_dict(cls, data: dict) -> "MonitorTask":
        t = cls(task_id=data["task_id"], target_type=data["target_type"], target=data["target"], interval_minutes=data.get("interval_minutes", 60), enabled=data.get("enabled", True), webhook_enabled=data.get("webhook_enabled", True), tags=data.get("tags", []))
        t.last_run = data.get("last_run")
        t.last_result_hash = data.get("last_result_hash")
        return t


class BackgroundScheduler:
    def __init__(self):
        self.tasks: list[MonitorTask] = []
        self._running = False
        self._load_tasks()

    def _load_tasks(self):
        try:
            if os.path.exists(SCHEDULE_FILE):
                with open(SCHEDULE_FILE, "r") as f:
                    data = json.load(f)
                    self.tasks = [MonitorTask.from_dict(t) for t in data.get("tasks", [])]
        except Exception:
            self.tasks = []

    def _save_tasks(self):
        try:
            with open(SCHEDULE_FILE, "w") as f:
                json.dump({"tasks": [t.to_dict() for t in self.tasks], "updated": datetime.now(timezone.utc).isoformat()}, f, indent=2)
        except Exception:
            pass

    def add_task(self, task: MonitorTask):
        for t in self.tasks:
            if t.task_id == task.task_id:
                return {"error": f"Task {task.task_id} already exists"}
        self.tasks.append(task)
        self._save_tasks()
        return {"status": "added", "task_id": task.task_id, "next_run": f"in {task.interval_minutes} minutes"}

    def remove_task(self, task_id: str):
        self.tasks = [t for t in self.tasks if t.task_id != task_id]
        self._save_tasks()
        return {"status": "removed", "task_id": task_id}

    def list_tasks(self) -> list[dict]:
        return [t.to_dict() for t in self.tasks]

    def get_task(self, task_id: str) -> Optional[dict]:
        for t in self.tasks:
            if t.task_id == task_id:
                return t.to_dict()
        return None

    async def _run_task(self, task: MonitorTask, services: dict) -> dict:
        from services.webhook_notifier import WebhookNotifier
        result = {"task_id": task.task_id, "target": task.target, "timestamp": datetime.now(timezone.utc).isoformat()}
        data = {}
        try:
            if task.target_type == "email":
                r = await services["email"].emailrep(task.target)
                data = r if isinstance(r, dict) else {"raw": str(r)[:1000]}
            elif task.target_type == "domain":
                r = await services["domain"].virustotal_domain(task.target)
                data = r if isinstance(r, dict) else {"raw": str(r)[:1000]}
            elif task.target_type == "ip":
                r = await services["ip"].virustotal_ip(task.target)
                data = r if isinstance(r, dict) else {"raw": str(r)[:1000]}
            elif task.target_type == "username":
                from services.external_social_osint import SocialOSINT
                r = await SocialOSINT.reddit_user(task.target)
                data = r if isinstance(r, dict) else {"raw": str(r)[:1000]}
            else:
                data = {"error": f"Unknown target_type: {task.target_type}"}
            result["data"] = data
            task.last_run = result["timestamp"]
            import hashlib
            current_hash = hashlib.md5(json.dumps(data, default=str).encode()).hexdigest()
            if task.last_result_hash and task.last_result_hash != current_hash and task.webhook_enabled:
                await WebhookNotifier.send_osint_alert(task.target_type, task.target, data)
            task.last_result_hash = current_hash
            result["status"] = "completed"
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)[:200]
        self._save_tasks()
        return result

    async def run_cycle(self, services: dict):
        results = []
        now = time.time()
        for task in self.tasks:
            if not task.enabled:
                continue
            if task.last_run:
                last = datetime.fromisoformat(task.last_run).timestamp()
                if now - last < task.interval_minutes * 60:
                    continue
            r = await self._run_task(task, services)
            results.append(r)
        return results

    async def run_forever(self, services: dict, check_interval: int = 60):
        self._running = True
        while self._running:
            results = await self.run_cycle(services)
            if results:
                print(f"[Scheduler] Ran {len(results)} tasks at {datetime.now(timezone.utc).isoformat()}")
            await asyncio.sleep(check_interval)

    def stop(self):
        self._running = False


scheduler = BackgroundScheduler()
