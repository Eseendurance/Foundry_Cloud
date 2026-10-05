"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Braces,
  Database,
  HardDrive,
  Globe2,
  KeyRound,
  Mail,
  Palette,
  Workflow,
} from "lucide-react";

type HealthResponse = {
  status?: "healthy" | "degraded" | "offline" | "unavailable";
  checkedAt?: string;
};

const modules = [
  {
    title: "App builder",
    description: "Edit project files and preview browser-ready code.",
    href: "/builder",
    icon: Braces,
    availability: "Open workspace",
  },
  {
    title: "Database",
    description: "Inspect data using the PostgreSQL connection you configure.",
    href: "/database",
    icon: Database,
    availability: "Database setup required",
  },
  {
    title: "Email",
    description: "Compose and send messages through your SMTP server.",
    href: "/email",
    icon: Mail,
    availability: "SMTP setup required",
  },
  {
    title: "Workflows",
    description: "Create and run workflow steps for your project.",
    href: "/workflows",
    icon: Workflow,
    availability: "Open workspace",
  },
  {
    title: "Media studio",
    description: "Preview the browser-based avatar and speech tools.",
    href: "/avatar",
    icon: Palette,
    availability: "Open workspace",
  },
  {
    title: "Domains",
    description: "Inspect DNS records; domain purchases are not enabled.",
    href: "/domains",
    icon: Globe2,
    availability: "DNS inspection",
  },
  {
    title: "API keys",
    description: "Create and revoke keys for your signed-in account.",
    href: "/settings/keys",
    icon: KeyRound,
    availability: "Account required",
  },
  {
    title: "File storage",
    description: "Browse files in the storage location configured for this server.",
    href: "/storage",
    icon: HardDrive,
    availability: "Storage setup required",
  },
];

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data: HealthResponse = await response.json();
        setHealth(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealth({ status: "unavailable" });
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecked(true);
      });
    return () => controller.abort();
  }, []);

  const healthLabel = !checked
    ? "Checking services"
    : health?.status === "healthy"
      ? "Services checked"
      : health?.status === "degraded"
        ? "Some services need setup"
        : health?.status === "offline"
          ? "A core service is offline"
          : "Service check unavailable";

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-semibold text-white">
              FC
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-950">
              Foundry Cloud
            </span>
          </Link>
          <Link
            href="/status"
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 transition hover:border-blue-400"
          >
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            {healthLabel}
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-700">
            Your workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            What would you like to work on?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Choose a tool to get started. Services that need a server or
            account connection will show you what to configure.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module, index) => (
            <Link
              key={module.href}
              href={module.href}
              className="group animate-rise flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <module.icon size={20} strokeWidth={1.8} />
                </span>
                <ArrowRight
                  size={16}
                  className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
                />
              </div>
              <h2 className="mt-5 font-semibold text-slate-950">
                {module.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {module.description}
              </p>
              <span className="mt-auto pt-5 font-mono text-[11px] uppercase tracking-wider text-blue-700">
                {module.availability}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium text-slate-950">Need a starting point?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse the project templates available in this build.
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-blue-400 hover:text-blue-800"
          >
            Browse templates <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    </div>
  );
}
