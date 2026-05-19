"use client";

import { useState, type KeyboardEvent } from "react";
import { chat, type ChatMessage } from "@/lib/api";
import { useBoardSync } from "@/components/BoardSync";

type DisplayMessage = ChatMessage & { at: string };

const timestamp = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const AIChatSidebar = () => {
  const sync = useBoardSync();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setLoading(true);
    try {
      const history: ChatMessage[] = messages.map(({ role, content }) => ({
        role,
        content,
      }));
      const result = await chat(text, history);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text, at: timestamp() },
        { role: "assistant", content: result.reply, at: timestamp() },
      ]);
      setInput("");
      if (result.board_update) sync.apply?.(result.board_update);
    } catch {
      setError("The assistant is unavailable. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <aside
      data-testid="ai-chat"
      className="sticky top-0 flex h-screen w-[380px] shrink-0 flex-col border-l border-[var(--stroke)] bg-white/80 backdrop-blur"
    >
      <div className="border-b border-[var(--stroke)] px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
          Assistant
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold text-[var(--navy-dark)]">
          Board AI
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--gray-text)]">
            Ask the assistant to rename a column or create, move, and edit
            cards. Changes apply to the board directly.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-[var(--primary-blue)] text-white"
                    : "border border-[var(--stroke)] bg-[var(--surface)] text-[var(--navy-dark)]"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`mt-2 text-[11px] ${
                    message.role === "user"
                      ? "text-white/70"
                      : "text-[var(--gray-text)]"
                  }`}
                >
                  {message.at}
                </p>
              </div>
            </div>
          ))
        )}
        {loading ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-[var(--gray-text)]"
          >
            Thinking...
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--stroke)] px-6 py-5">
        {error ? (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        <textarea
          aria-label="Message the assistant"
          placeholder="Ask the assistant..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || input.trim().length === 0}
          className="mt-3 w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </aside>
  );
};
