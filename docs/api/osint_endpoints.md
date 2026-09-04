# OSINT Adapter API Specifications

## Endpoints

### `POST /api/v1/recon/pivot`
Initiates a multi-hop entity pivot across connected OSINT sources.

**Request Payload**:
```json
{
  "entity_type": "domain",
  "value": "example-threat-actor.org",
  "max_depth": 3,
  "redact_pii": true
}
```

### `GET /api/v1/graph/export/stix`
Generates a STIX 2.1 compliant JSON bundle for the current investigative workspace.
