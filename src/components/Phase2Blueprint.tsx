import { useState, useEffect } from "react";
import { StoryOption, Blueprint, BeatSheet, SubtextualBeat, Sequence } from "../types";
import { PRESEEDED_BLUEPRINT } from "../preseededData";
import { GreenhouseVisualizer } from "./GreenhouseVisualizer";
import {
  Sparkles, ArrowRight, Music, Volume2, Film, Palette,
  ChevronLeft, ChevronRight, Activity, Layers
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

function makeShotId(seqId: string, seqGlobalIdx: number, sceneNum: number, beatNum: number) {
  const actMatch = seqId.match(/^A(\d+)/);
  const actNum = actMatch ? actMatch[1] : "1";
  return `A${actNum}_Q${seqGlobalIdx}_S${sceneNum}_B${beatNum}`;
}

const ACT_LABELS = ["ACT I", "ACT II", "ACT III"];
const ACT_SUBTITLES = ["The Initiation", "The Confrontation", "The Resolution"];
const ACT_COLORS: Record<number, { badge: string; dot: string; text: string }> = {
  0: { badge: "text-blue-400 bg-blue-950/40 border-blue-800/50", dot: "bg-blue-500", text: "text-blue-400" },
  1: { badge: "text-amber-400 bg-amber-950/40 border-amber-800/50", dot: "bg-amber-500", text: "text-amber-400" },
  2: { badge: "text-red-400 bg-red-950/40 border-red-800/50", dot: "bg-red-500", text: "text-red-400" },
};

export function Phase2Blueprint({ chosenOption, onSelectBlueprint, selectedBlueprint }: Phase2BlueprintProps) {
  const [blueprint, setBlueprint] = useState<Blueprint>(selectedBlueprint || PRESEEDED_BLUEPRINT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [activeActIdx, setActiveActIdx] = useState(0);
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
        setActiveActIdx(0);
        setSelectedSceneNumber(1);
        setActiveBeatIndex(0);
      } else {
        setErrorInfo(data.message || "Could not generate blueprint. Rendering preseeded data.");
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

  const actOneSeqs = convertedSequences.act_one_sequences || [];
  const actTwoSeqs = convertedSequences.act_two_sequences || [];
  const actThreeSeqs = convertedSequences.act_three_sequences || [];

  type SequenceWithMeta = Sequence & { actNum: number; globalIdx: number; actIdx: number };

  const allSequences: SequenceWithMeta[] = [
    ...actOneSeqs.map((s, i) => ({ ...s, actNum: 1, globalIdx: i + 1, actIdx: 0 })),
    ...actTwoSeqs.map((s, i) => ({ ...s, actNum: 2, globalIdx: actOneSeqs.length + i + 1, actIdx: 1 })),
    ...actThreeSeqs.map((s, i) => ({ ...s, actNum: 3, globalIdx: actOneSeqs.length + actTwoSeqs.length + i + 1, actIdx: 2 })),
  ];

  // Sequences visible for the currently selected act
  const visibleSequences = allSequences.filter(s => s.actIdx === activeActIdx);
  const totalActs = [actOneSeqs, actTwoSeqs, actThreeSeqs].filter(a => a.length > 0).length || 3;

  const switchAct = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(totalActs - 1, nextIdx));
    setActiveActIdx(clamped);
    // Auto-select first scene of new act
    const firstScene = allSequences.find(s => s.actIdx === clamped)?.scenes?.[0];
    if (firstScene) {
      setSelectedSceneNumber(firstScene.scene_number);
      setActiveBeatIndex(0);
    }
  };

  const activeSeq = allSequences.find(s => s.scenes?.some(sc => sc.scene_number === selectedSceneNumber));
  const activeSceneObject = allSequences.flatMap(s => s.scenes || []).find(sc => sc.scene_number === selectedSceneNumber);
  const activeBeatSheet: BeatSheet | undefined = convertedBeats.find(sheet => sheet.scene_number === selectedSceneNumber);
  const activeBeats: SubtextualBeat[] = activeBeatSheet?.micro_blueprint?.subtextual_beat_progression || [];
  const currentBeat: SubtextualBeat | undefined = activeBeats[activeBeatIndex] || activeBeats[0];

  const currentShotId = activeSeq && currentBeat
    ? makeShotId(activeSeq.sequence_id, activeSeq.globalIdx, selectedSceneNumber, currentBeat.beat_number)
    : `A${activeActIdx + 1}_Q1_S${selectedSceneNumber}_B1`;

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
      stateLabel: vocalStateKey.replace("_state", "").toUpperCase(),
      stability: baseState.stability,
      style_exaggeration: (baseState as any).style_exaggeration || 15,
      stress_cues: baseState.stress_cues,
      framing: speaker.cinematics?.framing || "Macro Close-Up",
      colorPalette: speaker.cinematics?.color_palette || ["#111111", "#ea580c"],
    };
  };

  const activeVocalTelemetry = getBeatVocalTelemetry();
  const getDynamicStress = (beatNo?: number) => {
    const map: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 75, 5: 88, 6: 98, 7: 92 };
    return beatNo ? (map[beatNo] ?? 85) : 15;
  };
  const stressPercentage = currentBeat ? getDynamicStress(currentBeat.beat_number) : 15;
  const colors = ACT_COLORS[activeActIdx] || ACT_COLORS[0];

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 140px)", minHeight: 0 }}>

      {/* ── Control Bar ── */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <span className="font-mono text-[9px] tracking-widest text-orange-500 uppercase font-bold">Phase 2 — Narrative Deconstruction</span>
          <h2 className="text-base font-sans font-semibold text-slate-100 truncate">"{blueprint.title}"</h2>
          <p className="text-[10px] text-slate-500 font-mono truncate">{mappedLogline}</p>
        </div>
        <button
          onClick={handleGenerateBlueprint}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs text-white font-mono font-bold transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isLoading ? "Compiling..." : "Expand with Gemini AI"}
        </button>
      </div>

      {errorInfo && (
        <div className="shrink-0 p-2.5 rounded-lg border border-yellow-900/30 bg-yellow-950/25 text-yellow-500 text-[10px] font-mono">
          {errorInfo}
        </div>
      )}

      {/* ── 4-Panel Main Grid ── */}
      <div className="grid grid-cols-[200px_1fr_1fr_240px] gap-4 min-h-0 flex-1">

        {/* ── PANEL 1: Act Stepper + Scene List ── */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Story cosmology — fixed summary */}
          <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-slate-500" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 font-bold">Story & Cosmology</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5 text-[10px]">
                <span className="font-mono text-emerald-500 shrink-0 font-bold">+</span>
                <span className="text-slate-400 leading-tight">{meaning?.dialectical_debate?.positive_idea || "Institutional duty"}</span>
              </div>
              <div className="flex items-start gap-1.5 text-[10px]">
                <span className="font-mono text-red-500 shrink-0 font-bold">—</span>
                <span className="text-slate-400 leading-tight">{meaning?.dialectical_debate?.negative_counter_idea || "Personal liberation"}</span>
              </div>
            </div>
          </div>

          {/* Act Stepper */}
          <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-1 mb-2">
              <button
                onClick={() => switchAct(activeActIdx - 1)}
                disabled={activeActIdx === 0}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="text-center flex-1 min-w-0">
                <span className={`font-mono text-[10px] font-bold ${colors.text}`}>{ACT_LABELS[activeActIdx]}</span>
                <p className="font-sans text-[9px] text-slate-500 truncate">{ACT_SUBTITLES[activeActIdx]}</p>
              </div>
              <button
                onClick={() => switchAct(activeActIdx + 1)}
                disabled={activeActIdx >= totalActs - 1}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Act dots */}
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: totalActs }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => switchAct(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${i === activeActIdx ? colors.dot : "bg-white/15 hover:bg-white/30"}`}
                />
              ))}
            </div>
          </div>

          {/* Scene list — scrollable */}
          <div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-white/5 flex flex-col overflow-hidden">
            <div className="px-3 pt-3 pb-2 shrink-0 border-b border-white/8">
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 font-bold">Sequences & Scenes</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {visibleSequences.length === 0 ? (
                <p className="text-[10px] text-slate-600 font-mono italic p-2 text-center">Generate with Gemini AI.</p>
              ) : (
                visibleSequences.map(seq => (
                  <div key={seq.sequence_id} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-1">
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors.badge}`}>
                        {seq.sequence_id}
                      </span>
                      <span className="text-[9px] text-slate-500 truncate">{seq.title}</span>
                    </div>
                    {seq.scenes?.map(scene => {
                      const isActive = selectedSceneNumber === scene.scene_number;
                      return (
                        <button
                          key={scene.scene_number}
                          onClick={() => { setSelectedSceneNumber(scene.scene_number); setActiveBeatIndex(0); }}
                          className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer border ${
                            isActive
                              ? "bg-orange-950/20 border-orange-500/40 text-orange-300 font-bold"
                              : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <ChevronRight className={`w-2.5 h-2.5 shrink-0 ${isActive ? "text-orange-400" : "text-slate-700"}`} />
                          <span>S{scene.scene_number}</span>
                          <span className="truncate font-normal text-[9px] opacity-70">{scene.setting_micro}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── PANEL 2: Scene Detail ── */}
        <div className="flex flex-col min-h-0 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 shrink-0 border-b border-white/8 flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 font-bold">Level 3 — The Scene</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSceneObject ? (
              <>
                {/* Scene number */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Scene</span>
                  <span className="font-mono text-3xl font-bold text-white leading-none">{activeSceneObject.scene_number}</span>
                  {activeSeq && (
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors.badge}`}>
                      {activeSeq.sequence_id}
                    </span>
                  )}
                </div>

                {/* Objective */}
                <div className="bg-black/40 rounded-lg border border-white/8 p-3">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-1.5">Micro-Scene Objective</span>
                  <p className="text-sm font-sans font-semibold text-white leading-snug">
                    {activeSceneObject.scene_objective || activeBeatSheet?.micro_blueprint?.scene_objective || "Establish the dramatic frame."}
                  </p>
                </div>

                {/* Value shift */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-700 block mb-1">Opening (+)</span>
                    <p className="text-xs font-mono font-bold text-emerald-300 leading-tight">
                      {activeSceneObject.opening_value || activeBeatSheet?.micro_blueprint?.opening_value || "Hope"}
                    </p>
                  </div>
                  <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-red-700 block mb-1">Closing (—)</span>
                    <p className="text-xs font-mono font-bold text-red-300 leading-tight">
                      {activeSceneObject.closing_value || activeBeatSheet?.micro_blueprint?.closing_value || "Despair"}
                    </p>
                  </div>
                </div>

                {/* Visual layout */}
                <div className="bg-black/30 border border-white/8 rounded-lg p-3">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-1.5">Visual Layout</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {activeSceneObject.visualDesc || activeSceneObject.narrative_action || "No atmospheric description."}
                  </p>
                </div>

                {/* Character agendas */}
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 block mb-2">Character Agendas</span>
                  <div className="space-y-2">
                    {characterProfiles.slice(0, 2).map((char, idx) => (
                      <div key={char.id} className="bg-black/30 border border-white/8 rounded-lg p-2.5 flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${idx === 0 ? "bg-orange-500" : "bg-emerald-500"}`} />
                        <div className="min-w-0">
                          <span className="font-mono text-[9px] font-bold text-slate-300">{char.identity.name}</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{char.motivation?.conscious_desire || "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tension gauges */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/8">
                  {[
                    { label: "Tension", value: stressPercentage, color: "bg-orange-500" },
                    { label: "Body Lang.", value: Math.min(100, Math.round(stressPercentage * 0.8)), color: "bg-blue-500" },
                    { label: "Vocal", value: Math.min(100, Math.round(stressPercentage * 1.1)), color: "bg-purple-500" },
                  ].map(g => (
                    <div key={g.label}>
                      <div className="flex justify-between text-[8px] font-mono text-slate-500 mb-1">
                        <span>{g.label}</span>
                        <span className="text-slate-300">{g.value}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className={`${g.color} h-full rounded-full transition-all duration-700`} style={{ width: `${g.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-600 font-mono text-xs italic">Select a scene.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 3: Beat Progression ── */}
        <div className="flex flex-col min-h-0 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 shrink-0 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 font-bold">Level 4 — Subtextual Beats</span>
            </div>
            <span className="font-mono text-[9px] text-slate-600">{activeBeats.length} beats</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeBeats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-600 font-mono text-xs italic text-center">Generate with Gemini AI<br/>to expand beats.</p>
              </div>
            ) : (
              activeBeats.map((beat, bIdx) => {
                const isCurrent = activeBeatIndex === bIdx;
                const shotId = activeSeq
                  ? makeShotId(activeSeq.sequence_id, activeSeq.globalIdx, selectedSceneNumber, beat.beat_number)
                  : `A${activeActIdx + 1}_Q1_S${selectedSceneNumber}_B${beat.beat_number}`;
                return (
                  <button
                    key={beat.beat_number}
                    onClick={() => setActiveBeatIndex(bIdx)}
                    className={`w-full text-left rounded-lg p-3 border transition-all cursor-pointer ${
                      isCurrent
                        ? "border-orange-500/50 bg-orange-950/15"
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
                    <p className="text-[11px] font-sans text-slate-200 leading-relaxed mb-2">"{beat.text}"</p>
                    <div className="space-y-1 border-t border-white/5 pt-1.5">
                      <div className="flex items-start gap-1.5 text-[9px] font-mono">
                        <span className="text-orange-400 shrink-0 font-bold uppercase">
                          {characterProfiles[0]?.identity?.name?.split(" ")[0] || "Char 1"}:
                        </span>
                        <span className="text-slate-400 uppercase tracking-wide leading-tight">
                          {beat.action.split(":")[1]?.trim() || beat.action}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[9px] font-mono">
                        <span className="text-emerald-400 shrink-0 font-bold uppercase">
                          {characterProfiles[1]?.identity?.name?.split(" ")[0] || "Char 2"}:
                        </span>
                        <span className="text-slate-400 uppercase tracking-wide leading-tight">
                          {beat.reaction.split(":")[1]?.trim() || beat.reaction}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {/* Greenhouse sits at bottom of panel */}
          <div className="shrink-0 px-3 pb-3 border-t border-white/8 pt-3">
            <GreenhouseVisualizer
              stressLevel={stressPercentage}
              activeFlora={currentBeat?.visual_flora || "Luminescent orchids in stasis."}
              activeStatus={currentBeat?.status || "Stable resting state."}
            />
          </div>
        </div>

        {/* ── PANEL 4: Downstream Payload ── */}
        <div className="flex flex-col min-h-0 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 shrink-0 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 font-bold">Level 5 — Shot Payload</span>
            </div>
            {currentBeat && (
              <span className="font-mono text-[9px] font-bold text-orange-400">{currentShotId}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {currentBeat ? (
              <>
                {/* AUDIO */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Audio Payload</span>
                    <span className="ml-auto font-mono text-[8px] text-slate-600">{currentShotId}_AUDIO</span>
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
                        <span>Style</span>
                        <span className="text-white">{activeVocalTelemetry.style_exaggeration}%</span>
                      </div>
                      <p className="text-[8px] text-slate-600 italic leading-relaxed border-t border-white/5 pt-1.5">
                        {activeVocalTelemetry.stress_cues}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-600 italic">No vocal profile available.</p>
                  )}
                </div>

                {/* VIDEO */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-blue-400" />
                    <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Video Prompt</span>
                    <span className="ml-auto font-mono text-[8px] text-slate-600">{currentShotId}_VIDEO</span>
                  </div>
                  <div className="space-y-1.5 text-[9px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Framing</span>
                      <span className="text-slate-200 text-right leading-tight max-w-[120px]">{activeVocalTelemetry?.framing || "Macro Close-Up"}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Motion</span>
                      <span className="text-slate-200">
                        {currentBeat.beat_number <= 2 ? "190ms delay" : currentBeat.beat_number <= 4 ? "120ms delay" : "60ms rapid cut"}
                      </span>
                    </div>
                    <p className="text-[8px] text-slate-600 italic leading-relaxed border-t border-white/5 pt-1.5">
                      {currentBeat.visual_flora}
                    </p>
                  </div>
                </div>

                {/* STYLE */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-purple-400" />
                    <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Styles Palette</span>
                    <span className="ml-auto font-mono text-[8px] text-slate-600">{currentShotId}_STYLE</span>
                  </div>
                  <div className="space-y-2 text-[9px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Environment</span>
                      <span className="text-slate-200">
                        {stressPercentage > 70 ? "Defensive Crimson" : stressPercentage > 40 ? "Amber Warning" : "Ambient Teal"}
                      </span>
                    </div>
                    {activeVocalTelemetry?.colorPalette && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {activeVocalTelemetry.colorPalette.map((hex, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <div className="w-3.5 h-3.5 rounded border border-white/10" style={{ backgroundColor: hex }} />
                            <span className="text-[8px] text-slate-600">{hex}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* VOCAL TELEMETRY */}
                <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-3 h-3 text-amber-400" />
                    <span className="font-mono text-[9px] text-slate-300 uppercase font-bold">Vocal Telemetry</span>
                    <span className={`ml-auto font-mono text-[8px] px-1.5 py-0.5 rounded border ${
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
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-600 font-mono text-xs italic text-center">Select a beat<br/>to load payload.</p>
              </div>
            )}
          </div>

          {/* CTA pinned to bottom */}
          <div className="shrink-0 p-3 border-t border-white/8">
            <button
              onClick={() => onSelectBlueprint(blueprint)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Assemble Screenplay
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
