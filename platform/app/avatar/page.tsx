'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RawAvatarEngine } from '@/raw-engine/media/avatar';

export default function AvatarStudio() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [script, setScript] = useState<string>(
    'Welcome to Platform Gamma Neon. This avatar runs 100% locally on your browser and raw engine without third-party API dependencies or watermarks.'
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-400">AI Avatar Studio</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
            Zero Watermark Engine
          </span>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
        >
          ✕ Exit Studio
        </button>
      </header>

      {/* Main Studio Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video Preview Canvas */}
        <div className="w-2/3 p-6 flex flex-col justify-center items-center bg-slate-950">
          <div className="relative border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900">
            <canvas ref={canvasRef} className="w-[800px] h-[450px] object-cover" />
            {isSpeaking && (
              <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/80 text-white text-xs font-semibold rounded-full animate-pulse">
                ● Speaking
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls & Script Input */}
        <div className="w-1/3 border-l border-slate-800 bg-slate-900 p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-300">Avatar Script & Settings</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400">Script Text</label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              placeholder="Enter speech script here..."
            />
          </div>

          <button
            onClick={handleGenerate}
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg shadow transition"
          >
            Render & Speak Avatar
          </button>
        </div>
      </div>
    </div>
  );
}