import { expect, test } from "@playwright/test";
import { demoBoard } from "./fixtures";

// The live model is nondeterministic with no fallback by design (see Part 9),
// so /api/ai/chat is mocked here for a deterministic UI test. The route
// handler also persists the board via the real PUT /api/board, mirroring what
// the real /api/ai/chat does server-side, so "reload preserves it" is genuine.
const renamedBoard = {
  ...demoBoard,
  columns: demoBoard.columns.map((c) =>
    c.id === "col-backlog" ? { ...c, title: "Inbox" } : c
  ),
};

test.describe("AI chat sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().request.post("/api/login", {
      data: { username: "user", password: "password" },
    });
    await page.context().request.put("/api/board", { data: demoBoard });

    await page.route("**/api/ai/chat", async (route) => {
      await page.request.put("/api/board", { data: renamedBoard });
      await route.fulfill({
        json: {
          reply: "Renamed the Backlog column to Inbox.",
          board_update: renamedBoard,
        },
      });
    });
  });

  test("AI renames a column; board updates without reload and persists", async ({
    page,
  }) => {
    await page.goto("/");
    const firstColumnTitle = page
      .locator('[data-testid^="column-"]')
      .first()
      .getByLabel("Column title");
    await expect(firstColumnTitle).toHaveValue("Backlog");

    await page.getByLabel("Message the assistant").fill("Rename Backlog to Inbox");
    await page.getByRole("button", { name: /^send$/i }).click();

    // Updates without a reload.
    await expect(firstColumnTitle).toHaveValue("Inbox");
    await expect(
      page.getByText("Renamed the Backlog column to Inbox.")
    ).toBeVisible();

    // Persists across reload.
    await page.reload();
    await expect(
      page.locator('[data-testid^="column-"]').first().getByLabel("Column title")
    ).toHaveValue("Inbox");
  });
});
