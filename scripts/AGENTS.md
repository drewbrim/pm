# Scripts

Thin wrappers around `docker compose`. POSIX shell only - Windows users run the underlying `docker compose` commands directly.

- `start.sh` - `docker compose up -d --build`
- `stop.sh`  - `docker compose down`

Both `cd` to the repo root before running, so they work from anywhere.
