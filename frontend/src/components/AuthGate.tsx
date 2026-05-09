"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/auth";

type State = "loading" | "authed" | "redirecting";

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      if (me) {
        setState("authed");
      } else {
        setState("redirecting");
        router.replace("/login");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "authed") return <>{children}</>;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center text-sm text-[var(--gray-text)]"
    >
      {state === "loading" ? "Loading..." : "Redirecting to sign in..."}
    </div>
  );
};
