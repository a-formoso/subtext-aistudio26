import { useState, useEffect } from "react";
import { StoryOption, Blueprint, BeatSheet, SubtextualBeat } from "../types";
import { PRESEEDED_BLUEPRINT } from "../preseededData";
import { GreenhouseVisualizer } from "./GreenhouseVisualizer";
import { Sparkles, Milestone, Compass, Activity, ArrowRight, Play, Eye, Sliders, Music, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getBlueprintSequences, 
  getBlueprintBeats, 
  getBlueprintLogline,
  getStoryCharacters 
} from "../utils/schemaConverter";

interface Phase2BlueprintProps {
  chosenOption?: StoryOption;
  onSelectBlueprint: (blueprint: Blueprint) => void;
  selectedBlueprint?: Blueprint;
}

export function Phase2Blueprint({ chosenOption, onSelectBlueprint, selectedBlueprint }: Phase2BlueprintProps) {
  const [blueprint, setBlueprint] = useState<Blueprint>(selectedBlueprint || PRESEEDED_BLUEPRINT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Keep track of active scene and active beat for visual greenhouse simulation
  const [selectedSceneNumber, setSelectedSceneNumber] = useState(1);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);

  // Trigger Gemini to expand chosen option into comprehensive blueprint
  const handleGenerateBlueprint = async () => {
    if (!chosenOption) return;
    setIsLoading(true);
    setErrorInfo(null);
    try {
      const resp = await fetch("/api/generate-phase2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosenOption }),
      });
      const data = await resp.json();
      if (data.success && data.blueprint) {
        setBlueprint(data.blueprint);
        onSelectBlueprint(data.blueprint);
        setSelectedSceneNumber(1);
        setActiveBeatIndex(0);
      } else {
        setErrorInfo(data.message || "Could not generate fully customized blueprint. Rendering Preseeded High-Fidelity Blueprint.");
        setBlueprint(PRESEEDED_BLUEPRINT);
        onSelectBlueprint(PRESEEDED_BLUEPRINT);
      }
    } catch (e: any) {
      setErrorInfo("Vite Dev Server Gemini Endpoint failed. Rendered high-fidelity Preseeded structural maps.");
      setBlueprint(PRESEEDED_BLUEPRINT);
      onSelectBlueprint(PRESEEDED_BLUEPRINT);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync state if chosenOption changes or selections occur
  useEffect(() => {
    if (chosenOption && chosenOption.title !== blueprint.title) {
      // If we swapped options in Phase 1, reset back to target title
      setBlueprint({
        ...PRESEEDED_BLUEPRINT,
        title: chosenOption.title,
        setting: chosenOption.setting,
        meaning: chosenOption.meaning,
        characters: chosenOption.characters,
      });
    }
  }, [chosenOption]);

  const convertedSequences = getBlueprintSequences(blueprint);
  const convertedBeats = getBlueprintBeats(blueprint);
  const mappedLogline = getBlueprintLogline(blueprint);
  const characterProfiles = getStoryCharacters(blueprint as any);

  // Gather sequence categories for display
  const sequences = [
    ...(convertedSequences.act_one_sequences || []),
    ...(convertedSequences.act_two_sequences || []),
    ...(convertedSequences.act_three_sequences || [])
  ];

  // Get active scene object
  const activeSceneObject = sequences
    .flatMap(s => s.scenes)
    .find(sc => sc.scene_number === selectedSceneNumber);

  // Get active beats for active scene
  const activeBeatSheet = convertedBeats.find(
    sheet => sheet.scene_number === selectedSceneNumber
  );

  const activeBeats: SubtextualBeat[] = activeBeatSheet?.micro_blueprint?.subtextual_beat_progression || [];
  const currentBeat: SubtextualBeat | undefined = activeBeats[activeBeatIndex] || activeBeats[0];

  // Determine active speaker voice profile and ElevenLabs slider telemetry
  const getBeatVocalTelemetry = () => {
    if (!currentBeat) return null;
    
    // Guess character based on action text like "char_1: doing x" or "Cillian:"
    const textLower = (currentBeat.action || "").toLowerCase();
    const speaker = characterProfiles.find(char => 
      textLower.includes(char.id.toLowerCase()) || 
      textLower.includes((char.identity.name || "").toLowerCase().split(" ")[0])
    ) || characterProfiles[0];

    if (!speaker) return null;

    const vocalStateKey = (currentBeat.vocal_state || "neutral_state") as "neutral_state" | "tension_state" | "panic_state";
    const baseState = speaker.audio.state_telemetry[vocalStateKey] || speaker.audio.state_telemetry.neutral_state;

    return {
      characterName: speaker.identity.name,
      voiceCloneId: speaker.audio.voice_identity.voice_clone_id,
      stateLabel: vocalStateKey.replace("_", " ").toUpperCase(),
      stability: baseState.stability,
      similarity_boost: baseState.similarity_boost,
      style_exaggeration: (baseState as any).style_exaggeration || 15,
      stress_cues: baseState.stress_cues
    };
  };

  const activeVocalTelemetry = getBeatVocalTelemetry();

  // Calculate stress level dynamically based on current beat
  const getDynamicStress = (beatText?: string, beatNo?: number): number => {
    if (!beatText) return 10;
    const matches = beatText.match(/(\d+)\s*bpm/i);
    if (matches && matches[1]) {
      const bpm = parseInt(matches[1]);
      return Math.min(Math.max(Math.round(((bpm - 70) / 70) * 90 + 10), 0), 100);
    }
    if (beatNo === 1) return 20;
    if (beatNo === 2) return 40;
    if (beatNo === 3) return 60;
    if (beatNo === 4) return 75;
    if (beatNo === 5) return 88;
    if (beatNo === 6) return 98;
    return 85; 
  };

  const stressPercentage = currentBeat ? getDynamicStress(currentBeat.status, currentBeat.beat_number) : 15;

  return (
    <div className="space-y-8">
      {/* Blueprint Control Bar */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">
            Phase 2 Pipeline
          </span>
          <h2 className="text-xl md:text-2xl font-sans font-medium text-slate-100 mt-1">
            Pre-Production Script Blueprint
          </h2>
          <p className="font-sans text-xs text-slate-400 mt-1 block">
            Locked Title: <strong className="text-orange-450">"{blueprint.title}"</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateBlueprint}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs text-white font-mono font-bold transition-all shadow-lg shadow-orange-950/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? "Compiling Blueprint Map..." : "Expand Blueprint with Gemini AI"}
          </button>
        </div>
      </div>

      {errorInfo && (
        <div className="p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/25 text-yellow-500 text-xs font-mono">
          <strong>Backend Notice:</strong> {errorInfo}
        </div>
      )}

      {/* Main Structural Layout split-screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sequence & Act Board - Left Panels */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Milestone className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-mono uppercase font-bold text-slate-300">
                McKee Vertical Act & Sequence Timeline
              </h3>
            </div>

            <div className="relative border-l border-white/10 pl-6 ml-2 space-y-6">
              {sequences.map((seq) => {
                if (!seq) return null;
                const isActOne = seq.actLabel?.toUpperCase().includes("SETUP") || seq.act === "ACT ONE";
                const isActThree = seq.actLabel?.toUpperCase().includes("RESOLUTION") || seq.act === "ACT THREE";
                const colorBadge = isActOne 
                  ? "bg-blue-950/40 text-blue-400 border-blue-900/50" 
                  : isActThree 
                  ? "bg-red-950/40 text-red-400 border-red-900/50"
                  : "bg-orange-950/40 text-orange-400 border-orange-900/50";

                return (
                  <div key={seq.sequence_id} className="relative group">
                    {/* Time indicator rod */}
                    <div className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-slate-800 border-2 border-slate-950 group-hover:bg-orange-500 transition-colors" />

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className={`px-2 py-0.5 rounded-full border ${colorBadge} font-bold`}>
                          {seq.act} : {seq.actLabel}
                        </span>
                        <span className="text-slate-500">{seq.sequence_id}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-orange-450">{seq.themeFocus}</span>
                      </div>

                      <h4 className="text-sm font-sans font-bold text-slate-100 group-hover:text-orange-400 transition-colors">
                        {seq.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal">
                        {seq.dramatic_arc}
                      </p>

                      {/* Interactive Scene cards within sequences */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {seq.scenes?.map((scene) => {
                          const isActive = selectedSceneNumber === scene.scene_number;
                          return (
                            <button
                              key={scene.scene_number}
                              onClick={() => {
                                setSelectedSceneNumber(scene.scene_number);
                                setActiveBeatIndex(0);
                              }}
                              className={`text-left rounded-lg p-3 border transition-all cursor-pointer ${
                                isActive
                                  ? "border-orange-500 bg-orange-950/10"
                                  : "border-white/10 bg-black/60 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                                <span className={isActive ? "text-orange-400" : "text-slate-500"}>
                                  SCENE {scene.scene_number}
                                </span>
                                <span className="text-[9px] text-slate-400 bg-black border border-white/10 px-1 rounded uppercase">
                                  {scene.opening_value ? scene.opening_value.split(" ")[0] : "Value"}
                                </span>
                              </div>
                              <h5 className="text-xs font-sans font-medium text-slate-200 line-clamp-1">
                                {scene.setting_micro}
                              </h5>
                              <p className="text-[11px] text-slate-400 leading-normal mt-1 line-clamp-2">
                                {scene.scene_objective}
                              </p>
                              {isActive && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-orange-400 font-mono font-bold">
                                  <Eye className="w-3 h-3 animate-pulse" /> Simulating Spores
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Logline Display */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mt-4">
            <h4 className="font-sans text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              ★ The Master McKee Logline
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed italic pr-2 font-sans">
              "{mappedLogline}"
            </p>
          </div>
        </div>

        {/* Subtext Beat Sheet & Live Telemetry Glassware - Right Panel */}
        <div className="space-y-6">
          
          {/* Greenhouse Visualizer telemetry */}
          <GreenhouseVisualizer
            stressLevel={stressPercentage}
            activeFlora={currentBeat?.visual_flora || "Luminescent orchids suspended in high-altitude canisters."}
            activeStatus={currentBeat?.status || "Stable resting heartbeat."}
          />

          {/* Vocal Stress Real-time ElevenLabs API telemetry */}
          {activeVocalTelemetry && (
            <div className="rounded-xl border border-white/10 bg-gradient-to-r from-orange-950/10 to-black/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-mono uppercase font-bold text-slate-300">
                    Live Vocal Stress Telemetry
                  </h3>
                </div>
                <span className="font-mono text-[9px] bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40">
                  {activeVocalTelemetry.stateLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono leading-relaxed text-slate-300">
                <div>
                  <span className="text-gray-500 block text-[9px]">SPEAKER:</span>
                  <span className="font-bold text-slate-200">{activeVocalTelemetry.characterName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">VOICE ID:</span>
                  <span className="text-slate-400 text-[10px] truncate block">{activeVocalTelemetry.voiceCloneId}</span>
                </div>
              </div>

              {/* Slider telemetry gauges representing scene-by-scene audio updates */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Stability Target:</span>
                    <span className="text-emerald-400 font-bold">{activeVocalTelemetry.stability}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${activeVocalTelemetry.stability}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Style Exaggeration:</span>
                    <span className="text-yellow-500 font-bold">{activeVocalTelemetry.style_exaggeration}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-yellow-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${activeVocalTelemetry.style_exaggeration}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-lg border border-white/5 text-[10px] font-sans leading-relaxed text-slate-400 italic">
                <strong className="text-orange-400 font-mono text-[9px] uppercase block not-italic mb-1">Active Stress Cues:</strong>
                "{activeVocalTelemetry.stress_cues}"
              </div>
            </div>
          )}

          {/* Subtextual Beat Sheets progression control */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-mono uppercase font-bold text-slate-300">
                  Micro-Subtextual Beat Sheet
                </h3>
              </div>
              <span className="font-mono text-[10px] text-gray-500">
                SCENE {selectedSceneNumber}
              </span>
            </div>

            {activeSceneObject && (
              <div className="bg-black/60 p-3 rounded-lg border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>OBJECTIVE:</span>
                  <span className="text-orange-450">{activeSceneObject.opening_value} → {activeSceneObject.closing_value}</span>
                </div>
                <p className="text-xs text-slate-300 font-sans font-medium">
                  {activeSceneObject.narrative_action}
                </p>
                <p className="text-[10px] text-gray-500 italic block border-t border-white/5 pt-1 mt-1">
                  Atmospheric layout: {activeSceneObject.visualDesc}
                </p>
              </div>
            )}

            {/* List of dialogue beats with masked subtext gerunds */}
            <div className="space-y-3">
              <span className="font-mono text-[9px] text-orange-500 tracking-widest uppercase font-bold block mb-1">
                Dialogue Beats (Click to Probe Subtext)
              </span>

              {activeBeats.length === 0 ? (
                <p className="text-center font-mono text-xs text-slate-600 py-6 italic">No beats expanded yet. Generate with Gemini AI above!</p>
              ) : (
                <div className="space-y-2">
                  {activeBeats.map((beat, bIdx) => {
                    const isCurrent = activeBeatIndex === bIdx;
                    return (
                      <button
                        key={beat.beat_number}
                        onClick={() => setActiveBeatIndex(bIdx)}
                        className={`w-full text-left rounded-lg p-3 border transition-all cursor-pointer ${
                          isCurrent
                            ? "border-orange-500 bg-orange-550/10 shadow-md shadow-orange-950/5"
                            : "border-white/10 bg-black hover:bg-white/5"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1.5">
                          <span className={isCurrent ? "text-orange-400 font-bold" : ""}>
                            BEAT {beat.beat_number}
                          </span>
                          <span className="uppercase text-[8px] px-1 bg-black rounded border border-white/10">
                            {beat.vocal_state ? beat.vocal_state.replace("_", " ") : (beat.status ? beat.status.split(".")[0] : "stress")}
                          </span>
                        </div>

                        {/* Masked Agendas */}
                        <div className="space-y-1 text-xs">
                          <p className="font-sans leading-relaxed text-slate-100 font-medium">
                            "{beat.text}"
                          </p>
                          <div className="grid grid-cols-1 border-t border-white/5 pt-1.5 mt-1.5 gap-1 text-[10px] font-mono">
                            <div className="text-slate-400">
                              <span className="text-orange-450 tracking-wider">SABOTEUR Subtext:</span> {beat.action.split(":")[1] || beat.action}
                            </div>
                            <div className="text-slate-400">
                              <span className="text-emerald-500 tracking-wider">TARGET Subtext:</span> {beat.reaction.split(":")[1] || beat.reaction}
                            </div>
                          </div>
                        </div>

                        {isCurrent && (
                          <div className="mt-2 text-[9px] font-mono text-orange-400 bg-orange-950/20 border border-orange-900/30 rounded p-1 block">
                            🧪 Spores glow: {beat.visual_flora}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button
                onClick={() => onSelectBlueprint(blueprint)}
                className="flex items-center gap-2 py-2 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold transition-all border border-orange-500 hover:border-orange-450 cursor-pointer"
              >
                Assemble complete screenplay
                <ArrowRight className="w-4 h-4 text-white animate-bounce" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
