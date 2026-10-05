import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Braces,
  Database,
  Globe2,
  HardDrive,
  KeyRound,
  Mail,
  Palette,
  Workflow,
} from "lucide-react";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";

const tools = [
  {
    title: "App builder",
    description:
      "Edit project files and preview browser-ready HTML, CSS, and JavaScript in the workspace.",
    href: "/builder",
    icon: Braces,
    detail: "Code and preview",
  },
  {
    title: "Database",
    description:
      "Inspect tables and run queries against the PostgreSQL database configured for your deployment.",
    href: "/database",
    icon: Database,
    detail: "PostgreSQL connection required",
  },
  {
    title: "Email",
    description:
      "Send transactional messages through your configured SMTP server and inspect domain records.",
    href: "/email",
    icon: Mail,
    detail: "SMTP connection required",
  },
  {
    title: "Workflows",
    description:
      "Build and execute workflow steps, with results depending on the services you configure.",
    href: "/workflows",
    icon: Workflow,
    detail: "Workspace tools",
  },
  {
    title: "Domains",
    description:
      "Check public DNS records. Domain registration and registrar operations are not enabled.",
    href: "/domains",
    icon: Globe2,
    detail: "DNS inspection",
  },
  {
    title: "Media studio",
    description:
      "Preview the browser-based avatar and speech tools included with the workspace.",
    href: "/avatar",
    icon: Palette,
    detail: "Browser preview",
  },
  {
    title: "API keys",
    description:
      "Issue and revoke keys for your account. The secret is displayed only when it is created.",
    href: "/settings/keys",
    icon: KeyRound,
    detail: "Account required",
  },
  {
    title: "File storage",
    description:
      "Browse files from the storage location configured for your server.",
    href: "/storage",
    icon: HardDrive,
    detail: "Server storage required",
  },
  {
    title: "Templates",
    description:
      "Browse the project starting points available in this deployment.",
    href: "/templates",
    icon: Boxes,
    detail: "Browse templates",
  },
  {
    title: "Service status",
    description:
      "See live checks for the database, configured engine, SMTP server, and storage directory.",
    href: "/status",
    icon: ArrowRight,
    detail: "Live health checks",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-16 sm:pb-20 sm:pt-24 lg:grid-cols-[1fr_0.75fr] lg:items-center">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-soft">
              <span className="h-2 w-2 rounded-full bg-blue-trust" />
              Built for teams who want control of their tools
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Your workbench for building and running software.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Foundry Cloud brings your editor, project data, workflows, and
              operational tools into one self-hostable workspace. Connect only
              the services you choose, and see clearly when a feature needs
              setup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-blue-trust px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open your workspace <ArrowRight size={16} />
              </Link>
              <a
                href="#tools"
                className="rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-blue-400 hover:text-blue-700"
              >
                Explore the tools
              </a>
            </div>
          </div>

          <aside className="animate-rise-delayed rounded-2xl border border-line bg-white p-6 shadow-sm">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-700">
              A clear starting point
            </p>
            <h2 className="mt-4 text-xl font-semibold text-ink">
              Start with one project.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Open a tool, connect the services you need, and keep your code
              and data under your control.
            </p>
            <ul className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-ink-soft">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-trust" />
                Project code and preview
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-trust" />
                Data and service connections
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-trust" />
                Clear setup and health information
              </li>
            </ul>
          </aside>
        </section>

        <section id="tools" className="border-y border-line bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="mb-8 max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-700">
                The workspace
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Choose the tool you need.
              </h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Each card opens its own workspace. Connection-dependent
                features explain their requirements instead of implying a
                service is already configured.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool, index) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group animate-rise rounded-xl border border-line bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <tool.icon size={20} strokeWidth={1.8} />
                    </span>
                    <ArrowRight
                      size={16}
                      className="mt-1 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
                    />
                  </div>
                  <h3 className="mt-5 font-semibold text-ink">{tool.title}</h3>
                  <p className="mt-2 min-h-16 text-sm leading-relaxed text-ink-soft">
                    {tool.description}
                  </p>
                  <span className="mt-4 inline-block border-t border-line pt-3 font-mono text-[11px] uppercase tracking-wider text-blue-700">
                    {tool.detail}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-700">
              Built to be transparent
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
              No inflated status claims.
            </h2>
          </div>
          <div>
            <p className="leading-relaxed text-ink-soft">
              Foundry Cloud shows service health from real checks, and makes
              integrations that are not configured clear. A green badge should
              mean a check actually passed—not that a page is presenting a
              demo.
            </p>
            <Link
              href="/status"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              View current service checks <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
