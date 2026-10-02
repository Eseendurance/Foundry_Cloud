"use client";

import { useState, FormEvent } from "react";
import { ArrowRight, Check, AlertCircle } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [what, setWhat] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, what }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again in a moment.");
        return;
      }

      setStatus("success");
      setMessage(data.message);
      setEmail("");
      setWhat("");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-moss/30 bg-moss/5 p-5">
        <Check className="mt-0.5 shrink-0 text-moss" size={20} />
        <div>
          <p className="font-medium text-ink">You&apos;re on the list.</p>
          <p className="mt-1 text-sm text-ink-soft">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          placeholder="you@yourcompany.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-full border border-line bg-paper px-5 py-3.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-moss-deep disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Get early access"}
          {status !== "loading" && <ArrowRight size={16} />}
        </button>
      </div>
      <input
        type="text"
        placeholder="What are you hoping to build? (optional)"
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        className="mt-3 w-full rounded-full border border-line bg-paper px-5 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
      />
      {status === "error" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-rust">
          <AlertCircle size={16} />
          {message}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">
        No spam, no drip campaign. We&apos;ll email you once when your piece
        of the platform is ready to use.
      </p>
    </form>
  );
}
