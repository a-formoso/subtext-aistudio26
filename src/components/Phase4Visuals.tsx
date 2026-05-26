import { useState } from "react";
import { StoryOption, Character } from "../types";
import { getStoryCharacters, getStoryMeaning } from "../utils/schemaConverter";
import {
  Sparkles, RefreshCw, ArrowRight, ImageIcon, CheckCircle,
  AlertCircle, User, MapPin, Package, Plus, Lock, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Phase4VisualsProps {
  selectedOption: StoryOption;
  onProceed: () => void;
  characterVariants: CharacterVariant[];
  onAddVariant: (v: CharacterVariant) => void;
}

export interface CharacterVariant {
  charId: string;
  variantId: string;
  label: string;
  arcStep: string;
}

type AssetTab = "characters" | "locations" | "props";

interface GeneratedAsset {
  id: string;
  status: "idle" | "waiting_key" | "generating" | "done" | "error";
  jobId?: string;
  imageUrl?: string;
  prompt?: string;
}

const ROW1_LABELS = ["Full-body Front (0°)", "3/4 Front (45°)", "Body Profile (90°)", "3/4 Back (135°)", "Full-body Back (180°)"];
const ROW2_LABELS = ["Close-up Neutral", "Neutral Profile", "Joy / Laughter", "Anger / Rage", "Sadness / Grief"];
const ALL_CELL_LABELS = [...ROW1_LABELS, ...ROW2_LABELS];

export function Phase4Visuals({ selectedOption, onProceed, characterVariants, onAddVariant }: Phase4VisualsProps) {
  const [activeTab, setActiveTab] = useState<AssetTab>("characters");
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [assets, setAssets] = useState<Record<string, GeneratedAsset>>({});
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

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
        setApiKeyMissing(false);
        setAssets(prev => ({ ...prev, [assetId]: { id: assetId, status: "done", jobId: data.jobId, imageUrl: data.imageUrl, prompt } }));
      } else if (data.needsApiKey) {
        setApiKeyMissing(true);
        setAssets(prev => ({ ...prev, [assetId]: { id: assetId, status: "waiting_key", prompt } }));
      } else {
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

  const charVariantsFor = (charId: string) => characterVariants.filter(v => v.charId === charId);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">Phase 4 — Visual Asset Generation</span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Generate character reference sheets, location cards &amp; props via Higgsfield AI</p>
        </div>
        {apiKeyMissing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-700/40 bg-blue-950/20 text-blue-300 text-[10px] font-mono shrink-0">
            <Lock className="w-3 h-3" />
            Higgsfield API key pending activation
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
                        baseAsset={assets[characters[activeCharIdx].id]}
                        variants={charVariantsFor(characters[activeCharIdx].id)}
                        variantAssets={assets}
                        onGenerate={(id, prompt) => generateAsset(id, prompt)}
                        onAddVariant={(label, arcStep) => {
                          const char = characters[activeCharIdx];
                          const variantId = `${char.id}_v${charVariantsFor(char.id).length + 1}`;
                          onAddVariant({ charId: char.id, variantId, label, arcStep });
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

function CharacterAssetCard({
  char, baseAsset, variants, variantAssets, onGenerate, onAddVariant,
}: {
  char: Character;
  baseAsset?: GeneratedAsset;
  variants: CharacterVariant[];
  variantAssets: Record<string, GeneratedAsset>;
  onGenerate: (id: string, prompt: string) => void;
  onAddVariant: (label: string, arcStep: string) => void;
}) {
  const [addingVariant, setAddingVariant] = useState(false);
  const [variantLabel, setVariantLabel] = useState("");
  const [variantArcStep, setVariantArcStep] = useState("");

  const basePrompt = char.prompts?.master_visual_reference?.master_grid_prompt
    || `${char.visuals?.core_body || ""} ${char.visuals?.material_texture || ""}`;

  const confirmVariant = () => {
    if (!variantLabel.trim()) return;
    onAddVariant(variantLabel.trim(), variantArcStep.trim());
    setVariantLabel(""); setVariantArcStep(""); setAddingVariant(false);
  };

  return (
    <div className="rounded-xl bg-black/50 border border-white/10 p-4 space-y-5">
      {/* Base grid */}
      <ReferenceGrid
        title={`${char.identity?.name || "Character"} — Base Reference`}
        subtitle={char.identity?.cast_orbit}
        description={char.prompts?.master_visual_reference?.core_keywords_used || char.visuals?.core_body}
        assetId={char.id}
        asset={baseAsset}
        prompt={basePrompt}
        onGenerate={onGenerate}
      />

      {/* Variant grids */}
      {variants.map(v => {
        const variantPrompt = `${basePrompt}. STATE VARIANT: ${v.label}. Arc change: ${v.arcStep}. Maintain same character identity with adjusted wardrobe/expression/physical state.`;
        return (
          <div key={v.variantId} className="border-t border-white/8 pt-4">
            <ReferenceGrid
              title={`Variant: ${v.label}`}
              subtitle={v.arcStep}
              description={`Arc step: ${v.arcStep}`}
              assetId={v.variantId}
              asset={variantAssets[v.variantId]}
              prompt={variantPrompt}
              onGenerate={onGenerate}
              isVariant
            />
          </div>
        );
      })}

      {/* Add variant UI */}
      <div className="border-t border-white/8 pt-3">
        {!addingVariant ? (
          <button
            onClick={() => setAddingVariant(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/20 hover:border-white/35 bg-white/3 hover:bg-white/5 text-[10px] text-slate-400 hover:text-white font-mono font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add state variant
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-white/15 bg-white/5 p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider font-bold">New State Variant</span>
              <button onClick={() => setAddingVariant(false)} className="cursor-pointer text-slate-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              autoFocus
              value={variantLabel}
              onChange={e => setVariantLabel(e.target.value)}
              placeholder="Variant name — e.g. Post-injury, Act III wardrobe"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <input
              value={variantArcStep}
              onChange={e => setVariantArcStep(e.target.value)}
              placeholder="Arc step — e.g. After the poisoning attempt, blood on jacket"
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAddingVariant(false)}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-slate-400 font-mono cursor-pointer hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVariant}
                disabled={!variantLabel.trim()}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-[10px] text-white font-mono font-bold cursor-pointer transition-all"
              >
                Create Variant
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ReferenceGrid({
  title, subtitle, description, assetId, asset, prompt, onGenerate, isVariant = false,
}: {
  title: string; subtitle?: string; description?: string;
  assetId: string; asset?: GeneratedAsset; prompt: string;
  onGenerate: (id: string, prompt: string) => void; isVariant?: boolean;
}) {
  const status = asset?.status ?? "idle";

  const cellClass = (i: number) => {
    const base = "rounded-md border flex flex-col items-center justify-center gap-1 pb-1 transition-all overflow-hidden";
    if (status === "done") return `${base} border-emerald-500/30 bg-emerald-950/10`;
    if (status === "generating") return `${base} border-orange-500/25 bg-orange-950/8 animate-pulse`;
    if (status === "waiting_key") return `${base} border-blue-800/30 bg-blue-950/10`;
    if (status === "error") return `${base} border-red-800/30 bg-red-950/10`;
    return `${base} border-white/8 bg-white/2`;
  };

  const cellIcon = (status: string) => {
    if (status === "done") return <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />;
    if (status === "generating") return <div className="w-2 h-2 rounded-full bg-orange-500/60 animate-ping" />;
    if (status === "waiting_key") return <Lock className="w-2.5 h-2.5 text-blue-500/50" />;
    if (status === "error") return <AlertCircle className="w-2.5 h-2.5 text-red-500/70" />;
    return <ImageIcon className="w-2.5 h-2.5 text-slate-700" />;
  };

  const cellLabel = (i: number, status: string) => {
    const colors: Record<string, string> = {
      done: "text-emerald-600",
      generating: "text-orange-600",
      waiting_key: "text-blue-700",
      error: "text-red-700",
    };
    const labelText = status === "generating" ? "Rendering…"
      : status === "waiting_key" ? "Pending"
      : status === "error" ? "Failed"
      : status === "done" ? ALL_CELL_LABELS[i]
      : "—";
    return (
      <span className={`font-mono text-[6.5px] leading-tight text-center px-0.5 ${colors[status] ?? "text-slate-700"}`}>
        {labelText}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          {subtitle && <span className={`text-[9px] font-mono uppercase tracking-widest block mb-0.5 ${isVariant ? "text-violet-400" : "text-slate-400"}`}>{subtitle}</span>}
          <h4 className={`font-bold text-sm ${isVariant ? "text-violet-200" : "text-white"}`}>{title}</h4>
          {description && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === "error" && (
            <span className="font-mono text-[9px] text-red-400 border border-red-800/40 bg-red-950/20 px-2 py-1 rounded">Generation failed</span>
          )}
          {status === "waiting_key" && (
            <span className="font-mono text-[9px] text-blue-300 border border-blue-800/40 bg-blue-950/20 px-2 py-1 rounded flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Waiting for API key
            </span>
          )}
          <button
            onClick={() => onGenerate(assetId, prompt)}
            disabled={status === "generating"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-white font-mono font-bold transition-all cursor-pointer disabled:opacity-50 ${
              isVariant ? "bg-violet-700 hover:bg-violet-600" : "bg-orange-600 hover:bg-orange-500"
            }`}
          >
            {status === "generating" ? (
              <><RefreshCw className="w-3 h-3 animate-spin" />Generating…</>
            ) : status === "done" ? (
              <><RefreshCw className="w-3 h-3" />Regenerate</>
            ) : (
              <><Sparkles className="w-3 h-3" />Generate 5×2 Grid</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {ALL_CELL_LABELS.map((_, i) => (
          <div key={i} className={cellClass(i)}>
            <div className="flex-1 w-full flex items-center justify-center py-2">
              {cellIcon(status)}
            </div>
            {cellLabel(i, status)}
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-[8px] font-mono text-slate-600">
        <span className="flex-1">Row 1 — 5 full-body angles</span>
        <span className="flex-1 text-right">Row 2 — 5 expression headshots</span>
      </div>
    </div>
  );
}

function AssetCard({ label, sublabel, asset, onGenerate }: { label: string; sublabel: string; asset?: GeneratedAsset; onGenerate: () => void }) {
  const status = asset?.status ?? "idle";
  return (
    <div className="rounded-xl bg-black/50 border border-white/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm truncate">{label}</h4>
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{sublabel}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={status === "generating"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[10px] text-white font-mono font-bold transition-all cursor-pointer shrink-0"
        >
          {status === "generating" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {status === "generating" ? "…" : status === "done" ? "Regen" : "Generate"}
        </button>
      </div>

      <div className={`aspect-video rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all ${
        status === "done" ? "border-emerald-500/40 bg-emerald-950/20"
        : status === "generating" ? "border-orange-500/30 bg-orange-950/10 animate-pulse"
        : status === "waiting_key" ? "border-blue-800/30 bg-blue-950/10"
        : status === "error" ? "border-red-800/30 bg-red-950/10"
        : "border-white/8 bg-white/3"
      }`}>
        {status === "done" && <><CheckCircle className="w-5 h-5 text-emerald-500" /><span className="text-[9px] font-mono text-emerald-400">Asset ready</span></>}
        {status === "generating" && <><div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /><span className="text-[9px] font-mono text-orange-400">Rendering…</span></>}
        {status === "waiting_key" && <><Lock className="w-4 h-4 text-blue-500/50" /><span className="text-[9px] font-mono text-blue-400">Waiting for API key</span></>}
        {status === "error" && <><AlertCircle className="w-4 h-4 text-red-500/70" /><span className="text-[9px] font-mono text-red-400">Generation failed</span></>}
        {status === "idle" && <ImageIcon className="w-6 h-6 text-slate-700" />}
      </div>
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
