import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { verifyToken, resolveAccessTier, checkAndIncrementUsage } from "./server/supabaseAdmin";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 5000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to sanitize JSON response from Gemini
function cleanJSONString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

// Lazy initialization of GoogleGenAI to prevent crashing if the key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set in Secrets. Using high-fidelity pre-compiled story simulation.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Config endpoint — exposes public Supabase credentials to the browser
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  });
});

// API endpoint to check if Gemini key is available
app.get("/api/gemini-check", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({ hasKey });
});

// Phase 1: Generate customized story options
app.post("/api/generate-phase1", async (req, res) => {
  const { customizedPremise } = req.body;
  const targetPremise = customizedPremise || "What if a high-ranking corporate saboteur is forced to execute a quiet chemical poisoning during a high-stakes dinner inside a smart, hermetic greenhouse that visually manifests human stress hormones?";

  try {
    const ai = getGeminiClient();
    const prompt = `You are an elite, award-winning Hollywood screenwriter and script analyst. Your creative process is governed by the narrative architecture of Robert McKee (Story) and Stanislavskian behavioral subtext.

We are starting PHASE 1: THE COSMOLOGY & THE DIGITAL ACTORS of our short film script pipeline.
Analyze this customizable premise:
"${targetPremise}"

Generate THREE distinct narrative directions for this setup. For each option, you must output a raw, well-structured JSON array matching this exact structural schema:

[
  {
    "option_id": 1,
    "title": "Story Title Here",
    "setting": {
      "dimensions": { 
        "period": "E.g., Near-future corporate espionage era", 
        "duration": "E.g., 15 minutes in real-time", 
        "location": "E.g., Rooftop Bio-Dome Penthouse", 
        "conflict_level": "E.g., Extra-personal & Personal Conflict" 
      }, 
      "creative_limitation": "E.g., Confined to a single dining table set inside a hyper-responsive greenhouse"
    }, 
    "meaning": { 
      "controlling_idea": "Value + Cause (How the climax is resolved)", 
      "dialectical_debate": { 
        "positive_idea": "The belief validating the protagonist's starting mask", 
        "negative_counter_idea": "The opposing truth forcing vulnerability" 
      }, 
      "props_sheet": [
        { "name": "Prop Name", "description": "How it acts as an dynamic narrative catalyst" }
      ] 
    },
    "characters": [
      {
        "id": "char_1",
        "identity": {
          "name": "Character Name",
          "archetype": "E.g., The Saboteur, The Fallen Sentinel",
          "cast_orbit": "Protagonist (Core Star)",
          "gravity": "Core narrative goal/purpose",
          "foil_relationship": "Contrast with other character (e.g., char_2)",
          "pov": "Reliable or Unreliable Observer status",
          "scale_class": "Class A [Human] / Class B [Small] / Class C [Massive]",
          "height": "E.g., 180cm"
        },
        "visuals": {
          "core_body": "Physical description (Age, build, skin tone, features)",
          "material_texture": "CGI rendering texture keywords (pores, specularity, subsurface scattering)",
          "wardrobe": {
            "outer_mask": "Formal attire reflecting public social persona",
            "inner_vulnerability": "Softer interior apparel details",
            "accessories": "Key permanent items (e.g. smart rings, tremor devices)"
          },
          "negative_prompt": "Unwanted items to exclude during image rendering"
        },
        "kinetics": {
          "posture": "Physical stance and skeletal arrangement",
          "weight_distribution": "Body weight allocation during movements",
          "gait": "Standard walk cycle cadence",
          "gesture_vocabulary": "Subtle tics, hand adjustments, or nervous habits",
          "micro_movements": "CGI facial/eye adjustments",
          "reaction_tempo": "Response latency (e.g., 200ms lag under pressure)"
        },
        "cinematics": {
          "framing": "Optimal framing (e.g., ECU or Medium Close-Up)",
          "color_palette": ["primary hex", "secondary hex", "climax alert color"],
          "lighting": "Cinematography key lights"
        },
        "audio": {
          "voice_identity": {
            "sonic_anchor": "Voice blending (e.g., Cillian Murphy's cold cadence + George Clooney's warm register)",
            "voice_clone_id": "eleven_labs_voice_preset_or_cloning_seed"
          },
          "performance_styling": {
            "timbre": "Tonal modifiers (gravelly, melodic, soft rasp)",
            "tempo": "Verbal pacing and presence of dramatic pauses"
          },
          "state_telemetry": {
            "neutral_state": {
              "stability": 75,
              "similarity_boost": 75,
              "style_exaggeration": 15,
              "stress_cues": "Even breathing, structured articulation"
            },
            "tension_state": {
              "stability": 50,
              "similarity_boost": 75,
              "style_exaggeration": 35,
              "stress_cues": "Slight micro-pauses, swallowing hard between sentences"
            },
            "panic_state": {
              "stability": 30,
              "similarity_boost": 75,
              "style_exaggeration": 65,
              "stress_cues": "Voice cracking under strain, shallow rapid exhalations"
            }
          },
          "monologue_script": "A 15-20 second monologue script explaining the character's worldview"
        },
        "psychology": {
          "social": "Public mask",
          "personal": "True personality traits",
          "core": "Underlying motivation center",
          "hidden": "Hidden trauma or repression"
        },
        "metrics": {
          "personality": { "openness": 70, "conscientiousness": 80, "extraversion": 40, "agreeableness": 50, "neuroticism": 60 },
          "quotients": { "iq": 120, "eq": 100, "pq": 90, "cq": 110 }
        },
        "motivation": {
          "drive": "Primal drive state",
          "signature_move": "Unique cognitive adjustment tactic",
          "litmus_test": "Action synthesis formula",
          "conscious_desire": "The Spine",
          "unconscious_need": "The contradiction",
          "empathy_hook": "Core piece of vulnerability",
          "dilemma_type": "Irreconcilable Goods / Lesser of Evils",
          "dilemma_desc": "Main climax dilemma description",
          "cinematic_proof": "Brief physical scene depicting signature tactic"
        },
        "arc": {
          "trajectory": "The trajectory path",
          "step_1_preparation": "Initial unexpressed void",
          "step_2_revelation": "Mask stripped detail",
          "step_3_change": "Transition events",
          "step_4_completion": "Fulfillment action"
        },
        "prompts": {
          "master_visual_reference": {
            "character_name": "Character Name",
            "core_keywords_used": "Body + Material keywords",
            "master_grid_prompt": "Ultra-detailed reference grid prompt instructions"
          }
        }
      }
    ]
  }
]

Reject all surface-level tropes and empty exposition. Output ONLY the raw JSON. Do not include markdown wraps or prefixing.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an elite Hollywood script analyst. Analyze the customizable premise and generate exactly three McKee-compliant story directions matching the Lego Character Profile schema in JSON.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini.");
    }
    
    const parsed = JSON.parse(cleanJSONString(text));
    res.json({ success: true, options: parsed });
  } catch (error: any) {
    console.error("Gemini Phase 1 generation failed:", error.message);
    res.status(200).json({
      success: false,
      error: error.message,
      message: "Could not talk to AI backend or API key is missing. Loading pre-seeded options.",
    });
  }
});

// Phase 2: Generate Blueprint from Selected Option
app.post("/api/generate-phase2", async (req, res) => {
  const { chosenOption } = req.body;

  if (!chosenOption) {
    return res.status(400).json({ error: "Missing chosenOption payload." });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `We are proceeding to PHASE 2: THE PRE-PRODUCTION BLUEPRINT & STRUCTURAL SCENE DESIGN.
Expand this chosen story direction into a tightly proportional, multi-sequence framework spanning Act One, Act Two, and Act Three.
You are strictly forbidden from leaving "story vacuums" in Act 1 or Act 3. Use the generated Lego characters array to structure the sequences and make actor subtext beat sheets hyper-specific.

Here is the locked Phase 1 data:
${JSON.stringify(chosenOption, null, 2)}

Your task is to expand this concept into a structural scene map with interactive beats.
Output a single, consolidated JSON block matching this exact structural schema:

{
  "title": "${chosenOption.title}",
  "setting": ${JSON.stringify(chosenOption.setting || {})},
  "meaning": ${JSON.stringify(chosenOption.meaning || {})},
  "characters": ${JSON.stringify(chosenOption.characters || [])},
  "sequences": {
    "act_one_sequences": [ 
      { 
        "sequence_id": "A1_S1", 
        "act": "ACT ONE",
        "actLabel": "Set-Up",
        "title": "Sequence Title Here", 
        "setting_macro": "Location here", 
        "themeFocus": "E.g., Control - Isolation - Illusion",
        "dramatic_arc": "Description of the value shift", 
        "scenes": [ 
          { 
            "scene_number": 1, 
            "setting_micro": "E.g., Boardroom Chair - ECU", 
            "scene_objective": "What character_1 physically wants (Reference character ID like char_1 wants...)", 
            "opening_value": "Starting value", 
            "closing_value": "Ending value", 
            "narrative_action": "Action colliding to open the gap (reference character's signature move)",
            "visualDesc": "Detailed stylistic layout of setting_macro"
          } 
        ]
      } 
    ], 
    "act_two_sequences": [ /* sequences with scenes matching Act 2 mapping */ ], 
    "act_three_sequences": [ /* sequences with scenes matching Act 3 Climax mapping */ ] 
  }, 
  "beats": [ 
    { 
      "target_sequence_id": "A1_S1", 
      "scene_number": 1, 
      "micro_blueprint": { 
        "scene_objective": "Scene objective", 
        "opening_value": "Opening value status", 
        "closing_value": "Closing value status", 
        "subtextual_beat_progression": [ 
          { 
            "beat_number": 1, 
            "action": "E.g. char_1: FEIGNING ACCOUNTABILITY while compulsively turning his signet ring", 
            "reaction": "E.g. char_2: MANAGING THE TRAP, her eyes tracking his hand movements",
            "text": "The literal spoken mask line here",
            "vocal_state": "The precise active vocal state (neutral_state / tension_state / panic_state)",
            "status": "Psychological tension, heartrate, somatic tremors",
            "visual_flora": "Greenhouse flora colors reacting to stress metrics"
          } 
        ] 
      } 
    }
  ], 
  "logline": "Compile a single, high-velocity McKee master logline stating protagonist, incident, spine, and central ironic stakes."
}

Generate detailed beat_progressions (minimum 3 beats per scene) for ALL scenes across Acts I, II, and III. Make sure every beat features active, capitalized gerund subtext tags and references vocal_state values. Ensure output is strictly Valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a master script designer. Return the pre-production blueprint exactly matching the structural JSON schema provided including vocal state mappings.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response.");
    }

    const parsed = JSON.parse(cleanJSONString(text));
    res.json({ success: true, blueprint: parsed });
  } catch (error: any) {
    console.error("Gemini Phase 2 generation failed:", error.message);
    res.status(200).json({
      success: false,
      error: error.message,
      message: "AI Blueprint layout skipped, loaded seed data.",
    });
  }
});

