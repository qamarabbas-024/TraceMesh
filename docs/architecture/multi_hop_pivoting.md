# Multi-Hop Recursive Pivoting Topology

## Traversal Strategy
TraceMesh executes breadth-first and depth-first reconnaissance pivoting:

```
[Initial Entity: Domain]
    ├── (Resolves To) ──> [IP Address]
    │                         └── (BGP Autonomous System) ──> [ASN Infrastructure]
    └── (Registered By) ──> [WHOIS Email]
                              └── (Linked Accounts) ──> [Darkweb Breach Entity]
```

## Cycle Detection & Rate Limits
- Visited set memoization via SHA-256 entity hashes.
- Concurrency throttles: 10 queries/sec per intelligence adapter.
