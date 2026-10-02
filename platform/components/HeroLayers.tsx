const layers = [
  { label: "your product", tone: "bg-paper border border-line text-ink" },
  { label: "app builder + IDE", tone: "bg-amber/25 border border-amber/40 text-ink" },
  { label: "database + auth", tone: "bg-blue-trust/15 border border-blue-trust/30 text-ink" },
  { label: "email · domains · video", tone: "bg-rust/10 border border-rust/25 text-ink" },
  { label: "groundwork", tone: "bg-moss text-paper" },
];

export default function HeroLayers() {
  return (
    <div className="relative w-full max-w-sm">
      <div className="flex flex-col-reverse gap-2">
        {layers.map((layer, i) => (
          <div
            key={layer.label}
            className={`rounded-xl px-4 py-3 font-mono text-xs sm:text-sm ${layer.tone}`}
            style={{
              marginLeft: `${i * 6}px`,
              marginRight: `${i * 6}px`,
            }}
          >
            {layer.label}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        Everything you ship stands on the layer below it. We&apos;re building
        from the bottom up, in view.
      </p>
    </div>
  );
}
