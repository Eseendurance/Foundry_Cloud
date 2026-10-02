"use client";

import React, { useMemo, useState } from "react";
import { Monitor, Smartphone, Maximize2, Minimize2, RefreshCw } from "lucide-react";

interface PreviewProps {
  code: string;
  className?: string;
}

export default function Preview({ code, className = "" }: PreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0); // For quick reload trigger

  // 1. Clean code output to remove LLM Markdown wrappers
  const cleanedCode = useMemo(() => {
    if (!code) return "";
    
    let raw = code.trim();

    // Strip starting markdown fences like ```html or ```xml
    raw = raw.replace(/^```[a-z]*\n?/i, "");
    
    // Strip trailing markdown fence
    raw = raw.replace(/\n?```$/i, "");

    return raw.trim();
  }, [code]);

  // 2. Wrap HTML inside a safe wrapper with Tailwind CDN & error boundary
  const fullHtml = useMemo(() => {
    // If the LLM supplied a full HTML document, inject script tags prior to </head>
    if (cleanedCode.toLowerCase().includes("<html")) {
      return cleanedCode.replace(
        /<\/head>/i,
        `<script src="https://cdn.tailwindcss.com"></script>
         <script>
           window.onerror = function(msg, url, line) {
             document.body.innerHTML += '<div style="color:red; background:#fee2e2; padding:12px; margin:10px; border-radius:6px; font-family:sans-serif;"><strong>Preview Error:</strong> ' + msg + '</div>';
           };
         </script>
         </head>`
      );
    }

    // Default template wrapper for HTML/JS snippets
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
  <script>
    window.onerror = function(msg, url, line) {
      document.body.innerHTML += '<div style="color:#dc2626; background:#fee2e2; border:1px solid #fca5a5; padding:12px; margin:16px; border-radius:8px; font-family:sans-serif; font-size:14px;"><strong>Runtime Error:</strong> ' + msg + '</div>';
    };
  </script>
</head>
<body class="bg-white text-slate-900 min-h-screen p-4">
  ${cleanedCode || `<div class="flex items-center justify-center h-64 text-slate-400 font-sans text-sm">Waiting for app generation...</div>`}
</body>
</html>`;
  }, [cleanedCode]);

  return (
    <div
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : "h-full w-full"
      } ${className}`}
    >
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-slate-300 text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-200">Live App Preview</span>
        </div>

        {/* Viewport & Utility Action Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded transition ${
              device === "desktop"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Desktop View"
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded transition ${
              device === "mobile"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Mobile View"
          >
            <Smartphone size={14} />
          </button>
          <div className="w-px h-3 bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => setKey((k) => k + 1)}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Refresh Preview"
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Frame Container Pane */}
      <div className="flex-1 bg-slate-950/50 flex items-center justify-center p-2 overflow-auto">
        <div
          className={`transition-all duration-300 h-full bg-white shadow-2xl overflow-hidden ${
            device === "mobile"
              ? "w-[375px] h-[667px] max-h-full rounded-2xl border-[6px] border-slate-800"
              : "w-full rounded-lg border border-slate-800"
          }`}
        >
          <iframe
            key={key}
            srcDoc={fullHtml}
            title="Interactive App Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}