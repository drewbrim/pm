import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/components/AuthGate";
import * as nav from "next/navigation";

const routerMocks = (nav as unknown as { __routerMocks: { replace: ReturnType<typeof vi.fn> } }).__routerMocks;

beforeEach(() => {
  routerMocks.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const stubFetch = (response: Partial<Response>) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.status ? response.status < 400 : true,
      status: 200,
      json: async () => ({}),
      ...response,
    })
  );
};

describe("AuthGate", () => {
  it("renders children when /api/me returns 200", async () => {
    stubFetch({ status: 200, ok: true, json: async () => ({ username: "user" }) });
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    expect(await screen.findByText("protected content")).toBeInTheDocument();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("redirects to /login when /api/me returns 401", async () => {
    stubFetch({ status: 401, ok: false });
    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>
    );
    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });
});
