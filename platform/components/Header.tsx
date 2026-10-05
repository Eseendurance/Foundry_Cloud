"use client";

import Link from "next/link";
import { Home, Key } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-mono text-sm font-bold text-white">
            FC
          </span>
          <span className="font-semibold text-slate-950">Foundry Cloud</span>
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/settings/keys"
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-700"
          >
            <Key size={14} /> Settings
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-600 hover:text-blue-700">
            <Home size={14} /> Workspace
          </Link>
        </div>
      </div>
    </header>
  );
}