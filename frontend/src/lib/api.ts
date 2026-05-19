import type { BoardData } from "@/lib/kanban";

export async function getBoard(): Promise<BoardData> {
  const response = await fetch("/api/board", { credentials: "include" });
  if (!response.ok) {
    throw new Error(`GET /api/board returned ${response.status}`);
  }
  return (await response.json()) as BoardData;
}

export async function saveBoard(board: BoardData): Promise<BoardData> {
  const response = await fetch("/api/board", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(board),
  });
  if (!response.ok) {
    throw new Error(`PUT /api/board returned ${response.status}`);
  }
  return (await response.json()) as BoardData;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse = { reply: string; board_update: BoardData | null };

export async function chat(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok) {
    throw new Error(`POST /api/ai/chat returned ${response.status}`);
  }
  return (await response.json()) as ChatResponse;
}
