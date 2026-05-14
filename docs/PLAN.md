# Project Plan

Each part below has a substep checklist, tests, and success criteria. Cross-cutting decisions (auth model, routing, palette, etc.) live in `AGENTS.md`.

Conventions for this doc:
- `[ ]` items are work the agent will check off as it goes.
- "Tests" lists the suites/cases that must exist and pass before the part is done.
- "Success criteria" is the manual verification that proves the part works end-to-end.

---

## Part 1: Plan

Enrich this document and document the existing frontend.

- [x] Write detailed checklists, tests, and success criteria for Parts 2-10
- [x] Create `frontend/AGENTS.md` describing the current demo
- [ ] User approves the plan before Part 2 starts

Success criteria: plan approved; `frontend/AGENTS.md` matches the code.

---

## Part 2: Scaffolding

Goal: FastAPI + Docker running locally, serving placeholder static HTML and one API route.

In scope:
- API namespaced under `/api/*`
- Single `docker compose` flow (no per-OS scripts)
- `uv` as the Python package manager inside the image

Substeps:
- [x] `backend/pyproject.toml` managed by `uv` (FastAPI, uvicorn, pytest, httpx)
- [x] `backend/app/main.py`
  - [x] `GET /api/health` returns `{"status": "ok"}`
  - [x] Static files mounted at `/` from `backend/static/`
  - [x] Placeholder `backend/static/index.html` ("hello world")
- [x] Multi-stage `Dockerfile` at repo root: Python slim final stage, installs `uv`, runs `uv sync`, exposes 8000, `CMD` runs uvicorn
- [x] `docker-compose.yml` at repo root
  - [x] Single `app` service, port `8000:8000`
  - [x] Named volume mounted at `/data` (used by SQLite later, set up now)
  - [x] `env_file: .env`
- [x] `scripts/start.sh` and `scripts/stop.sh` as thin `docker compose up -d` / `down` wrappers
- [x] `.dockerignore`, update `.gitignore`

Tests:
- [x] `backend/tests/test_health.py`: `GET /api/health` returns 200 and `{"status": "ok"}`
- [x] `backend/tests/test_static.py`: `GET /` returns the placeholder HTML
- [x] `pytest` runs cleanly inside the container (`docker compose run --rm app pytest`)

Success criteria:
- [x] `./scripts/start.sh` brings the container up; `curl localhost:8000/api/health` returns `{"status":"ok"}`; `curl localhost:8000/` returns the placeholder HTML
- [x] `./scripts/stop.sh` shuts it down cleanly

---

## Part 3: Add in Frontend

Goal: Replace the placeholder HTML with the statically built NextJS Kanban demo.

Substeps:
- [x] Set `output: "export"` in `frontend/next.config.ts` (with `images.unoptimized` for safety); `next/font/google` worked at build time, no fallback needed
- [x] New `frontend-builder` stage in the Dockerfile: `npm ci && npm run build`; backend stage copies `frontend/out/` into `backend/static/`
- [x] FastAPI SPA catch-all so client-side routes resolve to `index.html` while `/api/*` keeps priority (subclass of `StaticFiles` that falls back to `index.html` on 404 - needed because Next exports a `404.html` that Starlette would otherwise return as a 404 response)
- [x] Verify static asset content types (JS/CSS/fonts) are correct - `text/css; charset=utf-8` confirmed for `/_next/static/chunks/*.css`

Tests:
- [x] Backend integration: `GET /` returns HTML containing Kanban markup ("Kanban Studio")
- [x] Backend integration: `GET /api/health` still 200 (not shadowed by the SPA catch-all)
- [x] Backend integration: an unknown route like `/does-not-exist` serves `index.html`
- [x] `npm run test:unit` (Vitest) green - 6 passed
- [x] `npm run test:e2e` (Playwright) green against the container on port 8000 - 3 passed (Playwright `webServer` runs `docker compose up --build` in the foreground)

Success criteria:
- [x] Visiting `http://localhost:8000/` shows the existing Kanban demo (drag, add, rename, delete) sourced from the static export
- [x] All suites green

---

## Part 4: Fake user sign-in

Goal: Gate the Kanban behind a login screen using hardcoded `user`/`password`; logout works.

Substeps:
- [x] Backend
  - [x] `POST /api/login` validates against constants, sets a signed session cookie (`pm_session`, SameSite=Lax) via Starlette `SessionMiddleware`; 401 on bad creds
  - [x] `POST /api/logout` clears the cookie
  - [x] `GET /api/me` returns the current username or 401
  - [x] Session secret read from `SESSION_SECRET` env var (added to `.env`)
