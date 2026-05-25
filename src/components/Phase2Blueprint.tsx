import { useState, useEffect } from "react";
import { StoryOption, Blueprint, BeatSheet, SubtextualBeat, Sequence } from "../types";
import { PRESEEDED_BLUEPRINT } from "../preseededData";
import { GreenhouseVisualizer } from "./GreenhouseVisualizer";
import {
  Sparkles, ArrowRight, Music, Volume2, Film, Palette,
  ChevronRight, Activity, Layers
} from "lucide-react";
import {
  getBlueprintSequences,
  getBlueprintBeats,
  getBlueprintLogline,
  getStoryCharacters,
  getStoryMeaning
} from "../utils/schemaConverter";

interface Phase2BlueprintProps {
  chosenOption?: StoryOption;
  onSelectBlueprint: (blueprint: Blueprint) => void;
  selectedBlueprint?: Blueprint;
}

// Compute Shot ID in A{act}_Q{seqGlobal}_S{scene}_B{beat} format
function makeShotId(seqId: string, seqGlobalIdx: number, sceneNum: number, beatNum: number) {
  const actMatch = seqId.match(/^A(\d+)/);
  const actNum = actMatch ? actMatch[1] : "1";
  return `A${actNum}_Q${seqGlobalIdx}_S${sceneNum}_B${beatNum}`;
}

