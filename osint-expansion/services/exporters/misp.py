"""MISP (Malware Information Sharing Platform) Event JSON generator."""
import uuid, time


def generate_misp_event(target: str, data: dict) -> dict:
    """Export investigation findings as a standard MISP Event JSON."""
    event_uuid = str(uuid.uuid4())
    now = time.strftime("%Y-%m-%d", time.gmtime())

    attributes = [
        {
            "uuid": str(uuid.uuid4()),
            "type": "target-external",
            "category": "Targeting data",
            "value": target,
            "to_ids": False,
            "comment": "TraceMesh Primary Target Identifier"
        }
    ]

    return {
        "Event": {
            "uuid": event_uuid,
            "info": f"TraceMesh OSINT Investigation: {target}",
            "date": now,
            "threat_level_id": "2",
            "analysis": "1",
            "distribution": "0",
            "Attribute": attributes
        }
    }
