import json
import os

import pytest

from app import ai


def login(client):
    return client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )


def seed_board():
    return {
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "cardIds": ["c1"]},
            {"id": "col-done", "title": "Done", "cardIds": []},
        ],
        "cards": {
            "c1": {"id": "c1", "title": "Write tests", "details": "part 9"}
        },
    }


def moved_board():
    return {
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "cardIds": []},
            {"id": "col-done", "title": "Done", "cardIds": ["c1"]},
        ],
        "cards": {
            "c1": {"id": "c1", "title": "Write tests", "details": "part 9"}
        },
    }


def fake_ask_returning(payload):
    async def _ask(messages, response_format=None, temperature=None):
        return payload

    return _ask


def test_chat_requires_auth(client):
    response = client.post("/api/ai/chat", json={"message": "hi", "history": []})
    assert response.status_code == 401


def test_chat_no_board_update_leaves_db_untouched(client, monkeypatch):
    login(client)
    client.put("/api/board", json=seed_board())
    monkeypatch.setattr(
        ai,
        "ask",
        fake_ask_returning(json.dumps({"reply": "nice board", "board_update": None})),
    )

    response = client.post(
        "/api/ai/chat", json={"message": "describe the board", "history": []}
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "nice board", "board_update": None}
    assert client.get("/api/board").json() == seed_board()


def test_chat_valid_board_update_persists(client, monkeypatch):
    login(client)
    client.put("/api/board", json=seed_board())
    monkeypatch.setattr(
        ai,
        "ask",
        fake_ask_returning(
            json.dumps({"reply": "moved it", "board_update": moved_board()})
        ),
    )

    response = client.post(
        "/api/ai/chat", json={"message": "move c1 to Done", "history": []}
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "moved it", "board_update": moved_board()}
    assert client.get("/api/board").json() == moved_board()


def test_chat_unknown_card_returns_422_board_untouched(client, monkeypatch):
    login(client)
    client.put("/api/board", json=seed_board())
    bad_board = {
        "columns": [
            {"id": "col-backlog", "title": "Backlog", "cardIds": ["ghost"]},
            {"id": "col-done", "title": "Done", "cardIds": []},
        ],
        "cards": {},
    }
    monkeypatch.setattr(
        ai,
        "ask",
        fake_ask_returning(json.dumps({"reply": "ok", "board_update": bad_board})),
    )

    response = client.post(
        "/api/ai/chat", json={"message": "break it", "history": []}
    )

    assert response.status_code == 422
    assert client.get("/api/board").json() == seed_board()


def test_chat_malformed_output_rejected_no_side_effects(client, monkeypatch):
    login(client)
    client.put("/api/board", json=seed_board())
    monkeypatch.setattr(ai, "ask", fake_ask_returning("not json at all"))

    response = client.post(
        "/api/ai/chat", json={"message": "hi", "history": []}
    )

    assert response.status_code == 422
    assert client.get("/api/board").json() == seed_board()


def test_chat_forwards_history_verbatim(client, monkeypatch):
    login(client)
    client.put("/api/board", json=seed_board())
    recorder: dict = {}

    async def capturing_ask(messages, response_format=None, temperature=None):
        recorder["messages"] = messages
        return json.dumps({"reply": "ok", "board_update": None})

    monkeypatch.setattr(ai, "ask", capturing_ask)

    history = [
        {"role": "user", "content": "first"},
        {"role": "assistant", "content": "second"},
    ]
    response = client.post(
        "/api/ai/chat", json={"message": "third", "history": history}
    )

    assert response.status_code == 200
    sent = recorder["messages"]
    assert sent[0]["role"] == "system"
    assert sent[1:3] == history
    assert sent[3] == {"role": "user", "content": "third"}


@pytest.mark.skipif(
    not os.environ.get("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set; live integration test skipped",
)
def test_chat_live_moves_card(client):
    # The plan forbids a product-side fallback model, and gpt-oss-120b does
    # not deterministically honor the schema, so this asserts the capability
    # ("the AI can move the card") with a small bounded retry rather than
    # demanding success on the first attempt.
    login(client)

    for attempt in range(3):
        client.put("/api/board", json=seed_board())
        response = client.post(
            "/api/ai/chat",
            json={
                "message": "Move the first Backlog card to Done. "
                "Return the complete updated board.",
                "history": [],
            },
        )
        if response.status_code != 200:
            continue
        board = client.get("/api/board").json()
        done = next(c for c in board["columns"] if c["id"] == "col-done")
        backlog = next(c for c in board["columns"] if c["id"] == "col-backlog")
        if "c1" in done["cardIds"] and "c1" not in backlog["cardIds"]:
            return

    pytest.fail("AI did not move the card in 3 attempts")
