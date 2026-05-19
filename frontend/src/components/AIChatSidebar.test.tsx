import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { BoardSyncContext } from "@/components/BoardSync";

const sampleBoard = {
  columns: [{ id: "col-a", title: "Inbox", cardIds: [] }],
  cards: {},
};

const stubChat = (
  result: { ok: boolean; status?: number; body?: unknown }
) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: result.ok,
    status: result.status ?? (result.ok ? 200 : 502),
    json: async () => result.body ?? {},
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AIChatSidebar", () => {
  it("sends a message and appends the exchange, forwarding prior history", async () => {
    const fetchMock = stubChat({
      ok: true,
      body: { reply: "First reply.", board_update: null },
    });
    render(<AIChatSidebar />);

    const box = screen.getByLabelText("Message the assistant");
    await userEvent.type(box, "Hello there");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByText("Hello there")).toBeInTheDocument();
    expect(await screen.findByText("First reply.")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      message: "Hello there",
      history: [],
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: "Second reply.", board_update: null }),
    });
    await userEvent.type(box, "Again");
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() =>
      expect(
        JSON.parse(String(fetchMock.mock.calls[1][1].body))
      ).toEqual({
        message: "Again",
        history: [
          { role: "user", content: "Hello there" },
          { role: "assistant", content: "First reply." },
        ],
      })
    );
  });

  it("applies a board_update through BoardSync", async () => {
    const apply = vi.fn();
    stubChat({
      ok: true,
      body: { reply: "Renamed it.", board_update: sampleBoard },
    });
    render(
      <BoardSyncContext.Provider value={{ apply }}>
        <AIChatSidebar />
      </BoardSyncContext.Provider>
    );

    await userEvent.type(
      screen.getByLabelText("Message the assistant"),
      "rename col-a to Inbox"
    );
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(apply).toHaveBeenCalledWith(sampleBoard));
  });

  it("shows an inline error and leaves history untouched on failure", async () => {
    stubChat({ ok: false, status: 502 });
    render(<AIChatSidebar />);

    await userEvent.type(
      screen.getByLabelText("Message the assistant"),
      "Break it"
    );
    await userEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable/i);
    // No message bubbles were appended: the empty-state hint is still shown.
    expect(
      screen.getByText(/changes apply to the board directly/i)
    ).toBeInTheDocument();
  });

  it("sends on Enter but inserts a newline on Shift+Enter", async () => {
    const fetchMock = stubChat({
      ok: true,
      body: { reply: "ok", board_update: null },
    });
    render(<AIChatSidebar />);

    const box = screen.getByLabelText("Message the assistant");
    await userEvent.type(box, "line one{Shift>}{Enter}{/Shift}line two");
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.type(box, "{Enter}");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).message).toBe(
      "line one\nline two"
    );
  });
});
