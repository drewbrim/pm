import os

from openai import AsyncOpenAI, OpenAIError

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "openai/gpt-oss-120b"


class AIError(Exception):
    """Raised when the AI provider is unreachable or misconfigured."""


async def ask(
    messages: list[dict],
    response_format: dict | None = None,
    temperature: float | None = None,
) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise AIError("OpenRouter API key is not configured")

    client = AsyncOpenAI(
        base_url=OPENROUTER_BASE_URL, api_key=api_key, timeout=30
    )
    kwargs: dict = {"model": MODEL, "messages": messages}
    if response_format is not None:
        kwargs["response_format"] = response_format
    if temperature is not None:
        kwargs["temperature"] = temperature
    try:
        response = await client.chat.completions.create(**kwargs)
    except OpenAIError as exc:
        raise AIError("AI request failed") from exc

    return response.choices[0].message.content
