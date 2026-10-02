"use client";

import Link from "next/link";
import { Key, LogOut } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-mono text-sm font-bold text-emerald-400">
            FC
          </span>
          <span className="font-semibold text-slate-100">Foundry Cloud</span>
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/settings/keys"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <Key size={14} /> Settings
          </Link>
          <button className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>
    </header>
  );
}