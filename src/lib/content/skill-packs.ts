import type { KnowledgeStructureType } from "./knowledge-blueprint.ts";
import type { PatternType } from "../../types/schema.ts";

export type SupportedKnowledgeStructure = Exclude<KnowledgeStructureType, "unclassified">;

export interface KnowledgeStructureSkill {
  id: string;
  structure_type: SupportedKnowledgeStructure;
  teaching_requirements: string[];
  common_misconceptions: string[];
  forbidden_framings: string[];
  suitable_patterns: PatternType[];
  unsuitable_patterns: PatternType[];
  canonical_examples: string[];
}

// A Skill teaches a reusable knowledge structure. It never routes a topic or stores a prewritten lesson.
export const KNOWLEDGE_STRUCTURE_SKILLS: KnowledgeStructureSkill[] = [
  {
    id: "optimization-model",
    structure_type: "optimization_model",
    teaching_requirements: ["name what can be chosen", "state the objective", "make constraints visible", "compare feasible choices"],
    common_misconceptions: ["treating optimisation as a random draw", "changing a value without stating the constraint"],
    forbidden_framings: ["random prize", "fabricated numerical forecast"],
    suitable_patterns: ["system_builder", "parameter_explore", "comparison", "knowledge_check"],
    unsuitable_patterns: ["probability", "simulation_play"],
    canonical_examples: ["resource allocation", "production planning", "diet problem"],
  },
  {
    id: "system-process",
    structure_type: "system_process",
    teaching_requirements: ["identify actors", "follow a handoff", "separate normal and failure paths", "diagnose one boundary"],
    common_misconceptions: ["a system process is one lookup", "two actors have the same role"],
    forbidden_framings: ["one-step lookup", "single actor explains the whole process"],
    suitable_patterns: ["system_builder", "process_timeline", "classification_sort", "knowledge_check"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["DNS resolution", "payment checkout", "message queue"],
  },
  {
    id: "probabilistic-reasoning",
    structure_type: "probabilistic_reasoning",
    teaching_requirements: ["start with uncertainty", "weigh evidence", "update the judgment", "make a conditional decision"],
    common_misconceptions: ["new evidence erases the prior", "likelihood and conclusion are identical"],
    forbidden_framings: ["memorise a formula without a judgment", "investment jargon for non-finance topics"],
    suitable_patterns: ["probability", "parameter_explore", "concept_memory", "knowledge_check"],
    unsuitable_patterns: ["system_builder"],
    canonical_examples: ["medical test", "spam filtering", "weather forecast"],
  },
  {
    id: "historical-change",
    structure_type: "historical_change",
    teaching_requirements: ["show the starting condition", "identify the trigger", "separate drivers", "test a consequence"],
    common_misconceptions: ["one invention caused the whole change", "history is only a date list"],
    forbidden_framings: ["pure date memorisation", "single-cause explanation"],
    suitable_patterns: ["process_timeline", "classification_sort", "narrative_branch", "knowledge_check"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["industrial revolution", "urbanisation", "internet evolution"],
  },
  {
    id: "comparison-frame",
    structure_type: "comparison_frame",
    teaching_requirements: ["place the alternatives in one concrete question", "compare stable dimensions", "separate relevant reasons from noise", "apply the trade-off once"],
    common_misconceptions: ["comparison is only two definitions", "one option is always better", "past investment proves a future benefit"],
    forbidden_framings: ["always choose A", "always choose B", "fabricated numerical trend", "internal workflow labels"],
    suitable_patterns: ["narrative_branch", "comparison", "classification_sort", "knowledge_check"],
    unsuitable_patterns: ["probability", "simulation_play", "system_builder"],
    canonical_examples: ["TCP versus UDP", "renting versus buying", "whether to continue a failing option"],
  },
  {
    id: "classification-rule",
    structure_type: "classification_rule",
    teaching_requirements: ["state a sorting rule", "classify examples", "test a boundary case", "apply the rule again"],
    common_misconceptions: ["a category name is a rule", "borderline cases can be guessed by feel"],
    forbidden_framings: ["guess by name only", "claim drag-and-drop when the UI uses category choices"],
    suitable_patterns: ["classification_sort", "knowledge_check", "concept_memory", "narrative_branch"],
    unsuitable_patterns: ["probability"],
    canonical_examples: ["waste sorting", "HTTP status codes", "customer segmentation"],
  },
  {
    id: "causal-mechanism",
    structure_type: "causal_mechanism",
    teaching_requirements: ["identify a condition and mechanism", "change one condition", "compare consequences", "choose a plausible intervention"],
    common_misconceptions: ["correlation alone proves causation", "one factor explains everything"],
    forbidden_framings: ["single-cause explanation", "unverifiable numerical simulation", "raw factor/effect labels"],
    suitable_patterns: ["system_builder", "parameter_explore", "narrative_branch", "knowledge_check"],
    unsuitable_patterns: ["simulation_play"],
    canonical_examples: ["supply and demand", "network effects", "habit formation"],
  },
  {
    id: "procedure-algorithm",
    structure_type: "procedure_algorithm",
    teaching_requirements: ["state the repeated rule", "order a state change", "retain an invariant", "test a boundary"],
    common_misconceptions: ["an algorithm is only code syntax", "edge cases do not matter"],
    forbidden_framings: ["memorise code only", "unverifiable numerical simulation"],
    suitable_patterns: ["process_timeline", "classification_sort", "concept_memory", "knowledge_check"],
    unsuitable_patterns: ["probability", "simulation_play"],
    canonical_examples: ["binary search", "merge sort", "shortest-path search"],
  },
];

export const KNOWLEDGE_SKILL_PACKS = KNOWLEDGE_STRUCTURE_SKILLS;

export function getKnowledgeSkill(structureType?: KnowledgeStructureType) {
  if (!structureType || structureType === "unclassified") return undefined;
  return KNOWLEDGE_STRUCTURE_SKILLS.find((skill) => skill.structure_type === structureType);
}

export function getKnowledgeSkillById(id?: string) {
  if (!id) return undefined;
  return KNOWLEDGE_STRUCTURE_SKILLS.find((skill) => skill.id === id);
}

export function formatKnowledgeSkillContract(skill: KnowledgeStructureSkill) {
  return [
    "Structure Skill: " + skill.id,
    "Structure type: " + skill.structure_type,
    "Teaching requirements: " + skill.teaching_requirements.join(" -> "),
    "Recommended Pattern family: " + skill.suitable_patterns.join(" -> "),
    "Avoid Pattern family: " + (skill.unsuitable_patterns.join(", ") || "none"),
    "Correct these misconceptions: " + skill.common_misconceptions.join("; "),
    "Do not frame the topic as: " + (skill.forbidden_framings.join("; ") || "none"),
    "Example domains: " + skill.canonical_examples.join(", "),
    "The ConceptPlan supplies topic-specific grounding terms. Do not expose structure roles, internal labels, or examples as learner-facing lesson copy.",
  ].join("\n");
}
