import json

from app import db
from app.models import BoardData


def get_board(user_id: int) -> dict | None:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT data FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()
    return json.loads(row["data"]) if row else None


def save_board(user_id: int, data: BoardData) -> None:
    payload = json.dumps(data.model_dump())
    with db.connect() as conn:
        conn.execute(
            """
            INSERT INTO boards (user_id, data, updated_at)
                VALUES (?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                data = excluded.data,
                updated_at = excluded.updated_at
            """,
            (user_id, payload),
        )


def create_default_board(user_id: int, data: BoardData) -> None:
    payload = json.dumps(data.model_dump())
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO boards (user_id, data) VALUES (?, ?)",
            (user_id, payload),
        )
