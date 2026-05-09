export type Me = { username: string };

export async function fetchMe(): Promise<Me | null> {
  const response = await fetch("/api/me", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Unexpected /api/me status ${response.status}`);
  return (await response.json()) as Me;
}

export async function login(username: string, password: string): Promise<Me> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (response.status === 401) throw new InvalidCredentialsError();
  if (!response.ok) throw new Error(`Unexpected /api/login status ${response.status}`);
  return (await response.json()) as Me;
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid username or password");
    this.name = "InvalidCredentialsError";
  }
}
