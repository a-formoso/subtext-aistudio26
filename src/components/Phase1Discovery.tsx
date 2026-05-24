import { useState, useEffect } from "react";
type VoidFunction = () => void;
import { StoryOption } from "../types";
import { PRESEEDED_OPTIONS } from "../preseededData";
import { Sparkles, ArrowRight, HelpCircle, Edit3, CheckCircle, Volume2, Fingerprint, Sliders, PlayCircle, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
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

  // Active playing speech preview state for actors
  const [playingMonologueCharId, setPlayingMonologueCharId] = useState<string | null>(null);
  const [expandedVisualsCharId, setExpandedVisualsCharId] = useState<string | null>(null);
  const [copiedCharId, setCopiedCharId] = useState<string | null>(null);
  const [activeCharIndex, setActiveCharIndex] = useState<number>(0);

  useEffect(() => {
    if (selectedOptionId) {
      setActiveOptionId(selectedOptionId);
    }
  }, [selectedOptionId]);

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
      } else {
        // Fall back to preseeded and show API notice
        setErrorInfo(data.message || "Failed to generate story options. Loaded presealed high-fidelity screenplay targets.");
        setOptions(PRESEEDED_OPTIONS);
      }
    } catch (e: any) {
      setErrorInfo("Could not connect to the Express server to reach Gemini API. Ensure server is active and secrets are loaded.");
      setOptions(PRESEEDED_OPTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Narrative Premise Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-md pb-[26px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">
              Establishing Cosmology
            </span>
            <h2 className="text-xl md:text-2xl font-sans font-medium text-slate-100 mt-1">
              Active Narrative Premise
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingPremise(!isEditingPremise)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-mono transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditingPremise ? "Lock Premise" : "Customize Premise"}
            </button>
            <button
              onClick={handleGenerateOptions}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs text-white font-mono font-bold transition-all shadow-lg shadow-orange-950/30 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isLoading ? "Consulting AI..." : "Re-generate with Gemini"}
            </button>
          </div>
        </div>

        {isEditingPremise ? (
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            className="w-full h-24 p-3 bg-black/80 border border-orange-500/30 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
          />
        ) : (
          <p className="text-slate-300 text-sm md:text-base leading-relaxed italic border-l-2 border-orange-500 pl-4 py-1">
            "{premise}"
          </p>
        )}

        {errorInfo && (
          <div className="mt-4 p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/25 text-yellow-500 text-xs leading-normal">
            <strong>System Notice:</strong> {errorInfo}
          </div>
        )}
      </div>

      {/* Narrative Options Listing */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-sans text-lg font-medium text-slate-100">
              Phase 1: Story Cosmology Options
            </h3>
            <p className="font-sans text-xs text-slate-400 mt-1">
              Select other projects into view via the selector below, then click "Select cosmology options" to lock it.
            </p>
          </div>
          
          {/* Horizontal tab selector for projects */}
          <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
            {options.map((opt) => {
              const isActive = activeOptionId === opt.option_id;
              const isSelected = selectedOptionId === opt.option_id;
              return (
                <button
                  key={opt.option_id}
                  onClick={() => setActiveOptionId(opt.option_id)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-orange-600 text-white shadow-md shadow-orange-950/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className="opacity-70">Option 0{opt.option_id}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Project Dynamic Viewport */}
        {(() => {
          const opt = options.find((o) => o.option_id === activeOptionId) || options[0];
          if (!opt) return null;
          const isSelected = selectedOptionId === opt.option_id;

          const setting = getStorySetting(opt);
          const meaning = getStoryMeaning(opt);
          const characters = getStoryCharacters(opt);

          return (
            <motion.div
              key={opt.option_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`rounded-2xl border p-6 md:p-8 bg-gradient-to-br from-[#0c0c10] to-[#08080a] shadow-2xl transition-all duration-300 ${
                isSelected
                  ? "border-orange-500/80 shadow-orange-950/10"
                  : "border-white/10"
              }`}
            >
              {/* Top Meta Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black border border-white/10 text-orange-500">
                      PROJECT TARGET 0{opt.option_id}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3.5 h-3.5" /> LOCKED PIPELINE
                      </span>
                    )}
                  </div>
                  <h4 className="font-display text-2xl font-bold text-white tracking-tight mt-2">
                    {opt.title}
                  </h4>
                </div>

                <button
                  onClick={() => onSelectOption(opt)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-6 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-lg ${
                    isSelected
                      ? "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/30"
                      : "bg-black hover:bg-white/5 border border-white/10 text-slate-300 hover:border-orange-500/40"
                  }`}
                >
                  {isSelected ? "Locked Cosmology: Proceed to Phase 2" : "Select & Lock Cosmology Options"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Bento Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                
                {/* Left Side: Parameters, Controlling Idea & Dialectic (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Dynamic Environment Specs */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4">
                    <span className="font-mono text-[9px] text-orange-500 tracking-wider uppercase font-bold block">
                      McKee Story Environment Dimensions
                    </span>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-300">
                      <div>
                        <span className="text-gray-500 block text-[10px] mb-1">PERIOD / ERA:</span>
                        <span className="text-slate-200">{setting.dimensions.period}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] mb-1">DURATION SCAPE:</span>
                        <span className="text-slate-200">{setting.dimensions.duration}</span>
                      </div>
                      <div className="col-span-2 border-t border-white/5 pt-3 mt-1">
                        <span className="text-gray-500 block text-[10px] mb-1">DOMINANT CONFLICT:</span>
                        <span className="text-slate-200">{setting.dimensions.conflict_level}</span>
                      </div>
                    </div>
                  </div>

                  {/* Playbook dialectical debate */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4">
                    <span className="font-mono text-[9px] text-orange-500 tracking-wider uppercase font-bold block">
                      McKee Controlling Idea & Dialectical Debate
                    </span>
                    
                    <div>
                      <span className="text-gray-500 block text-[10px] mb-1 font-mono">CONTROLLING IDEA:</span>
                      <p className="text-slate-200 font-sans italic leading-relaxed text-sm">
                        "{meaning.controlling_idea}"
                      </p>
                    </div>

                    <div className="bg-black/40 p-3.5 rounded-lg text-xs font-mono space-y-2.5 border border-white/5 mt-2">
                      <div>
                        <span className="text-emerald-500 font-bold block text-[10px] mb-0.5">+ POSITIVE CHARGE:</span>
                        <p className="text-slate-300 leading-normal">{meaning.dialectical_debate.positive_idea}</p>
                      </div>
                      <div className="border-t border-white/5 pt-2">
                        <span className="text-red-500 font-bold block text-[10px] mb-0.5">- NEGATIVE CHARGE:</span>
                        <p className="text-slate-300 leading-normal">{meaning.dialectical_debate.negative_counter_idea}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Stanislavskian Actor Character Sheets & Digital Audio Telemetry (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <span className="font-mono text-[9px] text-orange-500 tracking-wider uppercase font-bold block pl-1">
                    3D virtual production character profiles & audio telemetry
                  </span>

                  {/* Character carousel nav */}
                  {characters.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveCharIndex((i) => Math.max(0, i - 1))}
                        disabled={activeCharIndex === 0}
                        className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-300" />
                      </button>
                      <div className="flex items-center gap-1.5 flex-1">
                        {characters.map((c, i) => (
                          <button
                            key={c.id}
                            onClick={() => setActiveCharIndex(i)}
                            className={`flex-1 px-2 py-1.5 rounded-lg font-mono text-[10px] font-bold truncate transition-all cursor-pointer border ${
                              activeCharIndex === i
                                ? "bg-orange-600 border-orange-500 text-white"
                                : "bg-black/40 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                            }`}
                          >
                            {c.identity.name || `Character ${i + 1}`}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveCharIndex((i) => Math.min(characters.length - 1, i + 1))}
                        disabled={activeCharIndex === characters.length - 1}
                        className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {characters.filter((_, i) => i === activeCharIndex).map((char) => (
                      <motion.div
                        key={char.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                      <div key={char.id} className="bg-black/50 p-5 rounded-2xl border border-white/10 flex flex-col justify-between text-xs space-y-4">
                        
                        {/* Title Section */}
                        <div className="flex justify-between items-start pb-3 border-b border-white/5">
                          <div>
                            <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest block mb-0.5">{char.identity.cast_orbit}</span>
                            <span className="font-bold text-slate-100 text-base tracking-tight">{char.identity.name}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-orange-950/20 text-orange-400 border border-orange-900/40 uppercase">
                            {char.identity.archetype}
                          </span>
                        </div>

                        {/* Interactive Character Audio Specs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Column A: Casting Anchor & Creative Guidelines */}
                          <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 uppercase font-bold">
                              <Fingerprint className="w-3.5 h-3.5 text-orange-500" />
                              Casting & Performance Guide
                            </div>
                            
                            <div className="space-y-2 text-[11px]">
                              <div>
                                <span className="text-gray-500 block uppercase font-mono text-[9px]">Sonic Casting Anchor:</span>
                                <span className="text-slate-200 font-medium">{char.audio.voice_identity.sonic_anchor}</span>
                              </div>
                              <div className="border-t border-white/5 pt-2">
                                <span className="text-gray-500 block uppercase font-mono text-[9px]">Base Timbre:</span>
                                <span className="text-slate-300 italic">"{char.audio.performance_styling.timbre}"</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block uppercase font-mono text-[9px]">Speech Tempo:</span>
                                <span className="text-slate-300 italic">{char.audio.performance_styling.tempo}</span>
                              </div>
                            </div>
                          </div>

                          {/* Column B: Programmatic ElevenLabs API Configuration */}
                          <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase font-bold">
                              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                              ElevenLabs API Configuration Sliders
                            </div>

                            <div className="space-y-2.5 text-[10px]">
                              {/* Stability */}
                              <div>
                                <div className="flex justify-between text-slate-400 mb-1">
                                  <span>Stability (Neutral vs unstable):</span>
                                  <span className="text-emerald-400 font-bold">{char.audio.state_telemetry.neutral_state.stability}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${char.audio.state_telemetry.neutral_state.stability}%` }}
                                  />
                                </div>
                              </div>

                              {/* Similarity */}
                              <div>
                                <div className="flex justify-between text-slate-400 mb-1">
                                  <span>Cloning Similarity Boost:</span>
                                  <span className="text-emerald-400 font-bold">{char.audio.state_telemetry.neutral_state.similarity_boost}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${char.audio.state_telemetry.neutral_state.similarity_boost}%` }}
                                  />
                                </div>
                              </div>

                              {/* Style Exaggeration */}
                              <div>
                                <div className="flex justify-between text-slate-400 mb-1">
                                  <span>Theatrical Style Exaggeration:</span>
                                  <span className="text-yellow-500 font-bold">{char.audio.state_telemetry.neutral_state.style_exaggeration}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-yellow-500 h-full rounded-full"
                                    style={{ width: `${char.audio.state_telemetry.neutral_state.style_exaggeration}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Voice Monologue Preview */}
                        <div className="rounded-xl border border-white/5 bg-black/30 p-3 flex items-center justify-between">
                          <div className="flex-1 pr-4">
                            <span className="text-[9px] uppercase font-mono text-gray-500 block">Worldview monologue script preview</span>
                            {playingMonologueCharId === char.id ? (
                              <p className="text-[11px] text-slate-200 mt-1 italic animate-pulse leading-normal font-sans">
                                "{char.audio.monologue_script}"
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-500 mt-1 italic font-sans truncate">
                                "{char.audio.monologue_script || "No seed worldview written yet."}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (playingMonologueCharId === char.id) {
                                setPlayingMonologueCharId(null);
                              } else {
                                setPlayingMonologueCharId(char.id);
                              }
                            }}
                            className="p-1 px-3 text-[10px] font-mono bg-orange-600 hover:bg-orange-500 text-white rounded flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            {playingMonologueCharId === char.id ? "Pause Voice" : "Simulate Synth"}
                          </button>
                        </div>

                        {/* Style Lock Spec Drawer & Grid */}
                        <div className="bg-black/30 border border-white/5 rounded-xl overflow-hidden transition-all duration-300">
                          <button
                            onClick={() => {
                              setExpandedVisualsCharId(expandedVisualsCharId === char.id ? null : char.id);
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                              Style Lock & Prompting Spec Panel (Visuals)
                            </span>
                            <span className="text-orange-500 font-mono text-[9px] hover:underline">
                              {expandedVisualsCharId === char.id ? "[ Hide Visual Spec ]" : "[ Expand Visual Spec ]"}
                            </span>
                          </button>

                          {expandedVisualsCharId === char.id && (
                            <div className="p-3.5 border-t border-white/5 bg-black/50 space-y-3.5 text-[11px] leading-relaxed">
                              {/* Material Textures details */}
                              <div>
                                <span className="text-gray-500 block uppercase font-mono text-[9px] tracking-wider mb-1">Renderer Material & Lighting Textures:</span>
                                <div className="text-slate-200 p-2.5 rounded bg-black/60 border border-white/5 font-sans italic">
                                  "{char.visuals.material_texture}"
                                </div>
                              </div>

                              {/* Wardrobe Specifications */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-gray-500 block uppercase font-mono text-[9px] tracking-wider mb-1">Outer Mask Wardrobe:</span>
                                  <div className="text-slate-300 p-2 rounded bg-black/40 border border-white/5 text-[10.5px]">
                                    {char.visuals.wardrobe.outer_mask}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500 block uppercase font-mono text-[9px] tracking-wider mb-1">Inner Vulnerability & Acc:</span>
                                  <div className="text-slate-300 p-2 rounded bg-black/40 border border-white/5 text-[10.5px] italic text-slate-400">
                                    {char.visuals.wardrobe.inner_vulnerability} • {char.visuals.wardrobe.accessories}
                                  </div>
                                </div>
                              </div>

                              {/* Master Prompt with Copy button */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-orange-400 font-mono text-[9px] uppercase tracking-wider">Midjourney Master Grid Turn-Around Prompt:</span>
                                  <button
                                    onClick={() => {
                                      const promptText = char.prompts?.master_visual_reference?.master_grid_prompt || "";
                                      navigator.clipboard.writeText(promptText);
                                      setCopiedCharId(char.id);
                                      setTimeout(() => setCopiedCharId(null), 2000);
                                    }}
                                    className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 hover:bg-orange-600 hover:text-white border border-white/10 text-slate-400 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedCharId === char.id ? (
                                      <>
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-orange-500" />
                                        Copy Code
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-2.5 rounded bg-black border border-white/10 font-mono text-[10px] text-orange-500/95 overflow-x-auto select-all whitespace-pre-wrap leading-normal">
                                  {char.prompts?.master_visual_reference?.master_grid_prompt}
                                </div>
                              </div>

                              {/* Exclude items (Negative prompt) */}
                              {char.visuals.negative_prompt && (
                                <div>
                                  <span className="text-gray-500 block uppercase font-mono text-[9px] tracking-wider mb-0.5">Negative Prompts (Negative Weighting Spec):</span>
                                  <span className="text-red-400/90 font-mono text-[10px]">{char.visuals.negative_prompt}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Physical Expression Palette (Kinetics Grid) */}
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                            Physical Expression Palette (Motion Profile)
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-[11px] leading-relaxed">
                            {/* Column 1: Gait & Posture */}
                            <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 space-y-1">
                              <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider block">Gait & Posture</span>
                              <span className="text-slate-200 font-medium">{char.kinetics.posture}</span>
                              <p className="text-slate-400 text-[10px] leading-normal">{char.kinetics.gait} • {char.kinetics.weight_distribution}</p>
                            </div>

                            {/* Column 2: Physical Tics */}
                            <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 space-y-1">
                              <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider block">Physical Tics & Micros</span>
                              <span className="text-slate-200 font-medium">{char.kinetics.gesture_vocabulary}</span>
                              <p className="text-slate-400 text-[10px] leading-normal">{char.kinetics.micro_movements}</p>
                            </div>

                            {/* Column 3: Response Latency */}
                            <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 space-y-1">
                              <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider block">Response Latency</span>
                              <span className="text-orange-400 font-mono font-bold tracking-tight block text-sm mt-0.5">{char.kinetics.reaction_tempo}</span>
                              <span className="text-gray-500 font-mono text-[8px] uppercase">Processing Delay</span>
                            </div>
                          </div>
                        </div>

                        {/* Psychological Triad */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5 text-[10px] leading-relaxed">
                          <div>
                            <span className="text-gray-500 block font-mono uppercase tracking-wider text-[9px]">McKee Core & Personal Dimension</span>
                            <p className="text-slate-300 font-medium">{char.psychology.social}</p>
                            <p className="text-slate-400 mt-0.5 text-[9.5px]">True Self: {char.psychology.core}</p>
                          </div>
                          <div>
                            <span className="text-orange-500 block font-mono uppercase tracking-wider text-[9px]">Unconscious Hidden Trauma Need</span>
                            <span className="text-orange-400 font-medium">{char.psychology.hidden}</span>
                            <p className="text-slate-400 mt-0.5 text-[9.5px]">Intimate Mask: {char.psychology.personal}</p>
                          </div>
                        </div>

                      </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          );
        })()}
      </div>
    </div>
  );
}