// Phase 3: Generate Screenplay Text
app.post("/api/generate-phase3", async (req, res) => {
  const { blueprint } = req.body;

  if (!blueprint) {
    return res.status(400).json({ error: "Missing blueprint data." });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `We are proceeding to PHASE 3: THE SCRIPT EXECUTION. 

Here is our locked, consolidated Pre-Production JSON Blueprint featuring Unified Audio Telemetry specifications:
${JSON.stringify(blueprint, null, 2)}

Write the final, production-ready screenplay based strictly on this data structure. Adhere to the following structural and stylistic execution laws:

1. FORMAT: Use flawless, standard screenplay layout. Use uppercase for CHARACTER NAMES in dialogue headings and action line introductions. Use parentheticals to denote active vocal stress states (neutral_state, tension_state, or panic_state) accompanied by stress_cues (e.g., "voice cracking under strain, shallow breathy gasping") to guide sound rendering.
2. DIALOGUE SUBTEXT CONSTRAINT: Every line of spoken text must act as a diplomatic surface mask. Dialogue must naturally deliver the exact step-by-step psychological agendas mapped out in your subtextual_beat_progression gerund tags. Characters must never speak their inner truths until the script hits the raw, mask-shattering explosion of the Story Climax.
3. KINETIC PHYSICALITY: Weave posture and kinetic body shifts (as described in each character's kinetic profiles) directly into action descriptions, replacing dry exposition with physical somatic gestures.
4. VARIATION: Alternate rapid, visual action blocks describing environmental and physical changes with expansive, emotionally dense subtextual confrontations.
5. THEMATIC TRANSITIONS: Link consecutive scenes using standard sensory hinges or word contrasts.

Include the visual_flora color shifts (e.g., violet, pale yellow, mottled, defensive crimson) in the action blocks to visually represent the characters' sweat and adrenaline changes. Begin the script immediately.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    res.json({ success: true, script: response.text });
  } catch (error: any) {
    console.error("Gemini Phase 3 generation failed:", error.message);
    res.status(200).json({
      success: false,
      error: error.message,
      message: "Selected seed screenplays rendered.",
    });
  }
});

// Phase 4: Generate visual asset via Higgsfield
app.post("/api/generate-visual", async (req, res) => {
  // Auth + usage check
  const userId = await verifyToken(req.headers.authorization);
  if (userId) {
    const tier = await resolveAccessTier(userId);
    const check = await checkAndIncrementUsage(userId, "character_grids_used", tier);
    if (!check.allowed) {
      return res.status(403).json({ success: false, limitReached: true, message: `Character grid limit reached (${check.limit}/month).` });
    }
  }

  const { assetId, prompt, negativePrompt } = req.body;
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const secret = process.env.HIGGSFIELD_SECRET;

  if (!apiKey || !secret) {
    return res.status(200).json({
      success: false,
      needsApiKey: true,
      message: "HIGGSFIELD_API_KEY and HIGGSFIELD_SECRET are required in Replit Secrets."
    });
  }

  const higgsfieldBody: Record<string, any> = {
    prompt,
    model: "soul",
    num_images: 1,
    aspect_ratio: "16:9",
  };
  if (negativePrompt) higgsfieldBody.negative_prompt = negativePrompt;

  try {
    const response = await fetch("https://api.higgsfield.ai/v1/images/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-Secret": secret,
      },
      body: JSON.stringify(higgsfieldBody),
    });
    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const raw = await response.text();
      console.error("Higgsfield visual: unexpected non-JSON response", raw.slice(0, 200));
      return res.json({ success: false, message: `Higgsfield returned HTTP ${response.status}` });
    }
    const data = await response.json() as any;
    if (data.job_id || data.images) {
      res.json({ success: true, jobId: data.job_id, imageUrl: data.images?.[0]?.url });
    } else {
      res.json({ success: false, message: data.error || data.message || "Higgsfield returned no data." });
    }
  } catch (error: any) {
    console.error("Higgsfield visual generation failed:", error.message);
    res.json({ success: false, message: error.message });
  }
});

// Phase 5: Generate shot image or video via Higgsfield Seedance 2.0
app.post("/api/generate-shot", async (req, res) => {
  // Auth + usage check
  const userId = await verifyToken(req.headers.authorization);
  if (userId) {
    const tier = await resolveAccessTier(userId);
    const field = (req.body.type === "video") ? "video_promotions_used" : "shot_generations_used";
    const check = await checkAndIncrementUsage(userId, field, tier);
    if (!check.allowed) {
      return res.status(403).json({ success: false, limitReached: true, message: `Limit reached (${check.limit}/month).` });
    }
  }

  const { shotId, prompt, type, imageUrl } = req.body;
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const secret = process.env.HIGGSFIELD_SECRET;

  if (!apiKey || !secret) {
    return res.status(200).json({
      success: false,
      needsApiKey: true,
      message: "HIGGSFIELD_API_KEY and HIGGSFIELD_SECRET are required in Replit Secrets."
    });
  }

  try {
    if (type === "image") {
      const response = await fetch("https://api.higgsfield.ai/v1/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Secret": secret,
        },
        body: JSON.stringify({ prompt, model: "soul", num_images: 1, aspect_ratio: "16:9" }),
      });
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await response.text();
        console.error("Higgsfield shot/image: non-JSON", raw.slice(0, 200));
        return res.json({ success: false, message: `Higgsfield returned HTTP ${response.status}` });
      }
      const data = await response.json() as any;
      res.json({ success: true, jobId: data.job_id, imageUrl: data.images?.[0]?.url });
    } else {
      // Video via Seedance 2.0
      const response = await fetch("https://api.higgsfield.ai/v1/videos/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Secret": secret,
        },
        body: JSON.stringify({ prompt, model: "seedance-2.0", image_url: imageUrl, duration: 5 }),
      });
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const raw = await response.text();
        console.error("Higgsfield shot/video: non-JSON", raw.slice(0, 200));
        return res.json({ success: false, message: `Higgsfield returned HTTP ${response.status}` });
      }
      const data = await response.json() as any;
      res.json({ success: true, jobId: data.job_id, videoUrl: data.video_url });
    }
  } catch (error: any) {
    console.error("Higgsfield shot generation failed:", error.message);
    res.json({ success: false, message: error.message });
  }
});

// Job status polling
app.get("/api/job-status/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const secret = process.env.HIGGSFIELD_SECRET;

  if (!apiKey || !secret) {
    return res.status(200).json({ success: false, needsApiKey: true });
  }

  try {
    const response = await fetch(`https://api.higgsfield.ai/v1/jobs/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}`, "X-Secret": secret },
    });
    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const raw = await response.text();
      console.error("Higgsfield job-status: non-JSON", raw.slice(0, 200));
      return res.json({ success: false, message: `Higgsfield returned HTTP ${response.status}` });
    }
    const data = await response.json() as any;
    res.json({ success: true, status: data.status, result: data.result });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
