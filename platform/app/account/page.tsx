"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

type Mode = "signup" | "login";

export default function Account() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <Link
        href="/dashboard"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={16} />
        Back to workspace
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl text-ink">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "signup"
            ? "This stores a real row in a real Postgres database — the password is hashed, never stored as text."
            : "Log in to see the projects saved to your account."}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-moss px-5 py-3 text-sm font-medium text-paper hover:bg-moss-deep disabled:opacity-60"
          >
            {loading
              ? "One moment…"
              : mode === "signup"
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rust/30 bg-rust/5 p-3 text-sm text-rust">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
          className="mt-6 text-sm text-ink-soft hover:text-ink"
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
