"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { APIKeyClient, APIKey } from "@/lib/api-key-client";

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setKeys(APIKeyClient.getKeys());
  }, []);

  function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    const newKey = APIKeyClient.createKey(labelInput);
    setKeys(APIKeyClient.getKeys());
    setLabelInput("");
  }

  function handleRevoke(id: string) {
    const updated = APIKeyClient.revokeKey(id);
    setKeys(updated);
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="border-b border-black pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Platform API Access Keys</h1>
          <p className="mt-1 text-xs text-black/70">
            Issue API keys to integrate code generation, database schema management, and deployments into external software.
          </p>
        </div>

        {/* Generate Key Input */}
        <div className="mt-8 border border-black p-4 bg-white">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Key size={14} /> Issue New API Token
          </h2>
          <form onSubmit={handleCreateKey} className="flex gap-2">
            <input
              type="text"
              placeholder="Key Label (e.g., Production Client, Mobile App Integration)"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="w-full border border-black bg-white px-3 py-2 text-xs text-black placeholder:text-black/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!labelInput.trim()}
              className="border border-black bg-black px-4 py-2 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors shrink-0 disabled:opacity-50"
            >
              Generate Key
            </button>
          </form>
        </div>

        {/* Active Keys List */}
        <div className="mt-8 border border-black">
          <div className="border-b border-black bg-white px-4 py-2 font-mono text-xs font-bold uppercase">
            Active Keys ({keys.length})
          </div>
          <div className="divide-y divide-black/10 font-mono text-xs">
            {keys.map((k) => (
              <div key={k.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold font-sans text-sm">{k.label}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-black/5 px-2 py-0.5 text-[11px] border border-black/20">{k.key}</span>
                    <button
                      onClick={() => copyToClipboard(k.key, k.id)}
                      className="text-black/60 hover:text-black"
                    >
                      {copiedId === k.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] px-2 py-0.5 border ${k.status === "ACTIVE" ? "border-black bg-black text-white" : "border-black/30 text-black/40"}`}>
                    {k.status}
                  </span>
                  {k.status === "ACTIVE" && (
                    <button onClick={() => handleRevoke(k.id)} className="text-black/60 hover:text-black">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {keys.length === 0 && (
              <div className="p-4 text-black/50 italic text-xs font-sans">No API keys issued yet.</div>
            )}
          </div>
        </div>

        {/* Integration Documentation Sample */}
        <div className="mt-8 border border-black p-4 bg-white">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-2">cURL Example Request</h2>
          <pre className="p-3 bg-black/5 border border-black/10 font-mono text-[11px] overflow-x-auto">
{`curl -X POST https://platform-gamma-neon.vercel.app/api/v1 \\
  -H "Authorization: Bearer fg_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "generate_code",
    "payload": { "prompt": "Create an Express authentication middleware" }
  }'`}
          </pre>
        </div>
      </main>
    </div>
  );
}