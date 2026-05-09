SESSION_COOKIE = "pm_session"


def test_login_success_sets_cookie(client):
    response = client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    assert response.json() == {"username": "user"}
    assert SESSION_COOKIE in response.cookies


def test_login_bad_credentials_returns_401(client):
    response = client.post(
        "/api/login", json={"username": "user", "password": "wrong"}
    )
    assert response.status_code == 401
    assert SESSION_COOKIE not in response.cookies


def test_me_without_cookie_returns_401(client):
    response = client.get("/api/me")
    assert response.status_code == 401


def test_me_with_cookie_returns_username(client):
    client.post("/api/login", json={"username": "user", "password": "password"})
    response = client.get("/api/me")
    assert response.status_code == 200
    assert response.json() == {"username": "user"}


def test_logout_clears_session(client):
    client.post("/api/login", json={"username": "user", "password": "password"})
    logout = client.post("/api/logout")
    assert logout.status_code == 200
    me = client.get("/api/me")
    assert me.status_code == 401


def test_tampered_cookie_rejected(client):
    client.cookies.set(SESSION_COOKIE, "this-is-not-a-valid-signed-session")
    response = client.get("/api/me")
    assert response.status_code == 401
