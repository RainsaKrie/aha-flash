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
  | "spin_wheel"
  | "single_slider"
  | "dual_slider"
  | "term_cards"
  | "grid_match"
  | "horizontal_timeline"
  | "vertical_scroll"
  | "split_panel"
  | "overlay_fade"
  | "single_question"
  | "combo_chain"
  | "module_sandbox"
  | "flow_connect"
  | "branch_story"
  | "category_buckets"
  | "parameter_simulation";

export type UIPayload<TPayload = Record<string, unknown>> = TPayload;

export type LearningDepth = "rapid" | "scenario" | "mapping";

export const DEFAULT_LEARNING_DEPTH: LearningDepth = "rapid";

export const LEARNING_DEPTH_OPTIONS: Array<{ value: LearningDepth; label: string; title: string }> = [
  { value: "rapid", label: "快懂", title: "10 秒顿悟" },
  { value: "scenario", label: "场景", title: "真实场景决策" },
  { value: "mapping", label: "映射", title: "隐喻与原理对照" },
];

export const LEARNING_DEPTH_LABELS: Record<LearningDepth, string> = LEARNING_DEPTH_OPTIONS.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.label }),
  {} as Record<LearningDepth, string>,
);

export function isLearningDepth(value: unknown): value is LearningDepth {
  return value === "rapid" || value === "scenario" || value === "mapping";
}

export interface NextConcept {
  label: string;
  relation: string;
}

export interface V1UISchema<TConfig = Record<string, unknown>> {
  type: UISchemaType;
  version: string;
  config: TConfig;
  next_concepts?: NextConcept[];
  depth?: LearningDepth;
  pattern?: never;
  template?: never;
  payload?: never;
}

export interface V2UISchema<TPayload = Record<string, unknown>> {
  pattern: PatternType;
  template: TemplateId;
  version: string;
  payload: UIPayload<TPayload>;
  next_concepts?: NextConcept[];
  depth?: LearningDepth;
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
  next_concepts: NextConcept[];
  depth: LearningDepth;
}

export const SCHEMA_CATALOG: Record<
  PatternType,
  { type: UISchemaType; defaultTemplate: TemplateId; templates: TemplateId[] }
> = {
  probability: { type: "gacha_simulator", defaultTemplate: "card_flip_reveal", templates: ["card_flip_reveal", "spin_wheel"] },
  parameter_explore: { type: "slider_explorer", defaultTemplate: "single_slider", templates: ["single_slider", "dual_slider"] },
  concept_memory: { type: "card_flip", defaultTemplate: "term_cards", templates: ["term_cards", "grid_match"] },
  process_timeline: { type: "timeline_scrubber", defaultTemplate: "horizontal_timeline", templates: ["horizontal_timeline", "vertical_scroll"] },
  comparison: { type: "comparison_split", defaultTemplate: "split_panel", templates: ["split_panel", "overlay_fade"] },
  knowledge_check: { type: "quiz_battle", defaultTemplate: "single_question", templates: ["single_question", "combo_chain"] },
  system_builder: { type: "build_sandbox", defaultTemplate: "module_sandbox", templates: ["module_sandbox", "flow_connect"] },
  narrative_branch: { type: "narrative_branch", defaultTemplate: "branch_story", templates: ["branch_story"] },
  classification_sort: { type: "classification_sort", defaultTemplate: "category_buckets", templates: ["category_buckets"] },
  simulation_play: { type: "simulation_play", defaultTemplate: "parameter_simulation", templates: ["parameter_simulation"] },
};

export const V2_TO_V1_SCHEMA_MAP = Object.fromEntries(
  Object.entries(SCHEMA_CATALOG).map(([pattern, item]) => [
    pattern,
    { type: item.type, template: item.defaultTemplate },
  ]),
) as Record<PatternType, { type: UISchemaType; template: TemplateId }>;

export const V1_TO_V2_SCHEMA_MAP = Object.fromEntries(
  Object.entries(SCHEMA_CATALOG).map(([pattern, item]) => [
    item.type,
    { pattern, template: item.defaultTemplate },
  ]),
) as Record<UISchemaType, { pattern: PatternType; template: TemplateId }>;

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
      next_concepts: schema.next_concepts || [],
      depth: schema.depth || DEFAULT_LEARNING_DEPTH,
    };
  }

  const mapped = V1_TO_V2_SCHEMA_MAP[schema.type];
  return {
    type: schema.type,
    pattern: mapped.pattern,
    template: mapped.template,
    version: schema.version,
    config: schema.config,
    next_concepts: schema.next_concepts || [],
    depth: schema.depth || DEFAULT_LEARNING_DEPTH,
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
  flavor_label?: string;
  rarity: "5" | "4" | "3" | string;
  probability: number;
  value: number;
}

export interface ComponentDepthConfig {
  depth?: LearningDepth;
}

export interface GachaSimulatorConfig extends ComponentDepthConfig {
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

export interface SliderExplorerConfig extends ComponentDepthConfig {
  title: string;
  variable_label: string;
  min: number;
  max: number;
  default_value: number;
  unit?: string;
  scenarios?: Array<{ label: string; value: number }>;
  explanation_template: string;
  outputs?: Array<{
    label: string;
    model: "linear" | "quadratic" | "exponential" | "inverse" | "logarithmic";
    expression_label?: string;
    multiplier?: number;
    offset?: number;
    unit?: string;
    description?: string;
  }>;
  insight_rules?: Array<{ when: "low" | "mid" | "high"; text: string }>;
}

export interface CardFlipConfig extends ComponentDepthConfig {
  title: string;
  cards: Array<{ front: string; back: string }>;
}

export interface ComparisonSplitConfig extends ComponentDepthConfig {
  title: string;
  left: { label: string; content: string };
  right: { label: string; content: string };
  subject_a?: string;
  subject_b?: string;
  dimensions?: Array<{
    label: string;
    a: string;
    b: string;
    insight: string;
  }>;
  summary?: string;
}

export interface TimelineScrubberConfig extends ComponentDepthConfig {
  title: string;
  events: Array<{ label: string; description: string }>;
}

export interface QuizBattleConfig extends ComponentDepthConfig {
  title: string;
  question: string;
  options: Array<{ label: string; correct: boolean; explanation: string }>;
}

export interface BuildSandboxConfig extends ComponentDepthConfig {
  title: string;
  modules: Array<{ id: string; label: string; description: string; role?: string }>;
  target: string;
  required_module_ids?: string[];
  expected_sequence?: string[];
  connections?: Array<{ from: string; to: string; label?: string }>;
  success_summary?: string;
}

export interface NarrativeBranchConfig extends ComponentDepthConfig {
  title: string;
  opening: string;
  branches: Array<{
    choice_label: string;
    outcome_description: string;
    insight: string;
  }>;
}

export interface ClassificationSortConfig extends ComponentDepthConfig {
  title: string;
  categories: Array<{ id: string; name: string }>;
  items: Array<{
    label: string;
    correct_category: string;
    explanation: string;
  }>;
}

export interface SimulationPlayConfig extends ComponentDepthConfig {
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
