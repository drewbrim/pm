from app import boards, db, users
from app.models import EMPTY_BOARD

DEFAULT_USERNAME = "user"
DEFAULT_PASSWORD = "password"

SCHEMA = """
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
"""


def run() -> None:
    with db.connect() as conn:
        conn.executescript(SCHEMA)

    user = users.find_by_username(DEFAULT_USERNAME)
    if user is None:
        user_id = users.create_user(DEFAULT_USERNAME, DEFAULT_PASSWORD)
    else:
        user_id = user["id"]

    if boards.get_board(user_id) is None:
        boards.create_default_board(user_id, EMPTY_BOARD)
