import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import BuildLog from "@/components/BuildLog";
import WaitlistForm from "@/components/WaitlistForm";
import HeroLayers from "@/components/HeroLayers";
import {
  Database,
  Mail,
  Globe,
  Video,
  Code2,
  Sparkles,
  Search,
  Eye,
  GitBranch,
  ShieldCheck,
} from "lucide-react";

const pillars = [
  {
    icon: Sparkles,
    name: "AI app builder",
    desc: "Describe what you want. Real AI (Anthropic, Gemini, or DeepSeek — whichever you have connected) streams back a working single-page app you can preview, edit, and keep.",
  },
  {
    icon: Code2,
    name: "In-browser IDE",
    desc: "A real Monaco editor — the same one behind VS Code — with a live preview pane. Full terminal and npm support are next.",
  },
  {
    icon: Database,
    name: "Workspace database",
    desc: "A Postgres database and auth system provisioned per project, with row-level security by default.",
  },
  {
    icon: Mail,
    name: "Transactional email",
    desc: "Send real email through your own SMTP account with real open/click tracking, and check any domain's live SPF/DMARC setup — no key needed for the checker.",
  },
  {
    icon: Globe,
    name: "Domain lookup",
    desc: "Real RDAP registry data and live DNS records for any domain. Purchasing needs a connected registrar account — not live yet.",
  },
  {
    icon: Video,
    name: "AI voice",
    desc: "Real text-to-speech, generated on request. A lip-synced video avatar is the next increment, once a GPU renderer is connected.",
  },
  {
    icon: Search,
    name: "Search",
    desc: "Real full-text and typo-tolerant search, built entirely into your own database — nothing extra to sign up for or pay for.",
  },
];

const steps = [
  {
    title: "Say what you are building",
    desc: "In plain language — a waitlist page, a booking tool, an internal dashboard.",
  },
  {
    title: "Watch the code take shape",
    desc: "Files appear in a real editor. You can read every line, not just the preview.",
  },
  {
    title: "Connect the pieces you need",
    desc: "A database, a domain, a sending address — added when your project actually needs them.",
  },
  {
    title: "Ship it",
    desc: "Push to your own GitHub, deploy to your own hosting. Nothing is locked to us.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-dim px-3 py-1 text-xs text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              Built in the open — see what is live below
            </span>

            <h1 className="mt-6 font-display text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              A developer platform that tells you
              <span className="italic text-moss"> what is actually working.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Groundwork is building the tools to take an idea from a
              sentence to a shipped product — an app builder, a code editor,
              a database, eventually a domain and an inbox. We are not
              pretending it is all done. The log below shows exactly what
              you can use today.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/build"
                className="rounded-full bg-moss px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-moss-deep"
              >
                Try the app builder — it is live
              </a>
              <a
                href="#log"
                className="rounded-full border border-line px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                See the build log
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroLayers />
          </div>
        </div>
      </section>

      {/* Build log */}
      <section id="log" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            What is live right now
          </h2>
          <p className="mt-3 text-ink-soft">
            No feature on this page ships until it does real work. Here is
            the honest state of every piece, updated as we go.
          </p>
        </div>
        <BuildLog />
      </section>

      {/* Pillars */}
      <section className="border-y border-line bg-paper-dim/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Six tools, one workspace
            </h2>
            <p className="mt-3 text-ink-soft">
              Each one is being built to work on its own — use only the
              pieces your project needs.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl border border-line bg-paper p-6"
              >
                <p.icon className="text-moss" size={22} strokeWidth={1.75} />
                <h3 className="mt-4 font-medium text-ink">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            How it is meant to work
          </h2>
          <p className="mt-3 text-ink-soft">
            This is the path we are building toward. Steps already live
            are marked in the log above.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title}>
              <span className="font-mono text-sm text-moss">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-line bg-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
          <div>
            <Eye className="text-amber" size={22} strokeWidth={1.75} />
            <h3 className="mt-4 font-medium text-paper">No staged demos</h3>
            <p className="mt-2 text-sm leading-relaxed text-paper/60">
              If it is marked live, it responds to real input and does
              real work — including this page signup form.
            </p>
          </div>
          <div>
            <GitBranch className="text-amber" size={22} strokeWidth={1.75} />
            <h3 className="mt-4 font-medium text-paper">You keep the code</h3>
            <p className="mt-2 text-sm leading-relaxed text-paper/60">
              What you build is plain HTML, CSS, and JavaScript today —
              React and Next.js scaffolding is next. Export it, push it to
              your own GitHub, run it anywhere.
            </p>
          </div>
          <div>
            <ShieldCheck className="text-amber" size={22} strokeWidth={1.75} />
            <h3 className="mt-4 font-medium text-paper">No account required to look</h3>
            <p className="mt-2 text-sm leading-relaxed text-paper/60">
              Browse the workspace shell without signing up. Create an
              account only when you want a project to actually persist —
              that is a real Postgres row, not a cookie trick.
            </p>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl text-ink sm:text-3xl">
          Follow along, or get pulled in early
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft">
          Tell us what you are hoping to build. When the piece you need
          goes live, you will be the first to hear — once, by email.
        </p>
        <div className="mx-auto mt-8 max-w-lg">
          <WaitlistForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}