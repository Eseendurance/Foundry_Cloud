'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RawAvatarEngine } from '@/raw-engine/media/avatar';

export default function AvatarStudio() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [script, setScript] = useState<string>(
    "Welcome to Foundry Cloud. Customize this short script, then preview the browser-based avatar."
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const engineRef = useRef<{ startSpeech: () => void; stopSpeech: () => void } | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = RawAvatarEngine.renderAvatarCanvas(
        canvasRef.current,
        {
          avatarStyle: 'presenter',
          text: script,
        },
        (talking) => setIsSpeaking(talking)
      ) || null;
    }

    return () => {
      if (engineRef.current) engineRef.current.stopSpeech();
    };
  }, [script]);

  const handleGenerate = () => {
    if (engineRef.current) {
      engineRef.current.startSpeech();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-950">Media Studio</span>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
        >
          ✕ Exit Studio
        </button>
      </header>

      {/* Main Studio Body */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left: Video Preview Canvas */}
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
          <div className="relative max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <canvas ref={canvasRef} className="h-auto max-h-[65vh] w-full max-w-[800px] object-cover" />
            {isSpeaking && (
              <div className="absolute left-4 top-4 rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white animate-pulse">
                ● Speaking
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Script Input */}
        <div className="flex w-full flex-col gap-4 border-t border-slate-200 bg-white p-5 lg:w-96 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold text-slate-950">Avatar script</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-600">Script text</label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Enter speech script here..."
            />
          </div>

          <button
            onClick={handleGenerate}
            className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Render & Speak Avatar
          </button>
        </div>
      </div>
    </div>
  );
}