# Database design

Scope: the schema and bootstrap flow that Part 6 will implement. Nothing in this doc has been written to code yet.

## Goals

- Persist one Kanban board per user across container restarts.
- Schema admits multiple users in the future, even though the MVP only logs in as one.
- Stay close to the in-memory `BoardData` shape the frontend already uses, so the API can round-trip JSON without translation.
- Single-file SQLite at `/data/pm.db` (mounted volume, set up in `docker-compose.yml`).

## Tables

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL UNIQUE
                     REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

Notes:
- `boards.user_id` is `UNIQUE` to enforce the MVP "one board per user" rule. Drop the constraint when multi-board lands.
- `boards.data` is JSON, stored as `TEXT`. We validate shape in Python (Pydantic) on read and write, so SQLite doesn't need to enforce it.
- Timestamps are ISO 8601 strings via `datetime('now')`. Readable and round-trips through `datetime.fromisoformat`.
- `ON DELETE CASCADE` on the FK lets us nuke a user cleanly later. Foreign keys must be enabled per connection: `PRAGMA foreign_keys = ON;`.

## `boards.data` shape

Matches `frontend/src/lib/kanban.ts` exactly so the wire format is also the storage format:

```ts
type BoardData = {
  columns: { id: string; title: string; cardIds: string[] }[];
  cards:   Record<string, { id: string; title: string; details: string }>;
};
```

Sample row payload:

```json
{
  "columns": [
    { "id": "col-backlog",  "title": "Backlog",     "cardIds": [] },
    { "id": "col-discovery","title": "Discovery",   "cardIds": [] },
    { "id": "col-progress", "title": "In Progress", "cardIds": [] },
    { "id": "col-review",   "title": "Review",      "cardIds": [] },
    { "id": "col-done",     "title": "Done",        "cardIds": [] }
  ],
  "cards": {}
}
```

Validation invariants we enforce in code:
- Every id in any `column.cardIds` exists as a key in `cards`.
- Every key in `cards` is referenced by exactly one column.
- All ids are non-empty strings.

## Password hashing

`bcrypt` (the `bcrypt` PyPI package directly - passlib 1.7 has a known incompat with bcrypt 4.x). Hardcoded MVP creds are still hashed at seed time, so the runtime auth path is the same one we'd use for real users later.

## Bootstrap flow (Part 6)

On FastAPI startup:
1. Connect to `/data/pm.db` (create file if missing). Set `PRAGMA foreign_keys = ON`.
2. Run the `CREATE TABLE IF NOT EXISTS` statements above.
3. If no row exists with `username = 'user'`, insert one with `password_hash = bcrypt.hash('password')`.
4. If that user has no row in `boards`, insert one with the empty default `BoardData` above.

Idempotent: running twice is a no-op. The same flow works in tests against an in-memory or temp-file SQLite.

## Migrations

No Alembic. For the MVP, schema changes are made by editing the bootstrap script and recreating the volume (`docker compose down -v`). When we need real migrations, switch to Alembic in a follow-up.

## Default board contents

Empty (5 columns, no cards). Reasoning:
- Persistent state shouldn't pre-populate a user's board with demo content they then have to delete.
- The frontend's `initialData` (8 demo cards) becomes a test fixture only — `frontend/AGENTS.md` already calls this out for Part 7.

If you'd rather seed the demo cards on first boot, say so and I'll change point 4 above.

## Things I want to confirm before Part 6

1. **Default board: empty vs. demo cards.** Going with empty unless you say otherwise.
2. **Password hashing: bcrypt.** Adds `passlib[bcrypt]` to backend deps. OK?
3. **`boards.user_id UNIQUE`.** Enforces one-board-per-user at the schema level. OK to relax later.
4. **Library choice**: stdlib `sqlite3` or SQLAlchemy Core? My recommendation is **stdlib `sqlite3`** for the MVP — fewer deps, the schema is two tables, and we never need an ORM. SQLAlchemy can come in if a second table relationship justifies it.
5. **No Alembic for MVP.** OK?
