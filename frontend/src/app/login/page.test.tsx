import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import * as nav from "next/navigation";

const routerMocks = (nav as unknown as { __routerMocks: { replace: ReturnType<typeof vi.fn> } }).__routerMocks;

beforeEach(() => {
  routerMocks.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fillAndSubmit = async () => {
  await userEvent.type(screen.getByLabelText(/username/i), "user");
  await userEvent.type(screen.getByLabelText(/password/i), "password");
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("LoginPage", () => {
  it("redirects to / on successful login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ username: "user" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);
    await fillAndSubmit();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(routerMocks.replace).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an inline error on 401 and does not redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    );

    render(<LoginPage />);
    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid/i);
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });
});
