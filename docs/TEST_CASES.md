# Manual Test Cases

End-to-end manual verification for the Project Management MVP. Automated
coverage (vitest 17, pytest 36, playwright 9) is green; this document covers
the human-in-the-loop checks, especially the live AI path.

## Environment

- App: http://localhost:8000 (Docker)
- Credentials: `user` / `password`
- Start: `./scripts/start.sh` then wait ~10s for `curl localhost:8000/api/health`
- Clean reset (fresh DB, re-seeds user + empty board): `docker compose down -v && ./scripts/start.sh`
- Restart without data loss: `docker compose down && ./scripts/start.sh`

Run TC-01 through TC-21 in order against a clean reset. "Survives reload"
means: perform the action, hard-reload the browser, confirm it is still there.

## Known by-design behavior (not a defect)

The AI uses a single model with no fallback. It is nondeterministic: a
request may occasionally return the inline message "The assistant is
unavailable. Try again." This happens when the model emits output that fails
schema validation (backend returns 422). Resending is expected; conversation
history is preserved. Only treat it as a defect if it fails persistently.

---

## 1. Authentication

| ID | Steps | Expected |
|----|-------|----------|
| TC-01 | Visit `/` in a fresh session | Redirected to `/login` |
| TC-02 | Submit `user` / `wrong` | Inline error, stays on `/login`, no access |
| TC-03 | Submit `user` / `password` | Board loads at `/` |
| TC-04 | Click Log out | Returns to `/login`; revisiting `/` stays gated |
| TC-05 | While logged out, `POST /api/ai/chat` from another tab/curl | 401 Unauthorized |

## 2. Kanban board

| ID | Steps | Expected |
|----|-------|----------|
| TC-06 | Load the board | Five columns render (Backlog through Done) |
| TC-07 | Edit a column title, blur or press Enter; reload | New name persists |
| TC-08 | Edit a column title, press Escape | Reverts to previous name, no save |
| TC-09 | Add a card with title and details; reload | Card persists |
| TC-10 | Delete a card; reload | Card stays gone |
| TC-11 | Drag a card to another column; reload | Card stays in the new column |
| TC-12 | Drag a card into an empty column | Card lands in that column |

## 3. AI chat sidebar

| ID | Prompt | Expected |
|----|--------|----------|
| TC-13 | "What is on my board?" | Describes the board; board unchanged |
| TC-14 | "Rename Backlog to Inbox" | Title updates without reload; survives reload |
| TC-15 | "Add a card 'Ship v1' to Done" | Card appears; survives reload |
| TC-16 | "Move Ship v1 to Backlog" | Card moves live; survives reload |
| TC-17 | "Change the details of Ship v1 to 'release notes drafted'" | Card details updated |
| TC-18 | "Delete the Ship v1 card" | Card removed; survives reload |
| TC-19 | "Create three cards in Discovery and move one to Review" | All changes reflected |
| TC-20 | After TC-14, send "now rename it back" | Uses prior turn correctly (history works) |

## 4. Input, edge cases, durability

| ID | Steps | Expected |
|----|-------|----------|
| TC-21 | Focus the chat input empty or whitespace-only | Send is disabled; nothing sent |
| TC-22 | Type text, press Shift+Enter, then Enter | Shift+Enter adds a newline; Enter sends |
| TC-23 | Trigger a long assistant reply | Reply wraps and scrolls; input stays pinned at the bottom |
| TC-24 | Make any change, then `docker compose down && ./scripts/start.sh`, reopen | Data is still present (SQLite on the named volume) |

## Result log

Record date, build/commit, and any failing TC IDs with notes. Failures in
sections 1-3 on reload indicate a regression. Section 4 confirms polish and
durability.
