"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#log", label: "What's live" },
  { href: "#how", label: "How it works" },
  { href: "#waitlist", label: "Early access" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-medium tracking-tight text-ink">
            Groundwork
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/dashboard"
            className="rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-moss-deep"
          >
            Open the workspace
          </Link>
        </nav>

        <button
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink-soft"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/dashboard"
              className="w-fit rounded-full bg-moss px-4 py-2 text-sm font-medium text-paper"
            >
              Open the workspace
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
