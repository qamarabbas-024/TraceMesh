# Docker Container Sandboxing & OPSEC Isolation

## Security Hardening Directives
To ensure investigative actions remain isolated:
- Read-only root filesystem (`read_only: true`)
- Dropped all Linux capabilities with minimal add (`cap_drop: [ALL]`)
- Non-root user execution (`user: "10001:10001"`)
- Ephemeral in-memory tmpfs for scratch operations (`tmpfs: ["/tmp:noexec,nosuid,size=64m"]`)
