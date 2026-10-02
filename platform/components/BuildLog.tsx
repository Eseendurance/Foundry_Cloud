type Status = "live" | "building" | "planned";

type Entry = {
  status: Status;
  name: string;
  note: string;
};

const entries: Entry[] = [
  {
    status: "live",
    name: "Platform shell & workspace",
    note: "Real navigation, real forms, deployed and reachable right now.",
  },
  {
    status: "live",
    name: "AI app builder",
    note: "Describe an app, get back a real running single-page app, generated live via Claude, Gemini, or DeepSeek — whichever you've connected.",
  },
  {
    status: "live",
    name: "Workspace database & accounts",
    note: "Real signup/login with hashed passwords and per-user Postgres data, not a mock.",
  },
  {
    status: "live",
    name: "In-browser IDE",
    note: "Real Monaco editor, multi-file, with a live preview. Terminal + npm execution needs a sandboxing service we haven't connected yet.",
  },
  {
    status: "live",
    name: "Transactional email",
    note: "Real SMTP sending with real open/click tracking (like Resend), plus a live SPF/DMARC domain checker that needs no key at all.",
  },
  {
    status: "live",
    name: "Domain lookup",
    note: "Real RDAP registry lookups and live DNS records. Buying a domain still needs a registrar account — not wired up.",
  },
  {
    status: "live",
    name: "AI voice",
    note: "Real text-to-speech via ElevenLabs. The talking video avatar needs a GPU renderer we haven't connected yet.",
  },
  {
    status: "live",
    name: "Search",
    note: "Real full-text + typo-tolerant search, built into your own Postgres — no extra service, no extra key, no extra bill.",
  },
];

const styles: Record<Status, { dot: string; label: string; text: string }> = {
  live: { dot: "bg-moss", label: "live", text: "text-moss" },
  building: { dot: "bg-amber", label: "building", text: "text-amber" },
  planned: { dot: "bg-ink-soft/50", label: "planned", text: "text-ink-soft" },
};

export default function BuildLog() {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-ink text-paper">
      <div className="flex items-center justify-between border-b border-paper/10 px-6 py-4">
        <span className="font-mono text-xs uppercase tracking-widest text-paper/50">
          build-log.txt
        </span>
        <span className="font-mono text-xs text-paper/50">
          updated {new Date().toISOString().slice(0, 10)}
        </span>
      </div>
      <ul className="divide-y divide-paper/10">
        {entries.map((entry) => (
          <li
            key={entry.name}
            className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="flex items-center gap-3 sm:w-64 sm:shrink-0">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${styles[entry.status].dot}`}
              />
              <span className="font-mono text-sm">{entry.name}</span>
            </div>
            <p className="text-sm text-paper/60">{entry.note}</p>
            <span
              className={`font-mono text-xs uppercase tracking-wider sm:ml-auto ${styles[entry.status].text}`}
            >
              {styles[entry.status].label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
