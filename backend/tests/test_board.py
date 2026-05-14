from app import boards, bootstrap, users
from app.models import BoardData


def login(client):
    return client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )


def sample_board() -> dict:
    return {
        "columns": [
            {"id": "col-a", "title": "A", "cardIds": ["c1", "c2"]},
            {"id": "col-b", "title": "B", "cardIds": []},
        ],
        "cards": {
            "c1": {"id": "c1", "title": "first", "details": "d1"},
            "c2": {"id": "c2", "title": "second", "details": "d2"},
        },
    }


def test_get_board_requires_auth(client):
    response = client.get("/api/board")
    assert response.status_code == 401


def test_put_board_requires_auth(client):
    response = client.put("/api/board", json=sample_board())
    assert response.status_code == 401


def test_put_then_get_round_trip(client):
    login(client)
    payload = sample_board()
    put_response = client.put("/api/board", json=payload)
    assert put_response.status_code == 200
    get_response = client.get("/api/board")
    assert get_response.status_code == 200
    assert get_response.json() == payload


def test_put_rejects_unknown_card_in_column(client):
    login(client)
    payload = sample_board()
    payload["columns"][0]["cardIds"].append("ghost-id")
    response = client.put("/api/board", json=payload)
    assert response.status_code == 422


def test_put_rejects_orphan_card(client):
    login(client)
    payload = sample_board()
    payload["cards"]["c-orphan"] = {"id": "c-orphan", "title": "x", "details": "y"}
    response = client.put("/api/board", json=payload)
    assert response.status_code == 422


def test_put_rejects_duplicate_card_across_columns(client):
    login(client)
    payload = sample_board()
    payload["columns"][1]["cardIds"].append("c1")
    response = client.put("/api/board", json=payload)
    assert response.status_code == 422


def test_put_rejects_card_key_id_mismatch(client):
    login(client)
    payload = sample_board()
    payload["cards"]["c1"]["id"] = "different"
    response = client.put("/api/board", json=payload)
    assert response.status_code == 422


def test_put_rejects_missing_fields(client):
    login(client)
    response = client.put("/api/board", json={"columns": []})
    assert response.status_code == 422


def test_put_rejects_extra_fields(client):
    login(client)
    payload = sample_board()
    payload["unexpected"] = "nope"
    response = client.put("/api/board", json=payload)
    assert response.status_code == 422


def test_user_isolation(client):
    bootstrap.run()
    second_id = users.create_user("other", "secret")

    login(client)
    payload = sample_board()
    client.put("/api/board", json=payload)

    other_board = boards.get_board(second_id)
    assert other_board is None or other_board != payload

    boards.save_board(
        second_id,
        BoardData(
            columns=[{"id": "x", "title": "X", "cardIds": []}],  # type: ignore[list-item]
            cards={},
        ),
    )

    me_board = client.get("/api/board").json()
    assert me_board == payload