- [x] Frontend
  - [x] `app/login/page.tsx` with form posting to `/api/login`; redirects to `/` on success, shows error on 401
  - [x] `AuthGate` client component in `app/page.tsx` that calls `/api/me` and redirects to `/login` on 401
  - [x] Logout button in the `KanbanBoard` header
- [x] SPA static fallback now also tries `<path>.html` so `/login` resolves to `login.html` from the Next export (before falling back to `index.html`)

Tests (near-full coverage):
- Backend (6 tests)
  - [x] Valid creds → 200 + Set-Cookie; invalid → 401, no cookie
  - [x] `/api/me` 401 without cookie, 200 with cookie
  - [x] Logout clears the cookie; subsequent `/api/me` returns 401
  - [x] Tampered cookie → 401
- Frontend (5 tests across 3 files)
  - [x] Vitest: `AuthGate` redirects on 401, renders children on 200
  - [x] Vitest: login form surfaces error on 401, redirects on 200
  - [x] Vitest: KanbanBoard logout button calls `/api/logout` and redirects
  - [x] Playwright: cold `/` redirects to `/login`; bad creds → inline error; good creds → board visible; logout → back at `/login`
  - [x] Playwright: existing kanban specs updated to log in via `/api/login` in `beforeEach`

Success criteria:
- [x] Cold visit to `/` redirects to `/login`; correct creds load the board; logout returns to login
- [x] All suites green: backend 10/10, vitest 11/11, playwright 6/6

---

## Part 5: Database modeling

Goal: Decide and document the schema; get user sign-off before writing code.

In scope:
- Kanban stored as a JSON blob column in SQLite (one row per board)
- Real `user` row seeded with hardcoded creds; boards FK to `user_id`

Substeps:
- [x] Author `docs/DATABASE.md` covering:
  - Tables (`users`, `boards`); FK with `ON DELETE CASCADE`; `UNIQUE` on `boards.user_id` to enforce one-board-per-user for MVP
  - Why JSON blob: matches the in-memory `BoardData` shape from `frontend/src/lib/kanban.ts`; MVP keeps things simple
  - Migrations: single bootstrap script on startup; no Alembic for MVP
  - Seeding: on first boot, create the `user`/`password` user (bcrypt-hashed) and an empty default board
  - Sample `BoardData` JSON + validation invariants (`cardIds` referential integrity)
  - Open questions for sign-off (default board contents, `passlib[bcrypt]`, `UNIQUE` constraint, stdlib `sqlite3` vs SQLAlchemy, no Alembic)
- [ ] Stop for user approval before Part 6

Tests: docs only.

Success criteria: `docs/DATABASE.md` is approved by the user.

---

## Part 6: Backend Kanban API

Goal: Persistence + CRUD for the Kanban.

Substeps:
- [ ] SQLite file at `/data/pm.db`; bootstrap creates tables + seeds user/board if missing on startup
- [ ] `app/db.py` (connection helper) and `app/models.py` (table definitions); pick one of SQLAlchemy or stdlib `sqlite3` and stick with it
- [ ] Pydantic models mirroring `BoardData` / `Column` / `Card`
- [ ] Endpoints (auth required):
  - [ ] `GET /api/board` → user's `BoardData`
  - [ ] `PUT /api/board` → replaces user's `BoardData`; rejects malformed payloads with 422

Tests (near-full coverage):
- [ ] Bootstrap: schema created, `user` seeded, default board attached
- [ ] `GET /api/board`: 401 unauth, 200 returns seeded board when authed
- [ ] `PUT /api/board`: round-trip write then read returns identical data
- [ ] Validation: missing fields, wrong types, card id referenced in `cardIds` but missing from `cards` map → 422
- [ ] FK isolation: a second test user's board is not visible to the first

Success criteria:
- Backend test suite green
- Manual `curl` round-trip works against a running container
- DB file persists across `docker compose down && up`

---

## Part 7: Wire frontend to backend

Goal: Replace `useState(initialData)` with real API calls; mutations persist.

Substeps:
- [ ] `frontend/src/lib/api.ts` with `getBoard()` and `saveBoard(board)` (fetch with `credentials: "include"`)
- [ ] `KanbanBoard.tsx`:
  - [ ] Fetch board on mount; minimal loading state
  - [ ] `handleRenameColumn`, `handleAddCard`, `handleDeleteCard`, drag-end → optimistic local update, then `saveBoard`; on failure, refetch and show inline error
