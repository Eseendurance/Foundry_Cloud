"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { LayoutTemplate, Search, ArrowUpRight, Sparkles, Code2, Rocket } from "lucide-react";

const TEMPLATES = [
  {
    id: "saas-starter",
    title: "Full-Stack SaaS Boilerplate",
    description: "Complete Next.js template with Auth, Stripe payments, Prisma ORM, and Tailwind CSS.",
    category: "Full Stack",
    tags: ["Next.js", "TypeScript", "Prisma", "Tailwind"],
  },
  {
    id: "ai-copilot",
    title: "AI Chat & Studio Hub",
    description: "Streaming LLM chat interface featuring system proxies, prompt presets, and keyless execution.",
    category: "AI & ML",
    tags: ["Vercel AI SDK", "React", "Tailwind"],
  },
  {
    id: "api-backend",
    title: "Serverless REST API Engine",
    description: "Lightweight Edge API routes with rate limiting, JWT authentication, and Zod validation.",
    category: "Backend",
    tags: ["Node.js", "TypeScript", "Zod"],
  },
  {
    id: "landing-page",
    title: "High-Converting Product Landing",
    description: "Modern product showcase template with dark/light mode, feature grids, and analytics.",
    category: "Frontend",
    tags: ["Next.js", "Lucide Icons", "Tailwind"],
  },
];

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Full Stack", "AI & ML", "Backend", "Frontend"];

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                          t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "All" || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Application Templates
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Pre-built architectures ready for instant deployment and keyless generation.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 md:self-auto">
            <Sparkles size={14} /> Production Ready
          </span>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {t.category}
                  </span>
                  <Rocket size={16} className="text-slate-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{t.title}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{t.description}</p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-1">
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100">
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-emerald-700">
                  Use Starter <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}