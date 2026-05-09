# Backend

FastAPI app served by uvicorn inside the Docker container. Managed with `uv`.

## Layout

```
backend/
  app/
    __init__.py
    main.py        FastAPI app: /api/health and StaticFiles mount at /
  static/
    index.html     Placeholder; replaced by the Next.js export in Part 3
  tests/
    conftest.py    TestClient fixture
    test_health.py
    test_static.py
  pyproject.toml   Managed by uv (FastAPI, uvicorn; pytest+httpx in dev group)
```

## Run

The app is built and run via the root `Dockerfile` and `docker-compose.yml`. From the repo root:

```
./scripts/start.sh   # docker compose up -d --build
./scripts/stop.sh    # docker compose down
```

The container exposes 8000. SQLite (added in Part 6) will live on the `pm-data` named volume mounted at `/data`.

## Tests

Tests run inside the container so we use the same Python environment as production:

```
docker compose run --rm app pytest
```

## Routing

All API routes live under `/api/*`. The static mount at `/` is added last so it does not shadow API routes. Future SPA catch-all behavior is added in Part 3.
