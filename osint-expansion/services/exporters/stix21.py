"""STIX 2.1 Cyber Threat Intelligence JSON bundle generator."""
import uuid, time


def generate_stix21_bundle(target: str, data: dict) -> dict:
    """Export investigation findings as an OASIS STIX 2.1 JSON Bundle."""
    bundle_id = f"bundle--{uuid.uuid4()}"
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    objects = [
        {
            "type": "identity",
            "spec_version": "2.1",
            "id": f"identity--{uuid.uuid4()}",
            "created": now,
            "modified": now,
            "name": "TraceMesh OSINT Expansion Engine",
            "identity_class": "system"
        },
        {
            "type": "observed-data",
            "spec_version": "2.1",
            "id": f"observed-data--{uuid.uuid4()}",
            "created": now,
            "modified": now,
            "first_observed": now,
            "last_observed": now,
            "number_observed": 1,
            "objects": {
                "0": {
                    "type": "domain-name" if "." in target and "@" not in target else "user-account",
                    "value": target
                }
            }
        }
    ]

    return {
        "type": "bundle",
        "id": bundle_id,
        "spec_version": "2.1",
        "objects": objects
    }
