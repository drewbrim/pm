import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("/ redirects to /login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("login with bad credentials shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill("user");
  await page.getByLabel(/password/i).fill("nope");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("login with valid credentials reveals the board, then logout returns to /login", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill("user");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