- [ ] Remove `initialData` from the live render path (keep as a test fixture only)

Tests (near-full coverage):
- Backend: existing suites still green
- Frontend
  - [ ] Vitest: each handler calls `saveBoard` with the expected payload
  - [ ] Vitest: a rejected `saveBoard` triggers a refetch and surfaces an error
  - [ ] Playwright (against the container): add card → reload → still there; rename column → reload → still renamed; drag card across columns → reload → ordering preserved

Success criteria:
- All mutations persist across page reload
- All suites green

---

## Part 8: AI connectivity

Goal: Prove the OpenRouter call path with a trivial prompt.

Substeps:
- [ ] Read `OPENROUTER_API_KEY` from `.env` (already provided)
- [ ] `app/ai.py` with `ask(messages) -> str` using OpenRouter's OpenAI-compatible endpoint and model `openai/gpt-oss-120b`
- [ ] `POST /api/ai/ping` (auth required) sends "what is 2+2?" and returns the raw model answer
- [ ] Surface OpenRouter errors as 502 with a useful (non-leaky) message

Tests:
- [ ] Unit: `ai.py` builds the right request payload (HTTP mocked)
- [ ] Unit: missing API key → clean error, no stack leak
- [ ] Integration (env-gated so CI can skip): `/api/ai/ping` returns a string containing "4"

Success criteria:
- Local: `curl /api/ai/ping` returns a sensible "4" answer
- Tests green

---

## Part 9: AI sees the Kanban + Structured Outputs

Goal: Each AI call gets the current `BoardData` + user message + client-supplied history, and returns Structured Outputs with a chat reply and an optional board update.

In scope:
- Conversation history is client-side; request body carries prior turns
- AI is allowed to rename columns and create/edit/move/delete cards
- No fallback model: if `openai/gpt-oss-120b` doesn't honor the schema, surface the error

Substeps:
- [ ] Define Pydantic + JSON schema for the response:
  ```
  AIResponse {
    reply: str
    board_update: BoardData | null
  }
  ```
- [ ] `POST /api/ai/chat` (auth required)
  - [ ] Body: `{ message: str, history: Message[] }`
  - [ ] Server loads the board, builds a system prompt (rules + current `BoardData` JSON)
  - [ ] OpenRouter call with `response_format={"type": "json_schema", ...}`
  - [ ] If `board_update` non-null, validate against `BoardData` and persist via the Part 6 write path
  - [ ] Response: `{ reply, board_update }`
- [ ] System prompt explicitly enumerates allowed operations and forbids changing column ids

Tests (near-full coverage):
- [ ] Schema validation rejects malformed model output (no persistence side effects)
- [ ] No `board_update` → DB untouched
- [ ] Valid `board_update` → DB reflects the change
- [ ] `board_update` referencing unknown card/column ids → 422, board untouched
- [ ] History is forwarded verbatim to the model
- [ ] Live integration test (env-gated): "move the first Backlog card to Done" actually moves it

Success criteria:
- AI can describe the board in chat and propose changes that round-trip into the DB
- Tests green

---

## Part 10: Sidebar AI chat UI

Goal: Add the chat sidebar; refresh the board when the AI updates it.

Substeps:
- [ ] `frontend/src/components/AIChatSidebar.tsx` mounted beside `<KanbanBoard />`
  - [ ] Local `messages: Message[]` (history is client-side, per Parts 5/9)
  - [ ] Input + send; user/assistant bubbles; loading state during request
  - [ ] On response with `board_update`, lift state into `KanbanBoard` (prop callback or shared context) and replace it directly
  - [ ] Palette: `--primary-blue` accents, `--secondary-purple` send button, `--gray-text` for timestamps
- [ ] Keyboard: Enter sends, Shift+Enter newline
- [ ] Error and empty states styled per palette; no emojis anywhere

Tests (near-full coverage):
- [ ] Vitest: render, send, history append on success
- [ ] Vitest: response with `board_update` calls the board setter with the new data
- [ ] Vitest: error response renders an inline error and leaves history untouched
- [ ] Playwright: log in → open chat → "rename Backlog to Inbox" → board updates without reload → reload preserves it
- [ ] Manual browser check (per CLAUDE.md): golden path and edge cases (empty input, server error, very long reply)

Success criteria:
- End-to-end demo: log in → chat → AI updates board → UI reflects instantly → reload preserves it
- All suites green
