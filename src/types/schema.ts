export type UISchemaType =
  | "gacha_simulator"
  | "slider_explorer"
  | "card_flip"
  | "timeline_scrubber"
  | "comparison_split"
  | "quiz_battle"
  | "build_sandbox"
  | "narrative_branch"
  | "classification_sort"
  | "simulation_play";

export type PatternType =
  | "probability"
  | "parameter_explore"
  | "concept_memory"
  | "process_timeline"
  | "comparison"
  | "knowledge_check"
  | "system_builder"
  | "narrative_branch"
  | "classification_sort"
  | "simulation_play";

export type TemplateId =
  | "card_flip_reveal"
  | "single_slider"
  | "term_cards"
  | "horizontal_timeline"
  | "split_panel"
  | "single_question"
  | "module_sandbox"
  | "branch_story"
  | "category_buckets"
  | "parameter_simulation";

export type UIPayload<TPayload = Record<string, unknown>> = TPayload;

export interface V1UISchema<TConfig = Record<string, unknown>> {
  type: UISchemaType;
  version: string;
  config: TConfig;
  pattern?: never;
  template?: never;
  payload?: never;
}

export interface V2UISchema<TPayload = Record<string, unknown>> {
  pattern: PatternType;
  template: TemplateId;
  version: string;
  payload: UIPayload<TPayload>;
  type?: UISchemaType;
  config?: never;
}

export type UISchema<TData = Record<string, unknown>> = V1UISchema<TData> | V2UISchema<TData>;

export interface NormalizedUISchema<TConfig = Record<string, unknown>> {
  type: UISchemaType;
  pattern: PatternType;
  template: TemplateId;
  version: string;
  config: TConfig;
}

export const V1_TO_V2_SCHEMA_MAP: Record<
  UISchemaType,
  { pattern: PatternType; template: TemplateId }
> = {
  gacha_simulator: { pattern: "probability", template: "card_flip_reveal" },
  slider_explorer: { pattern: "parameter_explore", template: "single_slider" },
  card_flip: { pattern: "concept_memory", template: "term_cards" },
  timeline_scrubber: { pattern: "process_timeline", template: "horizontal_timeline" },
  comparison_split: { pattern: "comparison", template: "split_panel" },
  quiz_battle: { pattern: "knowledge_check", template: "single_question" },
  build_sandbox: { pattern: "system_builder", template: "module_sandbox" },
  narrative_branch: { pattern: "narrative_branch", template: "branch_story" },
  classification_sort: { pattern: "classification_sort", template: "category_buckets" },
  simulation_play: { pattern: "simulation_play", template: "parameter_simulation" },
};

export const V2_TO_V1_SCHEMA_MAP: Record<PatternType, { type: UISchemaType; template: TemplateId }> = {
  probability: { type: "gacha_simulator", template: "card_flip_reveal" },
  parameter_explore: { type: "slider_explorer", template: "single_slider" },
  concept_memory: { type: "card_flip", template: "term_cards" },
  process_timeline: { type: "timeline_scrubber", template: "horizontal_timeline" },
  comparison: { type: "comparison_split", template: "split_panel" },
  knowledge_check: { type: "quiz_battle", template: "single_question" },
  system_builder: { type: "build_sandbox", template: "module_sandbox" },
  narrative_branch: { type: "narrative_branch", template: "branch_story" },
  classification_sort: { type: "classification_sort", template: "category_buckets" },
  simulation_play: { type: "simulation_play", template: "parameter_simulation" },
};

function isV2UISchema(schema: UISchema): schema is V2UISchema {
  return typeof schema.pattern === "string";
}

export function normalizeUISchema(schema: UISchema): NormalizedUISchema {
  if (isV2UISchema(schema)) {
    const fallback = V2_TO_V1_SCHEMA_MAP[schema.pattern];
    return {
      type: fallback.type,
      pattern: schema.pattern,
      template: schema.template || fallback.template,
      version: schema.version,
      config: schema.payload,
    };
  }

  const mapped = V1_TO_V2_SCHEMA_MAP[schema.type];
  return {
    type: schema.type,
    pattern: mapped.pattern,
    template: mapped.template,
    version: schema.version,
    config: schema.config,
  };
}

export interface InteractionEvent {
  type: string;
  payload?: Record<string, unknown>;
}

export interface GenerativeUIComponentProps<TConfig = Record<string, unknown>> {
  config: TConfig;
  onInteraction?: (event: InteractionEvent) => void;
  onComplete?: (result: InteractionEvent) => void;
}

export interface GachaPoolItem {
  name: string;
  rarity: "5" | "4" | "3" | string;
  probability: number;
  value: number;
}

export interface GachaSimulatorConfig {
  title: string;
  quote?: string;
  quote_author?: string;
  pool: GachaPoolItem[];
  option_cost: number;
  strike_price: number;
  pulls_per_try: number;
  explanation_map: {
    win: string;
    lose: string;
    push?: string;
  };
}

export interface SliderExplorerConfig {
  title: string;
  variable_label: string;
  min: number;
  max: number;
  default_value: number;
  unit?: string;
  scenarios?: Array<{ label: string; value: number }>;
  explanation_template: string;
}

export interface CardFlipConfig {
  title: string;
  cards: Array<{ front: string; back: string }>;
}

export interface ComparisonSplitConfig {
  title: string;
  left: { label: string; content: string };
  right: { label: string; content: string };
}

export interface TimelineScrubberConfig {
  title: string;
  events: Array<{ label: string; description: string }>;
}

export interface QuizBattleConfig {
  title: string;
  question: string;
  options: Array<{ label: string; correct: boolean; explanation: string }>;
}

export interface BuildSandboxConfig {
  title: string;
  modules: Array<{ id: string; label: string; description: string }>;
  target: string;
}

export interface NarrativeBranchConfig {
  title: string;
  opening: string;
  branches: Array<{
    choice_label: string;
    outcome_description: string;
    insight: string;
  }>;
}

export interface ClassificationSortConfig {
  title: string;
  categories: Array<{ id: string; name: string }>;
  items: Array<{
    label: string;
    correct_category: string;
    explanation: string;
  }>;
}

export interface SimulationPlayConfig {
  title: string;
  params: Array<{
    label: string;
    min: number;
    max: number;
    default: number;
    unit?: string;
  }>;
  compute_formula_description: string;
  steps: number;
}
