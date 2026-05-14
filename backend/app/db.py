import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


def get_db_path() -> Path:
    return Path(os.environ.get("DB_PATH", "/data/pm.db"))


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    path = get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
