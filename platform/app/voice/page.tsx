"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, AlertCircle, Video } from "lucide-react";

type Voice = { voice_id: string; name: string };

export default function VoiceModule() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [text, setText] = useState(
    "Hi — this is a real voice, generated live, not a recording."
  );
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/voice/voices")
      .then((r) => r.json())
      .then((data) => {
        if (data.voices) {
          setVoices(data.voices);
          if (data.voices[0]) setVoiceId(data.voices[0].voice_id);
        } else if (data.error) {
          setVoicesError(data.error);
        }
      })
      .catch(() => setVoicesError("Couldn't reach the server."));
  }, []);

  async function generate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const res = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Request failed (${res.status}).`);
        return;
      }

      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <ArrowLeft size={16} />
            Workspace
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-moss/30 bg-moss/5 px-3 py-1 text-xs text-moss">
            <span className="h-1.5 w-1.5 rounded-full bg-moss" />
            Voice — live
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">AI voice</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Real text-to-speech, generated on request through ElevenLabs — not
          a sample clip.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-line bg-paper-dim/40 p-4 text-sm text-ink-soft">
          <Video size={16} className="mt-0.5 shrink-0 text-amber" />
          The talking video avatar (a face lip-synced to this audio) is the
          next increment — it needs a GPU rendering service we haven&apos;t
          connected. This page ships the real half: the voice itself.
        </div>

        {voicesError && (
          <p className="mt-6 flex items-start gap-2 text-sm text-rust">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {voicesError}
          </p>
        )}

        {!voicesError && (
          <form onSubmit={generate} className="mt-6 flex flex-col gap-3">
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              disabled={voices.length === 0}
              className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
            >
              {voices.length === 0 && <option>Loading voices…</option>}
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name}
                </option>
              ))}
            </select>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-2xl border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
            />
            <button
              type="submit"
              disabled={loading || !voiceId}
              className="flex items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-medium text-paper hover:bg-moss-deep disabled:opacity-60"
            >
              <Volume2 size={15} />
              {loading ? "Generating…" : "Generate speech"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 text-sm text-rust">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {audioUrl && (
          <audio controls autoPlay src={audioUrl} className="mt-6 w-full" />
        )}
      </main>
    </div>
  );
}
