from fastapi import HTTPException, Request, status

USERNAME = "user"
PASSWORD = "password"


def login(request: Request, username: str, password: str) -> str:
    if username != USERNAME or password != PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    request.session["username"] = username
    return username


def logout(request: Request) -> None:
    request.session.clear()


def current_user(request: Request) -> str:
    username = request.session.get("username")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return username
