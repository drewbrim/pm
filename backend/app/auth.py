from fastapi import HTTPException, Request, status

from app import users


def login(request: Request, username: str, password: str) -> dict:
    user = users.find_by_username(username)
    if not user or not users.verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    request.session["user_id"] = user["id"]
    return {"id": user["id"], "username": user["username"]}


def logout(request: Request) -> None:
    request.session.clear()


def current_user_id(request: Request) -> int:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return int(user_id)
