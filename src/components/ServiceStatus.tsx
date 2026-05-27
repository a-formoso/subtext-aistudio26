import { useState, useEffect, useCallback } from "react";

interface Status {
  gemini: boolean;
  geminiModel: string;
  higgsfield: boolean;
}

export function ServiceStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch("/api/status");
      const data = await r.json();
      setStatus(data);
    } catch {
      setStatus({ gemini: false, geminiModel: "", higgsfield: false });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [check]);

  if (!status && !checking) return null;

  const modelLabel = status?.geminiModel
    ? status.geminiModel === "gemini-3.5-flash" ? "3.5" : "2.0"
    : "";

  return (
    <div className="hidden sm:flex items-center gap-1.5">
      {/* Gemini pill */}
      <button
        onClick={check}
        title={
          checking
            ? "Checking Gemini…"
            : status?.gemini
            ? `Gemini ${status.geminiModel} — live`
            : "Gemini — unavailable (no API credits)"
        }
        className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer select-none ${
          checking
            ? "border-white/10 bg-white/3 text-slate-600 animate-pulse"
            : status?.gemini
            ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-500 hover:bg-emerald-500/15"
            : "border-red-500/30 bg-red-500/8 text-red-500 hover:bg-red-500/15"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${
          checking ? "bg-slate-600" :
          status?.gemini ? "bg-emerald-500" : "bg-red-500"
        }`} />
        <span>Gemini{modelLabel ? ` ${modelLabel}` : ""}</span>
      </button>

      {/* Higgsfield pill */}
      <button
        onClick={check}
        title={
          checking
            ? "Checking Higgsfield…"
            : status?.higgsfield
            ? "Higgsfield — live"
            : "Higgsfield — unavailable (check API credentials)"
        }
        className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer select-none ${
          checking
            ? "border-white/10 bg-white/3 text-slate-600 animate-pulse"
            : status?.higgsfield
            ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-500 hover:bg-emerald-500/15"
            : "border-red-500/30 bg-red-500/8 text-red-500 hover:bg-red-500/15"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${
          checking ? "bg-slate-600" :
          status?.higgsfield ? "bg-emerald-500" : "bg-red-500"
        }`} />
        <span>HF</span>
      </button>
    </div>
  );
}
