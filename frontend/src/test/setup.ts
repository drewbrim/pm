import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/navigation", () => {
  const replace = vi.fn();
  const push = vi.fn();
  return {
    useRouter: () => ({
      replace,
      push,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    __routerMocks: { replace, push },
  };
});
