import os
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.sessions import SessionMiddleware

from app import auth

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")

app = FastAPI(title="pm-backend")
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="pm_session",
    same_site="lax",
    https_only=False,
)


class LoginBody(BaseModel):
    username: str
    password: str


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login")
def api_login(body: LoginBody, request: Request) -> dict[str, str]:
    username = auth.login(request, body.username, body.password)
    return {"username": username}


@app.post("/api/logout")
def api_logout(request: Request) -> dict[str, bool]:
    auth.logout(request)
    return {"ok": True}


@app.get("/api/me")
def api_me(username: str = Depends(auth.current_user)) -> dict[str, str]:
    return {"username": username}


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await self._safe_get(path, scope)
        if response is not None:
            return response
        if path and not path.endswith(".html"):
            response = await self._safe_get(f"{path}.html", scope)
            if response is not None:
                return response
        return await super().get_response("index.html", scope)

    async def _safe_get(self, path, scope):
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return None
            raise
        if response.status_code == 404:
            return None
        return response


app.mount("/", SPAStaticFiles(directory=STATIC_DIR, html=True), name="static")
