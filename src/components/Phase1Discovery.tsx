import { useState, useEffect } from "react";
import { StoryOption } from "../types";
import { PRESEEDED_OPTIONS } from "../preseededData";
import {
  Sparkles, ArrowRight, Edit3, CheckCircle, Volume2,
  Fingerprint, Sliders, Copy, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getStorySetting, getStoryMeaning, getStoryCharacters } from "../utils/schemaConverter";

interface Phase1DiscoveryProps {
  onSelectOption: (option: StoryOption) => void;
  selectedOptionId?: number;
}

export function Phase1Discovery({ onSelectOption, selectedOptionId }: Phase1DiscoveryProps) {
  const [premise, setPremise] = useState(
    "What if a high-ranking corporate saboteur is forced to execute a quiet chemical poisoning during a high-stakes dinner inside a smart, hermetic greenhouse that visually manifests human stress hormones?"
  );
  const [isEditingPremise, setIsEditingPremise] = useState(false);
  const [options, setOptions] = useState<StoryOption[]>(PRESEEDED_OPTIONS);
  const [activeOptionId, setActiveOptionId] = useState<number>(selectedOptionId || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const [playingMonologueCharId, setPlayingMonologueCharId] = useState<string | null>(null);
  const [expandedVisualsCharId, setExpandedVisualsCharId] = useState<string | null>(null);
  const [copiedCharId, setCopiedCharId] = useState<string | null>(null);
  const [activeCharIndex, setActiveCharIndex] = useState<number>(0);
  const [leftTab, setLeftTab] = useState<"env" | "dialectic">("env");

  useEffect(() => {
    if (selectedOptionId) setActiveOptionId(selectedOptionId);
  }, [selectedOptionId]);

  useEffect(() => {
    setActiveCharIndex(0);
  }, [activeOptionId]);

  const handleGenerateOptions = async () => {
    setIsLoading(true);
    setErrorInfo(null);
    try {
      const resp = await fetch("/api/generate-phase1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customizedPremise: premise }),
      });
      const data = await resp.json();
      if (data.success && data.options && Array.isArray(data.options)) {
        setOptions(data.options);
        setActiveCharIndex(0);
      } else {
        setErrorInfo(data.message || "Failed to generate story options. Loaded pre-seeded high-fidelity screenplay targets.");
        setOptions(PRESEEDED_OPTIONS);
      }
    } catch {
      setErrorInfo("Could not connect to the Express server. Ensure server is active and secrets are loaded.");
      setOptions(PRESEEDED_OPTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const opt = options.find((o) => o.option_id === activeOptionId) || options[0];
  if (!opt) return null;
  const isSelected = selectedOptionId === opt.option_id;
  const setting = getStorySetting(opt);
  const meaning = getStoryMeaning(opt);
  const characters = getStoryCharacters(opt);
  const char = characters[activeCharIndex] || characters[0];

  return (
    <div className="space-y-4">
      {/* Premise Row */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <span className="font-mono text-[9px] tracking-widest text-orange-500 uppercase font-bold">Establishing Cosmology</span>
            <h2 className="text-base font-medium text-slate-100 mt-0.5">Active Narrative Premise</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditingPremise(!isEditingPremise)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 font-mono transition-all cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              {isEditingPremise ? "Lock" : "Customize"}
            </button>
            <button
              onClick={handleGenerateOptions}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[11px] text-white font-mono font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              {isLoading ? "Consulting AI…" : "Re-generate"}
            </button>
          </div>
        </div>
        {isEditingPremise ? (
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            className="w-full h-16 p-2.5 bg-black/80 border border-orange-500/30 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
          />
        ) : (
          <p className="text-slate-300 text-xs leading-relaxed italic border-l-2 border-orange-500 pl-3">
            "{premise}"
          </p>
        )}
        {errorInfo && (
          <div className="mt-3 p-2.5 rounded-lg border border-yellow-900/30 bg-yellow-950/25 text-yellow-500 text-[11px]">
            <strong>Notice:</strong> {errorInfo}
          </div>
        )}
      </div>

      {/* Option Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-sans text-sm font-medium text-slate-100">Phase 1: Story Cosmology Options</h3>
          <p className="font-sans text-[11px] text-slate-500 mt-0.5">Select an option below, then lock it to proceed.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
          {options.map((o) => {
            const isActive = activeOptionId === o.option_id;
            const isSel = selectedOptionId === o.option_id;
            return (
              <button
                key={o.option_id}
                onClick={() => setActiveOptionId(o.option_id)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive ? "bg-orange-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                Option 0{o.option_id}
                {isSel && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Option Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={opt.option_id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`rounded-2xl border p-4 bg-gradient-to-br from-[#0c0c10] to-[#08080a] shadow-2xl ${
            isSelected ? "border-orange-500/80" : "border-white/10"
          }`}
        >
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black border border-white/10 text-orange-500">
                PROJECT TARGET 0{opt.option_id}
              </span>
              {isSelected && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold uppercase">
                  <CheckCircle className="w-3 h-3" /> LOCKED PIPELINE
                </span>
              )}
              <h4 className="font-sans text-lg font-bold text-white tracking-tight">{opt.title}</h4>
            </div>
            <button
              onClick={() => onSelectOption(opt)}
              className={`flex items-center gap-2 py-2 px-5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-orange-600 hover:bg-orange-500 text-white"
                  : "bg-black hover:bg-white/5 border border-white/10 text-slate-300 hover:border-orange-500/40"
              }`}
            >
              {isSelected ? "Locked: Proceed to Phase 2" : "Select & Lock Cosmology"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* LEFT: Tabbed story info */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* Tabs */}
              <div className="flex border border-white/10 rounded-lg overflow-hidden bg-black/40">
                <button
                  onClick={() => setLeftTab("env")}
                  className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    leftTab === "env" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Environment
                </button>
                <button
                  onClick={() => setLeftTab("dialectic")}
                  className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border-l border-white/10 ${
                    leftTab === "dialectic" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Dialectic
                </button>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {leftTab === "env" ? (
                  <motion.div
                    key="env"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 text-xs font-mono"
                  >
                    <span className="font-mono text-[9px] text-orange-500 tracking-wider uppercase font-bold block">McKee Story Environment</span>
                    <div className="grid grid-cols-2 gap-3 text-slate-300">
                      <div>
                        <span className="text-gray-500 block text-[9px] mb-0.5">PERIOD / ERA</span>
                        <span className="text-slate-200 text-[11px]">{setting.dimensions.period}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] mb-0.5">DURATION</span>
                        <span className="text-slate-200 text-[11px]">{setting.dimensions.duration}</span>
                      </div>
                      <div className="col-span-2 border-t border-white/5 pt-2">
                        <span className="text-gray-500 block text-[9px] mb-0.5">DOMINANT CONFLICT</span>
                        <span className="text-slate-200 text-[11px]">{setting.dimensions.conflict_level}</span>
                      </div>
                      <div className="col-span-2 border-t border-white/5 pt-2">
                        <span className="text-gray-500 block text-[9px] mb-0.5">CREATIVE LIMITATION</span>
                        <span className="text-slate-300 italic text-[11px]">{setting.creative_limitation}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="dialectic"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
                  >
                    <span className="font-mono text-[9px] text-orange-500 tracking-wider uppercase font-bold block">Controlling Idea & Dialectic</span>
                    <p className="text-slate-200 font-sans italic leading-relaxed text-[11px]">
                      "{meaning.controlling_idea}"
                    </p>
                    <div className="bg-black/40 p-3 rounded-lg text-[11px] font-mono space-y-2 border border-white/5">
                      <div>
                        <span className="text-emerald-500 font-bold block text-[9px] mb-0.5">+ POSITIVE</span>
                        <p className="text-slate-300">{meaning.dialectical_debate.positive_idea}</p>
                      </div>
                      <div className="border-t border-white/5 pt-2">
                        <span className="text-red-500 font-bold block text-[9px] mb-0.5">- NEGATIVE</span>
                        <p className="text-slate-300">{meaning.dialectical_debate.negative_counter_idea}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT: Character carousel */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-orange-500 tracking-wider uppercase font-bold">
                  Character Profiles & Audio Telemetry
                </span>
                {characters.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveCharIndex((i) => Math.max(0, i - 1))}
                      disabled={activeCharIndex === 0}
                      className="p-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-25 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                    {characters.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCharIndex(i)}
                        className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all cursor-pointer border ${
                          activeCharIndex === i
                            ? "bg-orange-600 border-orange-500 text-white"
                            : "bg-black/40 border-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {c.identity.name || `Char ${i + 1}`}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveCharIndex((i) => Math.min(characters.length - 1, i + 1))}
                      disabled={activeCharIndex === characters.length - 1}
                      className="p-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-25 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  </div>
                )}
              </div>

              {/* Single character card */}
              {char && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="bg-black/50 p-4 rounded-2xl border border-white/10 text-xs space-y-3"
                  >
                    {/* Character header */}
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <div>
                        <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest block">{char.identity.cast_orbit}</span>
                        <span className="font-bold text-slate-100 text-sm tracking-tight">{char.identity.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/20 text-orange-400 border border-orange-900/40 uppercase">
                        {char.identity.archetype}
                      </span>
                    </div>

                    {/* Audio specs row — two columns */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Casting */}
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 uppercase font-bold">
                          <Fingerprint className="w-3 h-3 text-orange-500" />
                          Casting Guide
                        </div>
                        <div className="space-y-1.5 text-[10px]">
                          <div>
                            <span className="text-gray-500 block text-[9px]">Sonic Anchor</span>
                            <span className="text-slate-200">{char.audio.voice_identity.sonic_anchor}</span>
                          </div>
                          <div className="border-t border-white/5 pt-1.5">
                            <span className="text-gray-500 block text-[9px]">Timbre</span>
                            <span className="text-slate-300 italic">"{char.audio.performance_styling.timbre}"</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[9px]">Tempo</span>
                            <span className="text-slate-300 italic">{char.audio.performance_styling.tempo}</span>
                          </div>
                        </div>
                      </div>

                      {/* ElevenLabs sliders */}
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 uppercase font-bold">
                          <Sliders className="w-3 h-3 text-emerald-400" />
                          ElevenLabs Sliders
                        </div>
                        <div className="space-y-2 text-[10px]">
                          {[
                            { label: "Stability", value: char.audio.state_telemetry.neutral_state.stability, color: "bg-emerald-500", textColor: "text-emerald-400" },
                            { label: "Similarity Boost", value: char.audio.state_telemetry.neutral_state.similarity_boost, color: "bg-emerald-500", textColor: "text-emerald-400" },
                            { label: "Style Exaggeration", value: char.audio.state_telemetry.neutral_state.style_exaggeration, color: "bg-yellow-500", textColor: "text-yellow-500" },
                          ].map(({ label, value, color, textColor }) => (
                            <div key={label}>
                              <div className="flex justify-between text-slate-400 mb-1">
                                <span className="text-[9px]">{label}</span>
                                <span className={`${textColor} font-bold text-[9px]`}>{value}%</span>
                              </div>
                              <div className="w-full bg-white/5 h-0.5 rounded-full overflow-hidden">
                                <div className={`${color} h-full rounded-full`} style={{ width: `${value}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Monologue preview — single truncated line */}
                    <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] uppercase font-mono text-gray-500 block">Worldview Monologue</span>
                        <p className={`text-[10px] mt-0.5 italic font-sans ${playingMonologueCharId === char.id ? "text-slate-200 animate-pulse" : "text-slate-500 truncate"}`}>
                          "{char.audio.monologue_script || "No seed worldview written yet."}"
                        </p>
                      </div>
                      <button
                        onClick={() => setPlayingMonologueCharId(playingMonologueCharId === char.id ? null : char.id)}
                        className="shrink-0 px-2.5 py-1 text-[9px] font-mono bg-orange-600 hover:bg-orange-500 text-white rounded flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        {playingMonologueCharId === char.id ? "Pause" : "Simulate"}
                      </button>
                    </div>

                    {/* Kinetics row — 3 columns inline */}
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-0.5">
                        <span className="text-gray-500 font-mono text-[8px] uppercase block">Gait & Posture</span>
                        <span className="text-slate-200 font-medium leading-tight">{char.kinetics.posture}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-0.5">
                        <span className="text-gray-500 font-mono text-[8px] uppercase block">Physical Tics</span>
                        <span className="text-slate-200 font-medium leading-tight">{char.kinetics.gesture_vocabulary}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-0.5">
                        <span className="text-gray-500 font-mono text-[8px] uppercase block">Response Latency</span>
                        <span className="text-orange-400 font-mono font-bold text-[11px]">{char.kinetics.reaction_tempo}</span>
                      </div>
                    </div>

                    {/* Psychology — 2 columns */}
                    <div className="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-[10px]">
                      <div>
                        <span className="text-gray-500 block font-mono uppercase text-[8px] mb-0.5">Core & Personal</span>
                        <p className="text-slate-300 font-medium leading-snug">{char.psychology.social}</p>
                        <p className="text-slate-500 text-[9px] mt-0.5">{char.psychology.core}</p>
                      </div>
                      <div>
                        <span className="text-orange-500 block font-mono uppercase text-[8px] mb-0.5">Hidden Trauma</span>
                        <p className="text-orange-400 font-medium leading-snug">{char.psychology.hidden}</p>
                        <p className="text-slate-500 text-[9px] mt-0.5">{char.psychology.personal}</p>
                      </div>
                    </div>

                    {/* Style Lock — collapsible */}
                    <div className="bg-black/30 border border-white/5 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedVisualsCharId(expandedVisualsCharId === char.id ? null : char.id)}
                        className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors text-left font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-orange-400" />
                          Style Lock & Prompting Spec (Visuals)
                        </span>
                        <span className="text-orange-500 text-[9px]">
                          {expandedVisualsCharId === char.id ? "[ Hide ]" : "[ Expand ]"}
                        </span>
                      </button>

                      {expandedVisualsCharId === char.id && (
                        <div className="p-3 border-t border-white/5 bg-black/50 space-y-3 text-[11px] leading-relaxed">
                          <div>
                            <span className="text-gray-500 block uppercase font-mono text-[9px] mb-1">Material & Lighting Textures</span>
                            <div className="text-slate-200 p-2 rounded bg-black/60 border border-white/5 italic">
                              "{char.visuals.material_texture}"
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-500 block uppercase font-mono text-[9px] mb-1">Outer Mask Wardrobe</span>
                              <div className="text-slate-300 p-2 rounded bg-black/40 border border-white/5 text-[10px]">
                                {char.visuals.wardrobe.outer_mask}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 block uppercase font-mono text-[9px] mb-1">Inner Vulnerability</span>
                              <div className="text-slate-300 p-2 rounded bg-black/40 border border-white/5 text-[10px] italic text-slate-400">
                                {char.visuals.wardrobe.inner_vulnerability}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-orange-400 font-mono text-[9px] uppercase">Midjourney Master Grid Prompt</span>
                              <button
                                onClick={() => {
                                  const txt = char.prompts?.master_visual_reference?.master_grid_prompt || "";
                                  navigator.clipboard.writeText(txt);
                                  setCopiedCharId(char.id);
                                  setTimeout(() => setCopiedCharId(null), 2000);
                                }}
                                className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 hover:bg-orange-600 hover:text-white border border-white/10 text-slate-400 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {copiedCharId === char.id ? (
                                  <><CheckCircle className="w-3 h-3 text-emerald-400" />Copied!</>
                                ) : (
                                  <><Copy className="w-3 h-3 text-orange-500" />Copy</>
                                )}
                              </button>
                            </div>
                            <div className="p-2 rounded bg-black border border-white/10 font-mono text-[10px] text-orange-500/95 overflow-x-auto whitespace-pre-wrap leading-normal">
                              {char.prompts?.master_visual_reference?.master_grid_prompt}
                            </div>
                          </div>
                          {char.visuals.negative_prompt && (
                            <div>
                              <span className="text-gray-500 block uppercase font-mono text-[9px] mb-0.5">Negative Prompts</span>
                              <span className="text-red-400/90 font-mono text-[10px]">{char.visuals.negative_prompt}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
