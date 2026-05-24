/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { StoryOption, Blueprint } from "./types";
import { PRESEEDED_OPTIONS, PRESEEDED_BLUEPRINT, PRESEEDED_SCRIPT } from "./preseededData";
import { Phase1Discovery } from "./components/Phase1Discovery";
import { Phase2Blueprint } from "./components/Phase2Blueprint";
import { Phase3Script } from "./components/Phase3Script";
import { Clapperboard, HelpCircle, FileText, ChevronRight, Activity, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activePhase, setActivePhase] = useState<1 | 2 | 3>(1);
  const [selectedOption, setSelectedOption] = useState<StoryOption>(PRESEEDED_OPTIONS[0]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint>(PRESEEDED_BLUEPRINT);
  const [scriptText, setScriptText] = useState<string>(PRESEEDED_SCRIPT);

  const getDisplayCharacters = (option: StoryOption) => {
    if (!option) return [];
    if (option.characters && Array.isArray(option.characters)) {
      return (option.characters as any[]).map(c => ({
        name: c.identity?.name || c.name || "Character",
        role: c.identity?.archetype || c.role || "Role"
      }));
    }
    const sheets = option.step_1_and_2_cosmology_and_actors?.character_sheets || [];
    return sheets.map(s => ({
      name: s.name || "Character",
      role: s.role || "Role"
    }));
  };

  // When user clicks a selected option in Phase 1, we sync chosen option and proceed
  const handleSelectOption = (option: StoryOption) => {
    setSelectedOption(option);
    
    // Normalize fields for BOTH old layout and new Lego Bricks layout
    const charsList = option.characters && Array.isArray(option.characters)
      ? (option.characters as any[]).map(c => ({
          name: c.identity?.name || c.name || "Character",
          role: c.identity?.archetype || c.role || "Role",
          characterization: c.visuals?.core_body || c.characterization || "",
          true_character: c.psychology?.core || c.true_character || "",
          conscious_desire: c.motivation?.conscious_desire || c.conscious_desire || "",
          unconscious_desire: c.motivation?.unconscious_need || c.unconscious_desire || ""
        }))
      : (option.step_1_and_2_cosmology_and_actors?.character_sheets || []).map(c => ({
          name: c.name || "Character",
          role: c.role || "Role",
          characterization: c.characterization || "",
          true_character: c.true_character || "",
          conscious_desire: c.conscious_desire || "",
          unconscious_desire: c.unconscious_desire || ""
        }));

    const locDim = option.setting?.dimensions || option.step_1_and_2_cosmology_and_actors?.dimensions || {
      period: "Near-future",
      duration: "15 minutes",
      location: "Rooftop Bio-Dome Penthouse",
      conflict_level: "High Conflict"
    };

    const creativeLimitation = option.setting?.creative_limitation || option.step_1_and_2_cosmology_and_actors?.creative_limitation || "Confined inside greenhouse";

    const propsList = option.meaning?.props_sheet || option.step_3_and_4_meaning_and_props?.props_sheet || [];

    // Dynamically derive matching seed blueprint to prevent mismatch state
    const matchedBlueprint: Blueprint = { ...PRESEEDED_BLUEPRINT };
    matchedBlueprint.title = option.title;
    
    // Ensure both old and new layout elements exist inside matchedBlueprint
    matchedBlueprint.setting = option.setting || {
      dimensions: locDim,
      creative_limitation: creativeLimitation
    };
    matchedBlueprint.meaning = option.meaning || {
      controlling_idea: option.step_3_and_4_meaning_and_props?.controlling_idea || "",
      dialectical_debate: option.step_3_and_4_meaning_and_props?.dialectical_debate || { positive_idea: "", negative_counter_idea: "" },
      props_sheet: propsList
    };
    matchedBlueprint.characters = option.characters || [];

    // Fill the legacy fields as well to guarantee any downstream components don't log errors
    matchedBlueprint.step_1_and_2_cosmology_and_actors = {
      dimensions: locDim,
      creative_limitation: creativeLimitation,
      character_sheets: charsList
    };
    matchedBlueprint.step_3_and_4_meaning_and_props = {
      premise: option.meaning?.premise || option.step_3_and_4_meaning_and_props?.premise || "",
      controlling_idea: option.meaning?.controlling_idea || option.step_3_and_4_meaning_and_props?.controlling_idea || "",
      dialectical_debate: option.meaning?.dialectical_debate || option.step_3_and_4_meaning_and_props?.dialectical_debate || { positive_idea: "", negative_counter_idea: "" },
      props_sheet: propsList
    };

    // Build matching scenes sequence
    if (option.option_id !== 1) {
      const char1 = charsList[0] || { name: "Saboteur", role: "Saboteur" };
      const char2 = charsList[1] || { name: "Target", role: "Target" };
      const prop1 = propsList?.[0] || { name: "Device", description: "device" };
      const prop2 = propsList?.[1] || { name: "Interface", description: "interface" };

      matchedBlueprint.step_5a_sequence_map = {
        act_one_sequences: [
          {
            sequence_id: "A1_S1",
            act: "ACT ONE",
            actLabel: "Set-Up",
            title: "Establishing the Trap",
            setting_macro: `${locDim.location || "Preserved Sanctuary"} - Night`,
            themeFocus: "Control - Isolation",
            dramatic_arc: "Establishing superficial harmony shifting to acute tension.",
            scenes: [
              {
                scene_number: 1,
                setting_micro: `Near the ${prop1.name}`,
                scene_objective: `Establish a false sense of comfort and introduce the ${prop1.name}.`,
                opening_value: "Polite Concord",
                closing_value: "Subtle Apprehension",
                narrative_action: `The characters spar verbally as ${char1.name} prepares the ${prop1.name}.`,
                visualDesc: `A highly responsive environment: ${creativeLimitation}`
              }
            ]
          }
        ],
        act_two_sequences: [
          {
            sequence_id: "A2_S1",
            act: "ACT TWO",
            actLabel: "Confrontation",
            title: "The Climactic Test",
            setting_macro: locDim.location || "Sanctuary",
            themeFocus: "Tension - Micro-Sovereignty",
            dramatic_arc: "The environment exposes the internal physiological lie.",
            scenes: [
              {
                scene_number: 2,
                setting_micro: `Sensing biometrics via ${prop2.name}`,
                scene_objective: `${char1.name} executes the strategic move with ${prop1.name} while ${char2.name} probes their mask.`,
                opening_value: "Protected Mask",
                closing_value: "Severe Exposure",
                narrative_action: `Sensing elevated respiration of ${char1.name}, the automated scanner flares with color shifts.`,
                visualDesc: `Bioluminescence reactive to ${char1.name}'s heart rate indicator.`
              }
            ]
          }
        ],
        act_three_sequences: [
          {
            sequence_id: "A3_S1",
            act: "ACT THREE",
            actLabel: "Resolution",
            title: "The Swapped Toast",
            setting_macro: locDim.location || "Sanctuary",
            themeFocus: "Sovereignty Reclaimed",
            dramatic_arc: "Sovereignty reclaimed through fatal choice.",
            scenes: [
              {
                scene_number: 3,
                setting_micro: "The final direct standoff",
                scene_objective: "The clinical standoff resolved through tragic exchange.",
                opening_value: "Controlled Lock",
                closing_value: "Sovereign Expiation",
                narrative_action: `Swapping items, ${char1.name} and ${char2.name} decide their fates together. The smart systems flare in warning.`,
                visualDesc: `Bioluminescent feedback reflecting the heavy consequences.`
              }
            ]
          }
        ]
      };
      matchedBlueprint.step_5b_subtextual_beat_sheets = [
        {
          target_sequence_id: "A1_S1",
          scene_number: 1,
          micro_blueprint: {
            scene_objective: `Settle into role while dealing with ${prop1.name}`,
            opening_value: "Stable",
            closing_value: "Tension",
            subtextual_beat_progression: [
              {
                beat_number: 1,
                action: `${char1.name}: Concealing tremors while looking at ${prop1.name}.`,
                reaction: `${char2.name}: Rotating biometric accessories, testing boundaries.`,
                text: `This environment represents our future. We must trust what is automated.`,
                status: "Superficial harmony. Heartrate 74bpm.",
                visual_flora: "Flora remains steady pale lavender, reflecting cool quietness."
              },
              {
                beat_number: 2,
                action: `${char1.name}: Quietly shifting the position of ${prop1.name}.`,
                reaction: `${char2.name}: Adjusting focus directly, locking eyes.`,
                text: `Automated designs have zero sense of guilt. Human intentions are far more fragile.`,
                status: "Tension creeps. Heartrate 94bpm.",
                visual_flora: "Canopy orchids turn deep violet, reacting to humidity shifts."
              }
            ]
          }
        },
        {
          target_sequence_id: "A2_S1",
          scene_number: 2,
          micro_blueprint: {
            scene_objective: "Force the chemical exchange of elements.",
            opening_value: "Standoff",
            closing_value: "Collapse",
            subtextual_beat_progression: [
              {
                beat_number: 3,
                action: `${char1.name}: Manipulating the vents near ${prop2.name}.`,
                reaction: `${char2.name}: Accessing bio-filters, challenging loyalty.`,
                text: "Let us drink from the same source. Tell me: where does your true loyalty reside?",
                status: "Panic registered. Heartrate 114bpm.",
                visual_flora: "Environmental systems erupt in blazing orange mist."
              }
            ]
          }
        },
        {
          target_sequence_id: "A3_S1",
          scene_number: 3,
          micro_blueprint: {
            scene_objective: "Complete the exchange of elements.",
            opening_value: "Tragedy",
            closing_value: "Sovereignty",
            subtextual_beat_progression: [
              {
                beat_number: 4,
                action: `${char1.name}: Exhaling completely, choosing the path of self-sacrifice.`,
                reaction: `${char2.name}: Accepting the swapped vessels with a steady gaze.`,
                text: "To clear coordinates, free from corporate filters. We go together.",
                status: "Final resolution. Heartrate 132bpm.",
                visual_flora: "The bulkhead sensors explode in wild, spectacular defensive crimson petals!"
              }
            ]
          }
        }
      ];
      matchedBlueprint.step_6_master_logline = `Sealed inside the ${locDim.location}, ${char1.role} ${char1.name} must use the ${prop1.name} against ${char2.name}, triggering biometric sensors that write their secrets in the environment above.`;
    }

    setSelectedBlueprint(matchedBlueprint);
    setActivePhase(2);
  };

  const handleSelectBlueprint = (blueprint: Blueprint) => {
    setSelectedBlueprint(blueprint);
    setActivePhase(3);
  };

  const handleUpdateScriptText = (text: string) => {
    setScriptText(text);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#08080a] text-gray-200 flex flex-col font-sans select-text">
      {/* Decorative clean background mesh inside workspace */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-orange-950/5 to-transparent pointer-events-none z-0" />

      {/* Main Container Frame - Immersive layout with precise border styling */}
      <div className="w-full max-w-7xl mx-auto my-3 bg-[#08080a] border border-white/10 rounded-2xl flex flex-col shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)] z-10 relative overflow-hidden" style={{ height: "calc(100vh - 24px)" }}>
        
        {/* Top Navigation Header */}
        <nav className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-orange-600 rounded-sm flex items-center justify-center font-bold text-white tracking-tighter">IS</div>
            <div>
              <h1 className="text-sm font-bold tracking-widest uppercase text-white">Infinite Studio</h1>
              <p className="text-[10px] text-orange-500 uppercase tracking-widest leading-none">Screenwriting Playbook v4.1</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-2">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                ID: SBR-992
              </div>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-emerald-500 uppercase tracking-tighter">
                Status: {activePhase === 1 ? "Discovery Phase" : activePhase === 2 ? "Blueprint Assembled" : "Script Compiled"}
              </div>
            </div>
            
            {/* Top Shortcut actions */}
            <button 
              onClick={() => setActivePhase(3)}
              className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-orange-500 transition-colors cursor-pointer"
            >
              Generate Script
            </button>
          </div>
        </nav>

        {/* Outer Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar: Phase Navigation */}
          <aside className="w-full md:w-16 border-b md:border-b-0 md:border-r border-white/10 flex md:flex-col items-center py-4 md:py-8 justify-around md:justify-start gap-4 md:gap-10 shrink-0 bg-[#0a0a0d]">
            <div onClick={() => setActivePhase(1)} className="group cursor-pointer relative">
              <div className={`w-10 h-10 rounded-lg border transition-all flex items-center justify-center ${
                activePhase === 1
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                  : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
              }`}>
                <span className="text-xs font-bold">01</span>
              </div>
              <div className="absolute left-1/2 md:left-14 top-12 md:top-2 -translate-x-1/2 md:translate-x-0 px-2 py-1 bg-black border border-white/10 text-[9px] uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-50 rounded shadow-md pointer-events-none">
                Discovery
              </div>
            </div>

            <div onClick={() => setActivePhase(2)} className="group cursor-pointer relative">
              <div className={`w-10 h-10 rounded-lg border transition-all flex items-center justify-center ${
                activePhase === 2
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                  : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
              }`}>
                <span className="text-xs font-bold">02</span>
              </div>
              <div className="absolute left-1/2 md:left-14 top-12 md:top-2 -translate-x-1/2 md:translate-x-0 px-2 py-1 bg-black border border-white/10 text-[9px] uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-50 rounded shadow-md pointer-events-none">
                Pre-Prod Blueprint
              </div>
            </div>

            <div onClick={() => setActivePhase(3)} className="group cursor-pointer relative">
              <div className={`w-10 h-10 rounded-lg border transition-all flex items-center justify-center ${
                activePhase === 3
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                  : "border-white/10 bg-white/5 text-gray-500 hover:border-white/20"
              }`}>
                <span className="text-xs font-bold">03</span>
              </div>
              <div className="absolute left-1/2 md:left-14 top-12 md:top-2 -translate-x-1/2 md:translate-x-0 px-2 py-1 bg-black border border-white/10 text-[9px] uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-50 rounded shadow-md pointer-events-none">
                Screenplay Draft
              </div>
            </div>

            {/* Glowing Progress indicator slider (Desktop only) */}
            <div className="hidden md:block mt-auto mb-4">
              <div className="w-1 h-32 bg-white/5 rounded-full relative overflow-hidden">
                <div 
                  className="absolute top-0 w-full bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.8)] transition-all duration-350"
                  style={{
                    height: activePhase === 1 ? "33%" : activePhase === 2 ? "66%" : "100%"
                  }}
                />
              </div>
            </div>
          </aside>

          {/* Main Integrated Workspace Structure */}
          <main className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Phase Blueprint Data / Interactive Main Center */}
            <section className="col-span-12 lg:col-span-8 p-6 flex flex-col gap-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/10 bg-gradient-to-br from-[#0e0e12] to-[#08080a] min-h-[500px]">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-orange-500 font-bold mb-1 block">
                    {activePhase === 1 ? "Phase 1: Cosmology Discovery" : activePhase === 2 ? "Phase 2: Pre-Production Design" : "Phase 3: Screenplay Execution"}
                  </span>
                  <h2 className="text-2xl font-light text-white tracking-tight">
                    {selectedOption?.title || "Story Blueprint Engine"}
                  </h2>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase block">Active Target ID</span>
                  <span className="text-xs font-mono text-gray-400 font-semibold uppercase">OPTION-0{selectedOption?.option_id || 1}</span>
                </div>
              </div>

              {/* Viewport for Interactive Phases */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePhase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="outline-none"
                >
                  {activePhase === 1 && (
                    <Phase1Discovery
                      onSelectOption={handleSelectOption}
                      selectedOptionId={selectedOption?.option_id}
                    />
                  )}

                  {activePhase === 2 && (
                    <Phase2Blueprint
                      chosenOption={selectedOption}
                      onSelectBlueprint={handleSelectBlueprint}
                      selectedBlueprint={selectedBlueprint}
                    />
                  )}

                  {activePhase === 3 && (
                    <Phase3Script
                      blueprint={selectedBlueprint}
                      selectedScriptText={scriptText}
                      onUpdateScriptText={handleUpdateScriptText}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* Immersive Sidebar: Diagnostics, Biological Output & Live JSON database sync */}
            <aside className="col-span-12 lg:col-span-4 bg-[#0a0a0e] p-6 flex flex-col gap-6 overflow-y-auto border-t lg:border-t-0 border-white/10">
              
              {/* Telemetry Indicator Widget */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">
                    Biochemical Flora Output
                  </h5>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${selectedOption?.option_id === 3 ? "bg-red-500" : selectedOption?.option_id === 2 ? "bg-amber-500" : "bg-emerald-500"}`} />
                </div>

                {/* Elegant dynamic vertical bars */}
                <div className="flex items-end justify-between gap-1 h-28 px-2 border-b border-white/5 pb-2">
                  <div 
                    className="w-full bg-orange-600/30 rounded-t-sm border-t border-orange-500 transition-all duration-700"
                    style={{ height: selectedOption?.option_id === 3 ? "55%" : selectedOption?.option_id === 2 ? "40%" : "20%" }}
                  />
                  <div 
                    className="w-full bg-orange-600/30 rounded-t-sm border-t border-orange-500 transition-all duration-700" 
                    style={{ height: selectedOption?.option_id === 3 ? "75%" : selectedOption?.option_id === 2 ? "60%" : "35%" }}
                  />
                  <div 
                    className="w-full bg-orange-600/30 rounded-t-sm border-t border-orange-500 transition-all duration-700" 
                    style={{ height: selectedOption?.option_id === 3 ? "45%" : selectedOption?.option_id === 2 ? "55%" : "30%" }}
                  />
                  <div 
                    className={`w-full rounded-t-sm border-t transition-all duration-700 ${
                      selectedOption?.option_id === 3 
                        ? "bg-red-600/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] h-[85%]" 
                        : selectedOption?.option_id === 2
                        ? "bg-orange-600/40 border-orange-500 h-[65%]"
                        : "bg-emerald-600/30 border-emerald-500 h-[45%]"
                    }`}
                  />
                  <div 
                    className="w-full bg-orange-600/30 rounded-t-sm border-t border-orange-500 transition-all duration-700" 
                    style={{ height: selectedOption?.option_id === 3 ? "80%" : selectedOption?.option_id === 2 ? "70%" : "60%" }}
                  />
                  <div 
                    className="w-full bg-orange-600/30 rounded-t-sm border-t border-orange-500 transition-all duration-700" 
                    style={{ height: selectedOption?.option_id === 3 ? "70%" : selectedOption?.option_id === 2 ? "80%" : "45%" }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>STRESS INDEX: {selectedOption?.option_id === 3 ? "88.4%" : selectedOption?.option_id === 2 ? "58.1%" : "32.0%"}</span>
                  <span className={selectedOption?.option_id === 3 ? "text-red-500" : selectedOption?.option_id === 2 ? "text-amber-500" : "text-emerald-500"}>
                    {selectedOption?.option_id === 3 ? "CRITICAL SHIFT" : selectedOption?.option_id === 2 ? "WARNING ESCALATION" : "STEADY FLOW"}
                  </span>
                </div>
              </div>

              {/* Dynamic JSON Live Stream panel */}
              <div className="flex-1 flex flex-col bg-black/60 rounded-xl border border-white/10 overflow-hidden min-h-[300px]">
                <div className="bg-white/5 px-4 py-2 flex justify-between border-b border-white/10 items-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Blueprint State Engine</span>
                  <span className="text-[9px] font-mono text-emerald-500 uppercase flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Synchronized
                  </span>
                </div>
                
                <div className="p-4 overflow-auto font-mono text-[10px] text-emerald-500/80 leading-snug">
                  <pre className="whitespace-pre-wrap select-text selection:bg-emerald-950">
                    {JSON.stringify({
                      option_id: selectedOption?.option_id || 1,
                      title: selectedOption?.title || "",
                      step_3_and_4: {
                        premise: selectedOption?.meaning?.premise || selectedOption?.step_3_and_4_meaning_and_props?.premise || "",
                        controlling_idea: selectedOption?.meaning?.controlling_idea || selectedOption?.step_3_and_4_meaning_and_props?.controlling_idea || "",
                        dialectical_debate: {
                          positive: selectedOption?.meaning?.dialectical_debate?.positive_idea || selectedOption?.step_3_and_4_meaning_and_props?.dialectical_debate?.positive_idea || "",
                          negative: selectedOption?.meaning?.dialectical_debate?.negative_counter_idea || selectedOption?.step_3_and_4_meaning_and_props?.dialectical_debate?.negative_counter_idea || ""
                        },
                        props: (selectedOption?.meaning?.props_sheet || selectedOption?.step_3_and_4_meaning_and_props?.props_sheet || [])?.map(p => ({
                          name: p.name,
                          role: p.description
                        })) || []
                      }
                    }, null, 2)}
                  </pre>
                </div>

                {/* Subtext awareness indicators as requested from mockup */}
                <div className="mt-auto p-4 border-t border-white/5 space-y-3.5 bg-black/20">
                  {getDisplayCharacters(selectedOption).map((char, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-[9px] text-gray-500 mb-1 font-mono">
                        <span>ACTOR: {char.name.toUpperCase()}</span>
                        <span>UNCONSCIOUS DRIVE STATE: {index === 0 ? "92%" : "27%"}</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500/50 transition-all duration-1000" 
                          style={{ width: index === 0 ? "92%" : "27%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </main>
        </div>

        {/* Footer Status Bar matching layout exactly */}
        <footer className="h-10 border-t border-white/10 bg-black flex items-center px-6 justify-between text-[9px] font-mono tracking-tighter text-gray-500">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              ENGINE ONLINE
            </span>
            <span className="hidden sm:inline">McKee Narrative Architecture Layer: ACTIVE</span>
            <span className="hidden md:inline">Subtext Injection: CALIBRATED</span>
          </div>
          <div className="flex gap-4">
            <span>UTC 23:14:02</span>
            <span className="text-white">INFINITE_STUDIO_ALPHA</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

