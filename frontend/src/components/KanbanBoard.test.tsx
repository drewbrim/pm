import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";
import * as nav from "next/navigation";

const routerMocks = (nav as unknown as { __routerMocks: { replace: ReturnType<typeof vi.fn> } }).__routerMocks;

type FetchMock = ReturnType<typeof vi.fn>;

const stubBoardFetch = (
  options: { onPut?: (body: unknown) => { ok: boolean; status?: number } | Promise<{ ok: boolean; status?: number }> } = {}
): FetchMock => {
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/board" && (!init || init.method === "GET" || !init.method)) {
      return {
        ok: true,
        status: 200,
        json: async () => structuredClone(initialData),
      };
    }
    if (url === "/api/board" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body));
      const result = options.onPut ? await options.onPut(body) : { ok: true };
      if (result.ok) {
        return { ok: true, status: 200, json: async () => body };
      }
      return { ok: false, status: result.status ?? 500, json: async () => ({}) };
    }
    if (url === "/api/logout") {
      return { ok: true, status: 200, json: async () => ({}) };
    }
    throw new Error(`Unexpected fetch ${init?.method ?? "GET"} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const renderBoard = async () => {
  render(<KanbanBoard />);
  // wait for the initial load to resolve
  await screen.findAllByTestId(/column-/i);
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

beforeEach(() => {
  routerMocks.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("KanbanBoard", () => {
  it("fetches the board on mount and renders five columns", async () => {
    const fetchMock = stubBoardFetch();
    await renderBoard();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("logs out and redirects to /login", async () => {
    stubBoardFetch();
    await renderBoard();
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("commits a column rename on blur and PUTs the new title", async () => {
    const fetchMock = stubBoardFetch();
    await renderBoard();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({ method: "PUT" })
    );
    input.blur();
    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([, init]: [string, RequestInit]) => init?.method === "PUT"
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall![1].body as string);
      expect(body.columns[0].title).toBe("Renamed");
    });
  });

  it("adds a card and PUTs the new board", async () => {
    const fetchMock = stubBoardFetch();
    await renderBoard();
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "Persisted card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("Persisted card")).toBeInTheDocument();
    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([, init]: [string, RequestInit]) => init?.method === "PUT"
      );
      const body = JSON.parse(putCall![1].body as string);
      const newCard = Object.values(body.cards).find(
        (c: any) => c.title === "Persisted card"
      );
      expect(newCard).toBeDefined();
    });
  });

  it("deletes a card and PUTs the new board", async () => {
    const fetchMock = stubBoardFetch();
    await renderBoard();
    const column = getFirstColumn();
    const firstCardTitle = initialData.cards[initialData.columns[0].cardIds[0]].title;
    await userEvent.click(within(column).getByRole("button", { name: new RegExp(`delete ${firstCardTitle}`, "i") }));

    await waitFor(() => {
      expect(within(column).queryByText(firstCardTitle)).not.toBeInTheDocument();
      const putCall = fetchMock.mock.calls.find(
        ([, init]: [string, RequestInit]) => init?.method === "PUT"
      );
      expect(putCall).toBeDefined();
    });
  });

  it("shows an error and reverts when the save fails", async () => {
    let putCount = 0;
    stubBoardFetch({
      onPut: () => {
        putCount += 1;
        return { ok: false, status: 500 };
      },
    });

    await renderBoard();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    const originalTitle = (input as HTMLInputElement).value;
    await userEvent.clear(input);
    await userEvent.type(input, "Will fail");
    input.blur();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
    });
    // refetch should restore original title (input is controlled by board.title via useEffect)
    await waitFor(() => {
      const restored = within(column).getByLabelText("Column title") as HTMLInputElement;
      expect(restored.value).toBe(originalTitle);
    });
    expect(putCount).toBeGreaterThan(0);
  });
});
