# SQLite WAL Performance & Local Cache Tuning

## Configuration Directives
For high-frequency OSINT lookups without lock contention:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB memory cache
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB memory map
```

## Benefits
- Concurrent read transactions alongside streaming feed writes.
- Instant crash recovery with zero database corruption.
