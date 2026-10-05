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
    name: "App builder",
    note: "The builder includes a code editor and browser preview; the current preview supports HTML, CSS, and JavaScript.",
  },
  {
    status: "live",
    name: "Workspace database & accounts",
    note: "Sign-in and project data require a working PostgreSQL connection in your deployment.",
  },
  {
    status: "live",
    name: "In-browser IDE",
    note: "Real Monaco editor, multi-file, with a live preview. Terminal + npm execution needs a sandboxing service we haven't connected yet.",
  },
  {
    status: "live",
    name: "Transactional email",
    note: "Message delivery requires your SMTP server. Domain checks inspect DNS records and do not change them.",
  },
  {
    status: "live",
    name: "DNS inspection",
    note: "The workspace can inspect DNS records. Registrar search and purchases are not enabled.",
  },
  {
    status: "live",
    name: "Local voice tools",
    note: "Speech features depend on local voice software being installed and available to the server.",
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
