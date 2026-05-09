import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import * as nav from "next/navigation";

const routerMocks = (nav as unknown as { __routerMocks: { replace: ReturnType<typeof vi.fn> } }).__routerMocks;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  routerMocks.replace.mockClear();
});

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

describe("KanbanBoard", () => {
  it("renders five columns", () => {
    render(<KanbanBoard />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("logs out and redirects to /login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    render(<KanbanBoard />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/logout",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(routerMocks.replace).toHaveBeenCalledWith("/login");
  });

  it("renames a column", async () => {
    render(<KanbanBoard />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });
});
