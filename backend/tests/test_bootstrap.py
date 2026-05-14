from app import bootstrap, db, users


def test_bootstrap_creates_schema_and_seeds_user(client):
    user = users.find_by_username("user")
    assert user is not None
    assert users.verify_password("password", user["password_hash"])


def test_bootstrap_seeds_default_empty_board(client):
    response = client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    board = client.get("/api/board")
    assert board.status_code == 200
    body = board.json()
    assert [c["title"] for c in body["columns"]] == [
        "Backlog",
        "Discovery",
        "In Progress",
        "Review",
        "Done",
    ]
    assert all(c["cardIds"] == [] for c in body["columns"])
    assert body["cards"] == {}


def test_bootstrap_is_idempotent(client):
    bootstrap.run()
    bootstrap.run()
    with db.connect() as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        boards_count = conn.execute("SELECT COUNT(*) FROM boards").fetchone()[0]
    assert count == 1
    assert boards_count == 1
