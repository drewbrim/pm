FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend

ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1

WORKDIR /app/backend

COPY backend/pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync

COPY backend/app ./app
COPY backend/tests ./tests

COPY --from=frontend-builder /app/frontend/out ./static

ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
