import { useState } from "react";
import { StoryOption, Character } from "../types";
import { getStoryCharacters, getStoryMeaning } from "../utils/schemaConverter";
import { Sparkles, RefreshCw, ArrowRight, ImageIcon, CheckCircle, AlertCircle, User, MapPin, Package } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Phase4VisualsProps {
  selectedOption: StoryOption;
  onProceed: () => void;
}

type AssetTab = "characters" | "locations" | "props";

interface GeneratedAsset {
  id: string;
  status: "idle" | "generating" | "done" | "error";
  jobId?: string;
  imageUrl?: string;
  prompt?: string;
}

export function Phase4Visuals({ selectedOption, onProceed }: Phase4VisualsProps) {
  const [activeTab, setActiveTab] = useState<AssetTab>("characters");
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [assets, setAssets] = useState<Record<string, GeneratedAsset>>({});
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  const characters = getStoryCharacters(selectedOption);
  const meaning = getStoryMeaning(selectedOption);
  const setting = selectedOption.setting?.dimensions || selectedOption.step_1_and_2_cosmology_and_actors?.dimensions;

  const locations = setting ? [
    { id: "loc_main", name: setting.location || "Primary Location", desc: setting.period + " — " + setting.conflict_level },
  ] : [];

  const props = meaning.props_sheet || [];

  const generateAsset = async (assetId: string, prompt: string) => {
    setAssets(prev => ({ ...prev, [assetId]: { id: assetId, status: "generating", prompt } }));
    try {
      const resp = await fetch("/api/generate-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, prompt }),
      });
      const data = await resp.json();
      if (data.success) {
        setApiAvailable(true);
        setAssets(prev => ({ ...prev, [assetId]: { id: assetId, status: "done", jobId: data.jobId, imageUrl: data.imageUrl, prompt } }));
      } else {
        setApiAvailable(data.needsApiKey ? false : true);
        setAssets(prev => ({ ...prev, [assetId]: { id: assetId, status: "error", prompt } }));
      }
    } catch {
      setAssets(prev => ({ ...prev, [assetId]: { id: assetId, status: "error", prompt } }));
    }
  };

  const approvedCount = Object.values(assets).filter(a => a.status === "done").length;
  const totalAssets = characters.length + locations.length + props.length;

  const tabs: { id: AssetTab; label: string; icon: typeof User; count: number }[] = [
    { id: "characters", label: "Characters", icon: User, count: characters.length },
    { id: "locations", label: "Locations", icon: MapPin, count: locations.length },
    { id: "props", label: "Props", icon: Package, count: props.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">Phase 4 — Visual Asset Generation</span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Generate character grids, location cards & props using Higgsfield AI</p>
        </div>
        {apiAvailable === false && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-700/40 bg-yellow-950/20 text-yellow-400 text-[10px] font-mono shrink-0">
            <AlertCircle className="w-3 h-3" />
            HIGGSFIELD_API_KEY needed
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-orange-500/70 bg-gradient-to-br from-[#0c0c10] to-[#08080a] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/15 text-slate-300">Phase 04</span>
            <span className="font-mono text-[10px] text-slate-400">{approvedCount}/{totalAssets} assets approved</span>
          </div>
          <button
            onClick={onProceed}
            className="flex items-center gap-2 py-2 px-5 rounded-lg font-mono text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all cursor-pointer shadow-md shadow-orange-950/40"
          >
            Proceed to Shot Generation
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex border border-white/15 rounded-lg overflow-hidden bg-black/50">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  i > 0 ? "border-l border-white/10" : ""
                } ${activeTab === tab.id ? "bg-white/15 text-white" : "text-slate-300 hover:text-white hover:bg-white/5"}`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
                <span className="font-mono text-[8px] px-1 py-0.5 rounded bg-black/50 border border-white/10 text-slate-500">{tab.count}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "characters" && (
              <motion.div key="chars" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {characters.length === 0 ? (
                  <EmptyState message="No characters found. Generate a story in Phase 1 first." />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {characters.map((c, i) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCharIdx(i)}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer border shrink-0 ${
                            activeCharIdx === i ? "bg-white/15 border-white/25 text-white" : "bg-black/50 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {c.identity?.name || `Character ${i + 1}`}
                        </button>
                      ))}
                    </div>
                    {characters[activeCharIdx] && (
                      <CharacterAssetCard
                        char={characters[activeCharIdx]}
                        asset={assets[characters[activeCharIdx].id]}
                        onGenerate={() => {
                          const char = characters[activeCharIdx];
                          const prompt = char.prompts?.master_visual_reference?.master_grid_prompt || `${char.visuals?.core_body || ""} ${char.visuals?.material_texture || ""}`;
                          generateAsset(char.id, prompt);
                        }}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "locations" && (
              <motion.div key="locs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {locations.length === 0 ? (
                  <EmptyState message="No locations extracted from story data." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {locations.map(loc => (
                      <AssetCard
                        key={loc.id}
                        label={loc.name}
                        sublabel={loc.desc}
                        asset={assets[loc.id]}
                        onGenerate={() => generateAsset(loc.id, `Cinematic establishing shot of ${loc.name}. ${loc.desc}. High-fidelity, photorealistic, anamorphic lens, moody lighting.`)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "props" && (
              <motion.div key="props" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {props.length === 0 ? (
                  <EmptyState message="No props found. Ensure Phase 1 has generated meaning data." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {props.map((prop, i) => {
                      const id = `prop_${i}`;
                      return (
                        <AssetCard
                          key={id}
                          label={prop.name}
                          sublabel={prop.description}
                          asset={assets[id]}
                          onGenerate={() => generateAsset(id, `Product shot of "${prop.name}". ${prop.description}. Studio lighting, sharp focus, cinematic texture, 4K detail.`)}
                        />
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CharacterAssetCard({ char, asset, onGenerate }: { char: Character; asset?: GeneratedAsset; onGenerate: () => void }) {
  const gridSlots = Array.from({ length: 10 });
  return (
    <div className="rounded-xl bg-black/50 border border-white/10 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">{char.identity?.cast_orbit}</span>
          <h4 className="font-bold text-white text-sm">{char.identity?.name}</h4>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{char.prompts?.master_visual_reference?.core_keywords_used || char.visuals?.core_body}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={asset?.status === "generating"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[10px] text-white font-mono font-bold transition-all cursor-pointer shrink-0"
        >
          {asset?.status === "generating" ? (
            <><RefreshCw className="w-3 h-3 animate-spin" />Generating…</>
          ) : asset?.status === "done" ? (
            <><RefreshCw className="w-3 h-3" />Regenerate</>
          ) : (
            <><Sparkles className="w-3 h-3" />Generate 5×2 Grid</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {gridSlots.map((_, i) => (
          <div
            key={i}
            className={`aspect-[3/4] rounded-lg border flex items-center justify-center transition-all ${
              asset?.status === "done"
                ? "border-emerald-500/40 bg-emerald-950/20"
                : asset?.status === "generating"
                ? "border-orange-500/30 bg-orange-950/10 animate-pulse"
                : "border-white/8 bg-white/3"
            }`}
          >
            {asset?.status === "done" ? (
              <CheckCircle className="w-3 h-3 text-emerald-500" />
            ) : asset?.status === "generating" ? (
              <div className="w-2 h-2 rounded-full bg-orange-500/50 animate-ping" />
            ) : (
              <ImageIcon className="w-3 h-3 text-slate-700" />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-[9px] font-mono text-slate-500">
        <span className="flex-1">Row 1: Full-body poses (5 angles)</span>
        <span className="flex-1 text-right">Row 2: Headshots (5 expressions)</span>
      </div>

      {asset?.status === "error" && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-yellow-700/40 bg-yellow-950/20 text-yellow-400 text-[10px] font-mono">
          <AlertCircle className="w-3 h-3 shrink-0" />
          Generation failed. Add HIGGSFIELD_API_KEY to Replit Secrets, then retry.
        </div>
      )}
    </div>
  );
}

function AssetCard({ label, sublabel, asset, onGenerate }: { label: string; sublabel: string; asset?: GeneratedAsset; onGenerate: () => void }) {
  return (
    <div className="rounded-xl bg-black/50 border border-white/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm truncate">{label}</h4>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{sublabel}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={asset?.status === "generating"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[10px] text-white font-mono font-bold transition-all cursor-pointer shrink-0"
        >
          {asset?.status === "generating" ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {asset?.status === "generating" ? "…" : asset?.status === "done" ? "Regen" : "Generate"}
        </button>
      </div>

      <div className={`aspect-video rounded-lg border flex items-center justify-center transition-all ${
        asset?.status === "done" ? "border-emerald-500/40 bg-emerald-950/20"
        : asset?.status === "generating" ? "border-orange-500/30 bg-orange-950/10 animate-pulse"
        : "border-white/8 bg-white/3"
      }`}>
        {asset?.status === "done" ? (
          <div className="flex flex-col items-center gap-1.5">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-[9px] font-mono text-emerald-400">Asset ready</span>
          </div>
        ) : asset?.status === "generating" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <span className="text-[9px] font-mono text-orange-400">Rendering…</span>
          </div>
        ) : (
          <ImageIcon className="w-6 h-6 text-slate-700" />
        )}
      </div>

      {asset?.status === "error" && (
        <p className="text-[9px] font-mono text-yellow-500">API key required. Add HIGGSFIELD_API_KEY to Secrets.</p>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-10 flex flex-col items-center justify-center gap-2 text-center">
      <ImageIcon className="w-6 h-6 text-slate-700" />
      <p className="text-slate-600 font-mono text-[10px] italic">{message}</p>
    </div>
  );
}
