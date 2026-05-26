import { useState } from "react";
import { Blueprint } from "../types";
import { getBlueprintSequences, getBlueprintBeats, getStoryCharacters } from "../utils/schemaConverter";
import { Download, Music, Film, BarChart2, GripHorizontal, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface Phase6AssemblyProps {
  blueprint: Blueprint;
  onBack: () => void;
}

interface TimelineClip {
  shotId: string; seqTitle: string; beatText: string;
  charName: string; flora: string; vocal: string; approved: boolean;
}

export function Phase6Assembly({ blueprint, onBack }: Phase6AssemblyProps) {
  const sequences = getBlueprintSequences(blueprint);
  const beats = getBlueprintBeats(blueprint);
  const characters = getStoryCharacters(blueprint as any);

  const allSeqs = [
    ...(sequences.act_one_sequences || []),
    ...(sequences.act_two_sequences || []),
    ...(sequences.act_three_sequences || []),
  ];

  const clips: TimelineClip[] = [];
  allSeqs.forEach((seq, si) => {
    seq.scenes?.forEach(scene => {
      const beatSheet = beats.find(b => b.scene_number === scene.scene_number);
      const beatList = beatSheet?.micro_blueprint?.subtextual_beat_progression || [];
      beatList.slice(0, 2).forEach((beat, bi) => {
        const actNum = seq.sequence_id.match(/^A(\d+)/)?.[1] ?? "1";
        const shotId = `A${actNum}_Q${si + 1}_S${scene.scene_number}_B${beat.beat_number}`;
        const speaker = characters.find(c =>
          beat.action?.toLowerCase().includes(c.identity?.name?.toLowerCase().split(" ")[0] ?? "")
        ) ?? characters[0];
        clips.push({
          shotId, seqTitle: seq.title,
          beatText: beat.text, charName: speaker?.identity?.name || "—",
          flora: beat.visual_flora, vocal: beat.vocal_state || "neutral_state",
          approved: bi === 0,
        });
      });
    });
  });

  const [clipOrder, setClipOrder] = useState<TimelineClip[]>(clips);
  const [selectedClip, setSelectedClip] = useState<TimelineClip | null>(clipOrder[0] || null);
  const [activeAudioChar, setActiveAudioChar] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [viralityScore] = useState(Math.floor(Math.random() * 20) + 72);

  const moveClip = (from: number, to: number) => {
    const newOrder = [...clipOrder];
    const [item] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, item);
    setClipOrder(newOrder);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsExporting(false);
    setExportDone(true);
  };

  const vocalStateColor = (s: string) =>
    s === "panic_state" ? "text-red-400 border-red-900/50 bg-red-950/20"
    : s === "tension_state" ? "text-amber-400 border-amber-900/50 bg-amber-950/20"
    : "text-emerald-400 border-emerald-900/50 bg-emerald-950/20";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">Phase 6 — Assembly & Export</span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Timeline · ElevenLabs Audio · Final Render</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-mono transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Shots
        </button>
      </div>

      <div className="rounded-2xl border border-orange-500/70 bg-gradient-to-br from-[#0c0c10] to-[#08080a] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/15 text-slate-300">Phase 06</span>
            <span className="font-mono text-[10px] text-slate-400">{clipOrder.length} clips in timeline</span>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 py-2 px-5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shadow-md ${
              exportDone ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40" : "bg-orange-600 hover:bg-orange-500 shadow-orange-950/40"
            } text-white disabled:opacity-50`}
          >
            {isExporting ? (
              <><div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Rendering…</>
            ) : exportDone ? (
              <><CheckCircle className="w-3.5 h-3.5" />Download Final Cut</>
            ) : (
              <><Download className="w-3.5 h-3.5" />Export Final Cut</>
            )}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Film className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest font-bold">Timeline</span>
              <span className="font-mono text-[9px] text-slate-600 ml-auto">Drag clips to reorder</span>
            </div>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
              {clipOrder.map((clip, i) => (
                <motion.div
                  key={clip.shotId}
                  layout
                  className={`shrink-0 w-32 rounded-lg border cursor-pointer transition-all ${
                    selectedClip?.shotId === clip.shotId
                      ? "border-orange-500/60 bg-orange-950/20"
                      : "border-white/8 bg-black/40 hover:border-white/20"
                  }`}
                  onClick={() => setSelectedClip(clip)}
                >
                  <div className="p-2 space-y-1.5">
                    <div className="aspect-video bg-white/5 rounded border border-white/5 flex items-center justify-center">
                      {clip.approved ? (
                        <div className="w-4 h-4 rounded-full border border-emerald-500/40 bg-emerald-950/40 flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-emerald-400 border-b-[3px] border-b-transparent ml-0.5" />
                        </div>
                      ) : (
                        <Film className="w-3.5 h-3.5 text-slate-700" />
                      )}
                    </div>
                    <p className="text-[8px] font-mono text-slate-400 leading-snug truncate">{clip.shotId}</p>
                    <p className="text-[8px] text-slate-500 leading-snug line-clamp-2">"{clip.beatText}"</p>
                    <div className="flex items-center justify-between">
                      <GripHorizontal
                        className="w-3 h-3 text-slate-700 cursor-grab"
                        onMouseDown={() => {}}
                      />
                      <div className="flex gap-0.5">
                        {i > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); moveClip(i, i - 1); }}
                            className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-[8px] text-slate-400">←</button>
                        )}
                        {i < clipOrder.length - 1 && (
                          <button onClick={(e) => { e.stopPropagation(); moveClip(i, i + 1); }}
                            className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-[8px] text-slate-400">→</button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Selected clip detail */}
            <div className="lg:col-span-5 space-y-3">
              {selectedClip ? (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                  <div>
                    <span className="text-[9px] font-mono text-orange-400 font-bold block mb-0.5">{selectedClip.shotId}</span>
                    <h4 className="font-bold text-white text-sm">{selectedClip.seqTitle}</h4>
                  </div>
                  <p className="text-[11px] text-slate-300 italic leading-relaxed border-l-2 border-orange-500/40 pl-2.5">
                    "{selectedClip.beatText}"
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                    <div className="bg-black/50 border border-white/8 rounded-lg p-2">
                      <span className="text-slate-500 block mb-0.5">Character</span>
                      <span className="text-slate-200 font-bold">{selectedClip.charName}</span>
                    </div>
                    <div className={`border rounded-lg p-2 ${vocalStateColor(selectedClip.vocal)}`}>
                      <span className="block mb-0.5 opacity-70">Vocal State</span>
                      <span className="font-bold capitalize">{selectedClip.vocal.replace("_state","").toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="bg-black/50 border border-white/8 rounded-lg p-2.5 text-[9px]">
                    <span className="font-mono text-slate-500 block mb-1">Flora / Environment</span>
                    <p className="text-slate-300 italic leading-snug">{selectedClip.flora}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-black/40 border border-white/8 rounded-xl p-8 flex items-center justify-center">
                  <p className="text-[10px] font-mono text-slate-600 italic">Select a clip from the timeline</p>
                </div>
              )}
            </div>

            {/* Audio + Virality */}
            <div className="lg:col-span-7 space-y-3">
              {/* ElevenLabs Audio */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-[9px] text-slate-300 uppercase font-bold tracking-wider">ElevenLabs Audio</span>
                </div>
                {characters.length > 0 ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      {characters.map((c, i) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveAudioChar(i)}
                          className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold border transition-all cursor-pointer ${
                            activeAudioChar === i ? "bg-white/15 border-white/25 text-white" : "bg-black/50 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          {c.identity?.name?.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                    {characters[activeAudioChar] && (
                      <div className="space-y-2 text-[9px] font-mono">
                        {[
                          { label: "Voice Clone ID", value: characters[activeAudioChar].audio?.voice_identity?.voice_clone_id || "—" },
                          { label: "Sonic Anchor", value: characters[activeAudioChar].audio?.voice_identity?.sonic_anchor || "—" },
                          { label: "Timbre", value: characters[activeAudioChar].audio?.performance_styling?.timbre || "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between gap-2">
                            <span className="text-slate-500 shrink-0">{label}</span>
                            <span className="text-slate-200 text-right truncate max-w-[180px]">{value}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-slate-500 block mb-1.5">Vocal State Selector</span>
                          <div className="flex gap-1.5">
                            {(["neutral_state","tension_state","panic_state"] as const).map(state => (
                              <span key={state} className={`px-2 py-1 rounded border text-[8px] font-bold capitalize cursor-pointer ${vocalStateColor(state)}`}>
                                {state.replace("_state","").toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[9px] font-mono text-slate-600 italic">No character audio data found.</p>
                )}
              </div>

              {/* Virality Score */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-mono text-[9px] text-slate-300 uppercase font-bold tracking-wider">Virality Predictor</span>
                </div>
                <div className="flex items-end gap-4">
                  <div className="text-4xl font-bold text-white">{viralityScore}</div>
                  <div className="flex-1 space-y-1.5 pb-1">
                    {[
                      { label: "Emotional impact", pct: Math.min(100, viralityScore + 8) },
                      { label: "Visual novelty",   pct: Math.min(100, viralityScore - 4) },
                      { label: "Pacing score",     pct: Math.min(100, viralityScore + 2) },
                    ].map(({ label, pct }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[8px] font-mono text-slate-500 mb-0.5">
                          <span>{label}</span><span>{pct}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-purple-500 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] font-mono text-slate-500 italic">
                  {viralityScore >= 85 ? "High engagement predicted — cinematic tension and subtext are well-calibrated."
                    : viralityScore >= 75 ? "Good engagement potential. Consider tightening Act II pacing."
                    : "Moderate score. Review beat progression and flora color distribution."}
                </p>
              </div>

              {!exportDone && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-white/8 bg-black/30 text-slate-500 text-[9px] font-mono">
                  <AlertCircle className="w-3 h-3 text-yellow-600" />
                  Add HIGGSFIELD_API_KEY + HIGGSFIELD_SECRET + ELEVENLABS_API_KEY to Replit Secrets to enable full render pipeline.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
