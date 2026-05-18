import asyncio
import os

import pytest

from app import ai


def login(client):
    return client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )


class FakeCompletions:
    def __init__(self, recorder):
        self.recorder = recorder

    async def create(self, **kwargs):
        self.recorder["create_kwargs"] = kwargs

        class Response:
            choices = [
                type(
                    "Choice", (), {"message": type("Msg", (), {"content": "4"})()}
                )()
            ]

        return Response()


def fake_openai_factory(recorder):
    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            recorder["init_kwargs"] = kwargs
            self.chat = type(
                "Chat", (), {"completions": FakeCompletions(recorder)}
            )()

    return FakeAsyncOpenAI


def test_ping_requires_auth(client):
    response = client.post("/api/ai/ping")
    assert response.status_code == 401


def test_ask_builds_request(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    recorder: dict = {}
    monkeypatch.setattr(ai, "AsyncOpenAI", fake_openai_factory(recorder))

    answer = asyncio.run(ai.ask([{"role": "user", "content": "hi"}]))

    assert answer == "4"
    assert recorder["init_kwargs"]["base_url"] == ai.OPENROUTER_BASE_URL
    assert recorder["init_kwargs"]["api_key"] == "test-key"
    assert recorder["create_kwargs"]["model"] == ai.MODEL
    assert recorder["create_kwargs"]["messages"] == [
        {"role": "user", "content": "hi"}
    ]


def test_ask_missing_key_raises_clean_error(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(ai.AIError):
        asyncio.run(ai.ask([{"role": "user", "content": "hi"}]))


def test_ping_missing_key_returns_502(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    login(client)
    response = client.post("/api/ai/ping")
    assert response.status_code == 502
    assert response.json()["detail"] == "AI service unavailable"


def test_ping_returns_answer(client, monkeypatch):
    async def fake_ask(messages):
        return "the answer is 4"

    monkeypatch.setattr(ai, "ask", fake_ask)
    login(client)
    response = client.post("/api/ai/ping")
    assert response.status_code == 200
    assert response.json() == {"answer": "the answer is 4"}


@pytest.mark.skipif(
    not os.environ.get("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set; live integration test skipped",
)
def test_ping_live(client):
    login(client)
    response = client.post("/api/ai/ping")
    assert response.status_code == 200
    assert "4" in response.json()["answer"]
