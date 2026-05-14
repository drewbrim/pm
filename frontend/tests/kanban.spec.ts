import { expect, test } from "@playwright/test";
import { demoBoard, emptyBoard } from "./fixtures";

const seed = async (page: import("@playwright/test").Page, board: object = demoBoard) => {
  await page.context().request.post("/api/login", {
    data: { username: "user", password: "password" },
  });
  await page.context().request.put("/api/board", { data: board });
};

test.beforeEach(async ({ page }) => {
  await seed(page);
});

test("loads the kanban board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card and persists across reload", async ({ page }) => {
  await page.goto("/");
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Persisted card");
  await firstColumn.getByPlaceholder("Details").fill("Survives reload.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Persisted card")).toBeVisible();

  await page.reload();
  await expect(
    page.locator('[data-testid^="column-"]').first().getByText("Persisted card")
  ).toBeVisible();
});

test("renames a column on blur and persists across reload", async ({ page }) => {
  await page.goto("/");
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const titleInput = firstColumn.getByLabel("Column title");
  await titleInput.fill("Inbox");
  await titleInput.blur();

  await expect(titleInput).toHaveValue("Inbox");
  await page.reload();
  await expect(
    page.locator('[data-testid^="column-"]').first().getByLabel("Column title")
  ).toHaveValue("Inbox");
});

test("moves a card between columns and persists across reload", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) throw new Error("drag coords");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();

  await page.reload();
  await expect(
    page.getByTestId("column-col-review").getByTestId("card-card-1")
  ).toBeVisible();
});

test("moves a card into an empty column", async ({ page }) => {
  await seed(page, emptyBoard);
  // The default columns exist but have no cards. Add one card via UI, then drag it.
  await page.goto("/");
  const sourceColumn = page.getByTestId("column-col-backlog");
  await sourceColumn.getByRole("button", { name: /add a card/i }).click();
  await sourceColumn.getByPlaceholder("Card title").fill("Movable");
  await sourceColumn.getByRole("button", { name: /add card/i }).click();
  await expect(sourceColumn.getByText("Movable")).toBeVisible();

  const targetColumn = page.getByTestId("column-col-discovery");
  await expect(targetColumn.getByText(/drop a card here/i)).toBeVisible();

  const card = sourceColumn.getByText("Movable");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) throw new Error("drag coords");

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + columnBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(targetColumn.getByText("Movable")).toBeVisible();
});
