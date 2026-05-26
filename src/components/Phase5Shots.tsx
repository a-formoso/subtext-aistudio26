import { useState } from "react";
import { Blueprint } from "../types";
import { getBlueprintSequences, getBlueprintBeats, getStoryCharacters } from "../utils/schemaConverter";
import { Sparkles, Film, ArrowRight, Play, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Phase5ShotsProps {
  blueprint: Blueprint;
  onProceed: () => void;
}

interface ShotJob {
  shotId: string;
  status: "idle" | "generating" | "image_done" | "video_done" | "error";
  imageUrl?: string;
  videoUrl?: string;
  prompt?: string;
}

function buildSeedancePrompt(shot: {
  framing: string; setting: string; action: string; reaction: string;
  flora: string; charName: string; vocal: string;
}) {
  return `[SHOT SETUP] ${shot.framing}, anamorphic 35mm, cinematic key light
[OPENING FRAME] ${shot.charName} — ${shot.setting}
[MOTION] ${shot.action}
[CLOSING FRAME] ${shot.reaction}
[ATMOSPHERE] ${shot.flora} | Vocal state: ${shot.vocal}`.trim();
}

export function Phase5Shots({ blueprint, onProceed }: Phase5ShotsProps) {
  const sequences = getBlueprintSequences(blueprint);
  const beats = getBlueprintBeats(blueprint);
  const characters = getStoryCharacters(blueprint as any);

  const allSeqs = [
    ...(sequences.act_one_sequences || []),
    ...(sequences.act_two_sequences || []),
    ...(sequences.act_three_sequences || []),
  ];

  type FlatShot = {
    shotId: string; seqId: string; seqTitle: string; sceneNum: number;
    beatNum: number; text: string; action: string; reaction: string;
    flora: string; vocal: string; framing: string; setting: string; charName: string;
  };

  const flatShots: FlatShot[] = [];
  allSeqs.forEach((seq, si) => {
    seq.scenes?.forEach(scene => {
      const beatSheet = beats.find(b => b.scene_number === scene.scene_number);
      const beatList = beatSheet?.micro_blueprint?.subtextual_beat_progression || [];
      beatList.forEach(beat => {
        const actNum = seq.sequence_id.match(/^A(\d+)/)?.[1] ?? "1";
        const shotId = `A${actNum}_Q${si + 1}_S${scene.scene_number}_B${beat.beat_number}`;
        const speaker = characters.find(c =>
          beat.action?.toLowerCase().includes(c.identity?.name?.toLowerCase().split(" ")[0] ?? "")
        ) ?? characters[0];
        flatShots.push({
          shotId,
          seqId: seq.sequence_id,
          seqTitle: seq.title,
          sceneNum: scene.scene_number,
          beatNum: beat.beat_number,
          text: beat.text,
          action: beat.action,
          reaction: beat.reaction,
          flora: beat.visual_flora,
          vocal: beat.vocal_state || "neutral_state",
          framing: speaker?.cinematics?.framing || "Medium Close-Up",
          setting: scene.setting_micro || seq.setting_macro,
          charName: speaker?.identity?.name || "Character",
        });
      });
    });
  });

  const [activeShotId, setActiveShotId] = useState<string>(flatShots[0]?.shotId || "");
  const [jobs, setJobs] = useState<Record<string, ShotJob>>({});
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});

  const activeShot = flatShots.find(s => s.shotId === activeShotId) || flatShots[0];
  const activeJob = activeShotId ? jobs[activeShotId] : undefined;

  const getPrompt = (shot: FlatShot) =>
    editedPrompts[shot.shotId] ?? buildSeedancePrompt(shot);

  const generateImage = async (shot: FlatShot) => {
    const prompt = getPrompt(shot);
    setJobs(prev => ({ ...prev, [shot.shotId]: { shotId: shot.shotId, status: "generating", prompt } }));
    try {
      const resp = await fetch("/api/generate-shot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId: shot.shotId, prompt, type: "image" }),
      });
      const data = await resp.json();
      if (data.success) {
        setJobs(prev => ({ ...prev, [shot.shotId]: { shotId: shot.shotId, status: "image_done", imageUrl: data.imageUrl, prompt } }));
      } else {
        setJobs(prev => ({ ...prev, [shot.shotId]: { shotId: shot.shotId, status: "error", prompt } }));
      }
    } catch {
      setJobs(prev => ({ ...prev, [shot.shotId]: { shotId: shot.shotId, status: "error", prompt } }));
    }
  };

  const promoteToVideo = async (shot: FlatShot) => {
    const job = jobs[shot.shotId];
    if (!job) return;
    setJobs(prev => ({ ...prev, [shot.shotId]: { ...job, status: "generating" } }));
    try {
      const resp = await fetch("/api/generate-shot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId: shot.shotId, prompt: job.prompt, type: "video", imageUrl: job.imageUrl }),
      });
      const data = await resp.json();
      if (data.success) {
        setJobs(prev => ({ ...prev, [shot.shotId]: { ...job, status: "video_done", videoUrl: data.videoUrl } }));
      } else {
        setJobs(prev => ({ ...prev, [shot.shotId]: { ...job, status: "error" } }));
      }
    } catch {
      setJobs(prev => ({ ...prev, [shot.shotId]: { ...prev[shot.shotId]!, status: "error" } }));
    }
  };

  const doneCount = Object.values(jobs).filter(j => j.status === "video_done" || j.status === "image_done").length;

  if (flatShots.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">Phase 5 — Shot Generation</span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Generate storyboard images and video clips per shot</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/3 p-10 flex flex-col items-center gap-3 text-center">
          <Film className="w-8 h-8 text-slate-700" />
          <p className="text-slate-500 font-mono text-[11px] italic">No beat data found. Complete Phase 2 blueprint generation first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-orange-500 uppercase font-bold">Phase 5 — Shot Generation</span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{flatShots.length} shots from scene manifest · {doneCount} generated</p>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-500/70 bg-gradient-to-br from-[#0c0c10] to-[#08080a] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/15 text-slate-300">Phase 05</span>
            <span className="font-mono text-[10px] text-slate-400">{doneCount}/{flatShots.length} shots ready</span>
          </div>
          <button
            onClick={onProceed}
            className="flex items-center gap-2 py-2 px-5 rounded-lg font-mono text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-all cursor-pointer shadow-md shadow-orange-950/40"
          >
            Proceed to Assembly
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/8">
          <div className="lg:col-span-4 overflow-y-auto max-h-[500px] p-3 space-y-1">
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block mb-2 px-1">Shot List</span>
            {flatShots.map(shot => {
              const job = jobs[shot.shotId];
              const isActive = activeShotId === shot.shotId;
              return (
                <button
                  key={shot.shotId}
                  onClick={() => setActiveShotId(shot.shotId)}
                  className={`w-full text-left rounded-lg p-2.5 border transition-all cursor-pointer ${
                    isActive ? "border-orange-500/50 bg-orange-950/15" : "border-white/8 bg-black/30 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-mono text-[8px] font-bold ${isActive ? "text-orange-400" : "text-slate-600"}`}>{shot.shotId}</span>
                    <StatusDot status={job?.status} />
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">"{shot.text}"</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="font-mono text-[8px] text-slate-600 bg-black/50 border border-white/8 px-1 py-0.5 rounded">{shot.framing}</span>
                    <ChevronRight className={`w-3 h-3 ml-auto ${isActive ? "text-orange-400" : "text-slate-700"}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 p-4 space-y-4">
            {activeShot && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeShot.shotId}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/8">
                    <div>
                      <span className="text-[9px] font-mono text-orange-400 font-bold block mb-0.5">{activeShot.shotId}</span>
                      <h4 className="font-bold text-white text-sm">{activeShot.seqTitle}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{activeShot.setting}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {activeJob?.status === "image_done" && (
                        <button
                          onClick={() => promoteToVideo(activeShot)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-950/20 hover:bg-blue-950/40 text-[10px] text-blue-300 font-mono font-bold transition-all cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          Promote to Video
                        </button>
                      )}
                      <button
                        onClick={() => generateImage(activeShot)}
                        disabled={activeJob?.status === "generating"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[10px] text-white font-mono font-bold transition-all cursor-pointer"
                      >
                        {activeJob?.status === "generating" ? (
                          <><RefreshCw className="w-3 h-3 animate-spin" />Generating…</>
                        ) : (
                          <><Sparkles className="w-3 h-3" />Generate Image</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block mb-1.5">Seedance 2.0 Prompt</span>
                    <textarea
                      value={getPrompt(activeShot)}
                      onChange={e => setEditedPrompts(prev => ({ ...prev, [activeShot.shotId]: e.target.value }))}
                      className="w-full h-28 p-3 bg-black/70 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none leading-relaxed"
                    />
                  </div>

                  <div className={`aspect-video rounded-xl border flex items-center justify-center transition-all ${
                    activeJob?.status === "video_done" ? "border-blue-500/40 bg-blue-950/10"
                    : activeJob?.status === "image_done" ? "border-emerald-500/40 bg-emerald-950/10"
                    : activeJob?.status === "generating" ? "border-orange-500/30 bg-orange-950/10 animate-pulse"
                    : "border-white/8 bg-black/30"
                  }`}>
                    {activeJob?.status === "video_done" ? (
                      <div className="flex flex-col items-center gap-2">
                        <Play className="w-8 h-8 text-blue-400" />
                        <span className="text-[10px] font-mono text-blue-300">Video clip ready</span>
                      </div>
                    ) : activeJob?.status === "image_done" ? (
                      <div className="flex flex-col items-center gap-2">
                        <Film className="w-8 h-8 text-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-300">Storyboard image ready</span>
                      </div>
                    ) : activeJob?.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                        <span className="text-[10px] font-mono text-orange-400">Rendering shot…</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Film className="w-8 h-8 text-slate-700" />
                        <span className="text-[10px] font-mono text-slate-600">Press Generate Image to render this shot</span>
                      </div>
                    )}
                  </div>

                  {activeJob?.status === "error" && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-yellow-700/40 bg-yellow-950/20 text-yellow-400 text-[10px] font-mono">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Generation failed. Add HIGGSFIELD_API_KEY and HIGGSFIELD_SECRET to Replit Secrets.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-1.5">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">Subtext Action</span>
                      <p className="text-[10px] text-slate-300 leading-snug uppercase tracking-wide">{activeShot.action.split(":")[1]?.trim() || activeShot.action}</p>
                    </div>
                    <div className="bg-black/40 border border-white/8 rounded-lg p-3 space-y-1.5">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">Flora / Environment</span>
                      <p className="text-[10px] text-slate-300 leading-snug italic">{activeShot.flora}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  if (!status || status === "idle") return <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />;
  if (status === "generating") return <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />;
  if (status === "image_done") return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
  if (status === "video_done") return <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />;
  if (status === "error") return <div className="w-1.5 h-1.5 rounded-full bg-red-500" />;
  return null;
}