export function Phase2Blueprint({ chosenOption, onSelectBlueprint, selectedBlueprint }: Phase2BlueprintProps) {
  const [blueprint, setBlueprint] = useState<Blueprint>(selectedBlueprint || PRESEEDED_BLUEPRINT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [selectedSceneNumber, setSelectedSceneNumber] = useState(1);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);

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
        setErrorInfo(data.message || "Could not generate blueprint. Rendering preseeded high-fidelity data.");
        setBlueprint(PRESEEDED_BLUEPRINT);
        onSelectBlueprint(PRESEEDED_BLUEPRINT);
      }
    } catch {
      setErrorInfo("Gemini endpoint unreachable. Rendered preseeded structural maps.");
      setBlueprint(PRESEEDED_BLUEPRINT);
      onSelectBlueprint(PRESEEDED_BLUEPRINT);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chosenOption && chosenOption.title !== blueprint.title) {
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
  const meaning = getStoryMeaning(blueprint as any);

  // Flatten sequences with global index (for Shot ID Q component)
  const actOneSeqs = convertedSequences.act_one_sequences || [];
  const actTwoSeqs = convertedSequences.act_two_sequences || [];
  const actThreeSeqs = convertedSequences.act_three_sequences || [];

  type SequenceWithMeta = Sequence & { actNum: number; globalIdx: number; actLabel: string };

  const allSequences: SequenceWithMeta[] = [
    ...actOneSeqs.map((s, i) => ({ ...s, actNum: 1, globalIdx: i + 1, actLabel: "ACT I" })),
    ...actTwoSeqs.map((s, i) => ({ ...s, actNum: 2, globalIdx: actOneSeqs.length + i + 1, actLabel: "ACT II" })),
    ...actThreeSeqs.map((s, i) => ({ ...s, actNum: 3, globalIdx: actOneSeqs.length + actTwoSeqs.length + i + 1, actLabel: "ACT III" })),
  ];

  // Active scene & sequence
  const activeSeq = allSequences.find(s => s.scenes?.some(sc => sc.scene_number === selectedSceneNumber));
  const activeSceneObject = allSequences
    .flatMap(s => s.scenes || [])
    .find(sc => sc.scene_number === selectedSceneNumber);

  const activeBeatSheet: BeatSheet | undefined = convertedBeats.find(
    sheet => sheet.scene_number === selectedSceneNumber
  );
  const activeBeats: SubtextualBeat[] = activeBeatSheet?.micro_blueprint?.subtextual_beat_progression || [];
  const currentBeat: SubtextualBeat | undefined = activeBeats[activeBeatIndex] || activeBeats[0];

  // Shot ID for current beat
  const currentShotId = activeSeq && currentBeat
    ? makeShotId(activeSeq.sequence_id, activeSeq.globalIdx, selectedSceneNumber, currentBeat.beat_number)
    : "A1_Q1_S1_B1";

  // Vocal telemetry
  const getBeatVocalTelemetry = () => {
    if (!currentBeat) return null;
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
      voiceCloneId: speaker.audio.voice_clone_id,
      stateLabel: vocalStateKey.replace("_state", "").toUpperCase(),
      stability: baseState.stability,
      similarity_boost: baseState.similarity_boost,
      style_exaggeration: (baseState as any).style_exaggeration || 15,
      stress_cues: baseState.stress_cues,
      framing: speaker.cinematics?.framing || "Macro Close-Up",
      colorPalette: speaker.cinematics?.color_palette || ["#111111", "#ea580c"],
    };
  };

  const activeVocalTelemetry = getBeatVocalTelemetry();

  const getDynamicStress = (beatNo?: number): number => {
    if (!beatNo) return 15;
    const map: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 75, 5: 88, 6: 98, 7: 92 };
    return map[beatNo] ?? 85;
  };
  const stressPercentage = currentBeat ? getDynamicStress(currentBeat.beat_number) : 15;

  const actColors: Record<number, string> = {
    1: "text-blue-400 bg-blue-950/40 border-blue-800/50",
    2: "text-amber-400 bg-amber-950/40 border-amber-800/50",
    3: "text-red-400 bg-red-950/40 border-red-800/50",
  };

  return (
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] tracking-widest text-orange-500 uppercase font-bold">Phase 2 — Narrative Deconstruction</span>
          <h2 className="text-lg font-sans font-semibold text-slate-100 mt-0.5">
            "{blueprint.title}"
          </h2>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{mappedLogline}</p>
        </div>
        <button
          onClick={handleGenerateBlueprint}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs text-white font-mono font-bold transition-all shadow-lg shadow-orange-950/30 cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isLoading ? "Compiling..." : "Expand with Gemini AI"}
        </button>
      </div>

      {errorInfo && (
        <div className="p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/25 text-yellow-500 text-xs font-mono">
          <strong>Notice:</strong> {errorInfo}
        </div>
      )}

      {/* ── 4-Panel Horizontal Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_1fr_260px] gap-4">

        {/* ── PANEL 1: Story Foundation + Sequence Navigator ── */}
        <div className="space-y-4">
          {/* Story Cosmology */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level 1 — Story & Cosmology</span>
            </div>

            <div>
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-1">Master Premise</span>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {(blueprint as any).meaning?.premise ||
                  (blueprint as any).step_3_and_4_meaning_and_props?.premise ||
                  `"${blueprint.title}" — a compressed dramatic unit exploring institutional betrayal.`}
              </p>
            </div>

            <div className="border-t border-white/8 pt-3">
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-1.5">Dialectical Debate</span>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-[10px]">
                  <span className="font-mono text-emerald-500 shrink-0 font-bold mt-0.5">+</span>
                  <span className="text-slate-300">{meaning?.dialectical_debate?.positive_idea || "Institutional duty"}</span>
                </div>
                <div className="flex items-start gap-2 text-[10px]">
                  <span className="font-mono text-red-500 shrink-0 font-bold mt-0.5">—</span>
                  <span className="text-slate-300">{meaning?.dialectical_debate?.negative_counter_idea || "Personal liberation"}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/8 pt-3">
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-1">Controlling Idea</span>
              <p className="text-[10px] text-slate-400 italic leading-relaxed">{meaning?.controlling_idea || "Sovereignty is reclaimed only when one surrenders the illusion of control."}</p>
            </div>
          </div>

          {/* Sequence Navigator */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level 2 — Sequences & Acts</span>
            </div>

            {allSequences.length === 0 ? (
              <p className="text-[11px] text-slate-600 font-mono italic">Generate with Gemini AI to populate sequences.</p>
            ) : (
              <div className="space-y-2">
                {allSequences.map((seq) => {
                  const isActive = seq.scenes?.some(sc => sc.scene_number === selectedSceneNumber);
                  return (
                    <div key={seq.sequence_id} className={`rounded-lg border transition-all ${isActive ? "border-orange-500/50 bg-orange-950/10" : "border-white/8 bg-black/20"}`}>
                      <div className="flex items-center gap-2 px-2.5 py-2">
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${actColors[seq.actNum] || actColors[1]}`}>
                          {seq.actLabel}
                        </span>
                        <span className={`font-mono text-[9px] font-bold truncate ${isActive ? "text-orange-400" : "text-slate-400"}`}>
                          {seq.sequence_id}
                        </span>
                      </div>
                      <div className="px-2.5 pb-2 space-y-1">
                        <p className="text-[10px] font-sans font-medium text-slate-200 line-clamp-1">{seq.title}</p>
                        {seq.scenes?.map(scene => {
                          const isSceneActive = selectedSceneNumber === scene.scene_number;
                          return (
                            <button
                              key={scene.scene_number}
                              onClick={() => { setSelectedSceneNumber(scene.scene_number); setActiveBeatIndex(0); }}
                              className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono transition-all cursor-pointer ${
                                isSceneActive
                                  ? "bg-orange-500/20 text-orange-300 font-bold"
                                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                              }`}
                            >
                              <ChevronRight className={`w-2.5 h-2.5 shrink-0 ${isSceneActive ? "text-orange-400" : "text-slate-600"}`} />
                              S{scene.scene_number} — {scene.setting_micro?.slice(0, 22) || "Scene"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 2: Active Scene Detail ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4 h-full">
            <div className="flex items-center gap-1.5 mb-1">
              <Film className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level 3 — The Scene</span>
            </div>

            {activeSceneObject ? (
              <>
                {/* Scene number + ID */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Scene Number:</span>
                    <span className="font-mono text-2xl font-bold text-white">{activeSceneObject.scene_number}</span>
                  </div>
                  {activeSeq && (
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/15 text-slate-400 uppercase tracking-widest">
                      {activeSeq.sequence_id}
                    </span>
                  )}
                </div>

                {/* Micro-Scene Objective */}
                <div className="bg-black/40 rounded-lg border border-white/8 p-3 space-y-1">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block">Micro-Scene Objective</span>
                  <p className="text-sm font-sans font-semibold text-white leading-snug">
                    {activeSceneObject.scene_objective || activeBeatSheet?.micro_blueprint?.scene_objective || "Establish the dramatic frame."}
                  </p>
                </div>

                {/* Value Shift */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-600 block mb-1">Opening Value (+)</span>
                    <p className="text-xs font-mono font-bold text-emerald-300">
                      {activeSceneObject.opening_value || activeBeatSheet?.micro_blueprint?.opening_value || "Hope"}
                    </p>
                  </div>
                  <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-red-600 block mb-1">Closing Value (—)</span>
                    <p className="text-xs font-mono font-bold text-red-300">
                      {activeSceneObject.closing_value || activeBeatSheet?.micro_blueprint?.closing_value || "Despair"}
                    </p>
                  </div>
                </div>

                {/* Atmospheric layout */}
                <div className="bg-black/30 border border-white/8 rounded-lg p-3">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-1">Visual Layout</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans italic">
                    {activeSceneObject.visualDesc || activeSceneObject.narrative_action || "No atmospheric description available."}
                  </p>
                </div>

                {/* Character Agendas */}
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-2">Character Agendas</span>
                  <div className="space-y-2">
                    {characterProfiles.slice(0, 2).map((char, idx) => (
                      <div key={char.id} className="bg-black/30 border border-white/8 rounded-lg p-3 flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${idx === 0 ? "bg-orange-500" : "bg-emerald-500"}`} />
                        <div className="min-w-0">
                          <span className="font-mono text-[9px] font-bold text-slate-300 block">{char.identity.name}</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                            {char.motivation?.conscious_desire || "Character agenda not defined"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tension Gauges */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/8">
                  {[
                    { label: "Tension", value: stressPercentage, color: "bg-orange-500" },
                    { label: "Body Lang.", value: Math.round(stressPercentage * 0.8), color: "bg-blue-500" },
                    { label: "Vocal Stress", value: Math.round(stressPercentage * 1.1 > 100 ? 100 : stressPercentage * 1.1), color: "bg-purple-500" },
                  ].map(g => (
                    <div key={g.label} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[8px] text-slate-500 uppercase">{g.label}</span>
                        <span className="font-mono text-[9px] text-slate-300 font-bold">{g.value}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className={`${g.color} h-full rounded-full transition-all duration-700`} style={{ width: `${g.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-slate-600 font-mono text-xs italic">Select a scene from the navigator.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 3: Beat Progression ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level 4 — Subtextual Beats</span>
              </div>
              <span className="font-mono text-[9px] text-slate-600">
                S{selectedSceneNumber} / {activeBeats.length} beats
              </span>
            </div>

            {activeBeats.length === 0 ? (
              <p className="text-center font-mono text-xs text-slate-600 py-8 italic">Generate with Gemini AI to expand beats.</p>
            ) : (
              <div className="space-y-2">
                {activeBeats.map((beat, bIdx) => {
                  const isCurrent = activeBeatIndex === bIdx;
                  const shotId = activeSeq
                    ? makeShotId(activeSeq.sequence_id, activeSeq.globalIdx, selectedSceneNumber, beat.beat_number)
                    : `A1_Q1_S${selectedSceneNumber}_B${beat.beat_number}`;
                  return (
                    <button
                      key={beat.beat_number}
                      onClick={() => setActiveBeatIndex(bIdx)}
                      className={`w-full text-left rounded-lg p-3 border transition-all cursor-pointer ${
                        isCurrent
                          ? "border-orange-500/60 bg-orange-950/15"
                          : "border-white/8 bg-black/30 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`font-mono text-[9px] font-bold ${isCurrent ? "text-orange-400" : "text-slate-500"}`}>
                          BEAT {beat.beat_number}
                        </span>
                        <span className="font-mono text-[8px] text-slate-600 bg-black/60 border border-white/8 px-1.5 py-0.5 rounded">
                          {shotId}
                        </span>
                      </div>

                      <p className="text-[11px] font-sans text-slate-200 leading-relaxed mb-2">
                        "{beat.text}"
                      </p>

                      <div className="space-y-1 border-t border-white/5 pt-1.5">
                        <div className="flex items-start gap-1.5 text-[9px] font-mono">
                          <span className="text-orange-400 shrink-0 font-bold uppercase mt-0.5">
                            {characterProfiles[0]?.identity?.name?.split(" ")[0] || "Char 1"}:
                          </span>
                          <span className="text-slate-400 uppercase tracking-wide">
                            {beat.action.split(":")[1]?.trim() || beat.action}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[9px] font-mono">
                          <span className="text-emerald-400 shrink-0 font-bold uppercase mt-0.5">
                            {characterProfiles[1]?.identity?.name?.split(" ")[0] || "Char 2"}:
                          </span>
                          <span className="text-slate-400 uppercase tracking-wide">
                            {beat.reaction.split(":")[1]?.trim() || beat.reaction}
                          </span>
                        </div>
                      </div>

                      {isCurrent && beat.vocal_state && (
                        <div className="mt-2 text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                          vocal state: {beat.vocal_state.replace("_state", "")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Greenhouse */}
            <div className="pt-2 border-t border-white/8">
              <GreenhouseVisualizer
                stressLevel={stressPercentage}
                activeFlora={currentBeat?.visual_flora || "Luminescent orchids in stasis."}
                activeStatus={currentBeat?.status || "Stable resting state."}
              />
            </div>
          </div>
        </div>

        {/* ── PANEL 4: Downstream API Payload ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">Level 5 — Shot Payload</span>
            </div>

            {currentBeat ? (
              <div className="space-y-3">
                {/* Shot ID header */}
                <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-slate-500 uppercase">Active Shot</span>
                  <span className="font-mono text-[10px] font-bold text-orange-400">{currentShotId}</span>
                </div>

                {/* AUDIO Payload */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                      <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Audio Payload</span>
                    </div>
                    <span className="font-mono text-[8px] text-slate-600">{currentShotId}_AUDIO</span>
                  </div>
                  {activeVocalTelemetry ? (
                    <div className="space-y-1.5 text-[9px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Speaker</span>
                        <span className="text-slate-200 font-bold">{activeVocalTelemetry.characterName}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>State</span>
                        <span className={`font-bold ${activeVocalTelemetry.stateLabel === "PANIC" ? "text-red-400" : activeVocalTelemetry.stateLabel === "TENSION" ? "text-amber-400" : "text-emerald-400"}`}>
                          {activeVocalTelemetry.stateLabel}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Stability</span>
                        <span className="text-white">{activeVocalTelemetry.stability}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Style Exag.</span>
                        <span className="text-white">{activeVocalTelemetry.style_exaggeration}%</span>
                      </div>
                      <div className="border-t border-white/5 pt-1.5 text-slate-500 italic text-[8px] leading-relaxed">
                        {activeVocalTelemetry.stress_cues}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-600 italic">No vocal profile available.</p>
                  )}
                </div>

                {/* VIDEO Payload */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-blue-400" />
                      <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Video Prompt</span>
                    </div>
                    <span className="font-mono text-[8px] text-slate-600">{currentShotId}_VIDEO</span>
                  </div>
                  <div className="space-y-1.5 text-[9px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Framing</span>
                      <span className="text-slate-200 text-right max-w-[130px] leading-tight">{activeVocalTelemetry?.framing || "Macro Close-Up"}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Motion</span>
                      <span className="text-slate-200">
                        {currentBeat.beat_number <= 2 ? "190ms delay" : currentBeat.beat_number <= 4 ? "120ms delay" : "60ms rapid cut"}
                      </span>
                    </div>
                    <div className="border-t border-white/5 pt-1.5 text-slate-500 italic text-[8px] leading-relaxed">
                      {currentBeat.visual_flora}
                    </div>
                  </div>
                </div>

                {/* STYLE Payload */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3 h-3 text-purple-400" />
                      <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Styles Palette</span>
                    </div>
                    <span className="font-mono text-[8px] text-slate-600">{currentShotId}_STYLE</span>
                  </div>
                  <div className="space-y-2 text-[9px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Environment</span>
                      <span className="text-slate-200">
                        {stressPercentage > 70 ? "Defensive Crimson" : stressPercentage > 40 ? "Amber Warning" : "Ambient Teal"}
                      </span>
                    </div>
                    {activeVocalTelemetry?.colorPalette && (
                      <div>
                        <span className="text-slate-500 block mb-1.5">Color Tokens</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {activeVocalTelemetry.colorPalette.map((hex, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: hex }} />
                              <span className="text-[8px] text-slate-500">{hex}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-[8px] text-slate-500 border-t border-white/5 pt-1.5 italic">
                      Flora stress state: {stressPercentage}% — {stressPercentage > 70 ? "Deep violet shift" : "Ambient luminescence"}
                    </div>
                  </div>
                </div>

                {/* Music payload */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-amber-400" />
                      <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Vocal Stress Telemetry</span>
                    </div>
                    <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded border ${
                      stressPercentage > 70 ? "text-red-400 bg-red-950/30 border-red-900/50" :
                      stressPercentage > 40 ? "text-amber-400 bg-amber-950/30 border-amber-900/50" :
                      "text-emerald-400 bg-emerald-950/30 border-emerald-900/50"
                    }`}>
                      {stressPercentage > 70 ? "PANIC" : stressPercentage > 40 ? "TENSION" : "NEUTRAL"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Stability", value: activeVocalTelemetry?.stability ?? 75, color: "bg-emerald-500" },
                      { label: "Style", value: activeVocalTelemetry?.style_exaggeration ?? 15, color: "bg-amber-500" },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                          <span>{s.label}</span>
                          <span className="text-slate-300">{s.value}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div className={`${s.color} h-full rounded-full transition-all duration-500`} style={{ width: `${s.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p className="text-slate-600 font-mono text-xs italic text-center">Select a beat to load<br/>downstream payload.</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={() => onSelectBlueprint(blueprint)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-lg shadow-orange-950/30"
          >
            Assemble Screenplay
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
