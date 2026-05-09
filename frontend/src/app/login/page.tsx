"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { InvalidCredentialsError, login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        setError("Invalid username or password");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-[var(--stroke)] bg-white/90 p-8 shadow-[var(--shadow)] backdrop-blur"
        aria-label="Sign in"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Kanban Studio
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Sign in
        </h1>

        <label className="mt-8 block text-sm font-medium text-[var(--navy-dark)]">
          Username
          <input
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
        </label>

        <label className="mt-5 block text-sm font-medium text-[var(--navy-dark)]">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-7 w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
