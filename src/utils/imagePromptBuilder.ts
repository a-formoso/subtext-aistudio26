import type { CinematicShot } from "../types";

const FRAMING_MAP: Record<string, string> = {
  "MCU":  "A macro close-up",
  "CU":   "A close-up",
  "ECU":  "An extreme close-up",
  "MS":   "A medium",
  "MLS":  "A medium long",
  "LS":   "A long",
  "WS":   "A wide",
  "OTS":  "An over-the-shoulder",
  "POV":  "A point-of-view",
  "2S":   "A two-shot",
  "INSERT": "An insert",
};

function framingToArticle(framing: string): string {
  const abbr = framing.match(/\(([^)]+)\)/)?.[1]?.toUpperCase();
  if (abbr && FRAMING_MAP[abbr]) return FRAMING_MAP[abbr];
  const lower = framing.toLowerCase();
  if (lower.includes("macro") || lower.includes("close-up")) return "A macro close-up";
  if (lower.includes("over-the-shoulder") || lower.includes("ots")) return "An over-the-shoulder";
  if (lower.includes("extreme")) return "An extreme close-up";
  if (lower.includes("close")) return "A close-up";
  if (lower.includes("wide")) return "A wide";
  if (lower.includes("medium long")) return "A medium long";
  if (lower.includes("medium")) return "A medium";
  if (lower.includes("long")) return "A long";
  if (lower.includes("pov") || lower.includes("point-of-view")) return "A point-of-view";
  if (lower.includes("two")) return "A two-shot";
  return `A ${framing.toLowerCase()}`;
}

/**
 * AUTOMATED IMAGE PROMPT ANATOMY FORMULA
 *
 * Segment 1 — Shot opening:
 *   {FRAMING_ARTICLE(composition.framing)} cinematic film still of {composition.focal_target}.
 *
 * Segment 2 — Action / kinetics:
 *   {performance_capture.active_kinetic_token}.
 *
 * Segment 3 — Technical + lighting:
 *   {composition.lens_profile}, {chroma_and_lighting.key_lighting}.
 *
 * Segment 4 — Environment / atmosphere:
 *   {chroma_and_lighting.environmental_vfx}.
 *
 * Segment 5 — Style suffix:
 *   Photorealistic {storyStyle} --ar 16:9
 */
export function buildImagePrompt(
  shot: CinematicShot,
  storyStyle = "cyber-noir style"
): string {
  const { composition, performance_capture, chroma_and_lighting } = shot;

  const seg1 = `${framingToArticle(composition.framing)} cinematic film still of ${composition.focal_target}`;
  const seg2 = performance_capture.active_kinetic_token;
  const seg3 = `${composition.lens_profile}, ${chroma_and_lighting.key_lighting}`;
  const seg4 = chroma_and_lighting.environmental_vfx;
  const seg5 = `Photorealistic ${storyStyle} --ar 16:9`;

  return `${seg1}. ${seg2}. ${seg3}. ${seg4}. ${seg5}`;
}
