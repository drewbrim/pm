import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.sessions import SessionMiddleware

from app import ai, auth, boards, bootstrap, users
from app.models import AIResponse, BoardData, Message

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap.run()
    yield


app = FastAPI(title="pm-backend", lifespan=lifespan)
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
def api_login(body: LoginBody, request: Request) -> dict[str, str | int]:
    return auth.login(request, body.username, body.password)


@app.post("/api/logout")
def api_logout(request: Request) -> dict[str, bool]:
    auth.logout(request)
    return {"ok": True}


@app.get("/api/me")
def api_me(user_id: int = Depends(auth.current_user_id)) -> dict[str, str]:
    user = users.find_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Stale session")
    return {"username": user["username"]}


@app.get("/api/board")
def api_get_board(user_id: int = Depends(auth.current_user_id)) -> dict:
    data = boards.get_board(user_id)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return data


@app.put("/api/board")
def api_put_board(
    body: BoardData, user_id: int = Depends(auth.current_user_id)
) -> dict:
    boards.save_board(user_id, body)
    return body.model_dump()


@app.post("/api/ai/ping")
async def api_ai_ping(
    user_id: int = Depends(auth.current_user_id),
) -> dict[str, str]:
    try:
        answer = await ai.ask([{"role": "user", "content": "what is 2+2?"}])
    except ai.AIError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service unavailable"
        )
    return {"answer": answer}


class ChatBody(BaseModel):
    message: str
    history: list[Message] = []


AI_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "ai_response",
        "schema": AIResponse.model_json_schema(),
    },
}


def _system_prompt(board: dict | None) -> str:
    return (
        "You are an assistant embedded in a Kanban project management app. "
        "You can answer questions about the board and optionally change it.\n\n"
        f"The current board as JSON:\n{json.dumps(board)}\n\n"
        "You may: rename columns (change a column's title); and create, "
        "edit, move, or delete cards.\n"
        "You must NOT: change any column id, or add/remove columns.\n\n"
        "Respond with JSON matching the required schema. Set board_update "
        "to the COMPLETE updated board (same shape as above) when you change "
        "anything, or null when you change nothing. Every card must be "
        "referenced by exactly one column."
    )


@app.post("/api/ai/chat")
async def api_ai_chat(
    body: ChatBody, user_id: int = Depends(auth.current_user_id)
) -> dict:
    board = boards.get_board(user_id)
    messages = [{"role": "system", "content": _system_prompt(board)}]
    messages += [m.model_dump() for m in body.history]
    messages.append({"role": "user", "content": body.message})

    try:
        raw = await ai.ask(
            messages, response_format=AI_RESPONSE_FORMAT, temperature=0
        )
    except ai.AIError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service unavailable"
        )

    try:
        parsed = json.loads(raw) if raw else None
        result = AIResponse.model_validate(parsed)
    except (json.JSONDecodeError, TypeError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="AI returned an invalid response",
        )

    if result.board_update is not None:
        boards.save_board(user_id, result.board_update)
    return result.model_dump()


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
