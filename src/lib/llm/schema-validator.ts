import { z } from "zod";
import type { UISchema } from "@/types/schema";

export type MetaphorTraceValidationMode = "off" | "warn" | "reject";

export interface SchemaValidationOptions {
  metaphorTraceMode?: MetaphorTraceValidationMode;
}

const DepthZod = z.enum(["rapid", "scenario", "mapping"]).optional();

const MetaphorTraceZod = z
  .object({
    concept_action: z.string(),
    source_domain: z.string(),
    candidate_mechanism: z.string(),
    mapping_checks: z.array(z.string()),
    chosen_terms: z.array(z.string()),
  })
  .optional();

const NextConceptsZod = z
  .array(
    z.object({
      label: z.string(),
      relation: z.string(),
    }),
  )
  .max(3)
  .optional();

function schemaObject<TShape extends z.ZodRawShape>(shape: TShape) {
  return z.object({
    ...shape,
    next_concepts: NextConceptsZod,
    depth: DepthZod,
  });
}

function payloadObject<TShape extends z.ZodRawShape>(shape: TShape) {
  return z.object({
    ...shape,
    metaphor_trace: MetaphorTraceZod,
  });
}

const GachaConfigZod = payloadObject({
  title: z.string(),
  quote: z.string().optional(),
  quote_author: z.string().optional(),
  pool: z.array(
    z.object({
      name: z.string(),
      flavor_label: z.string().optional(),
      rarity: z.string(),
      probability: z.number(),
      value: z.number(),
    }),
  ),
  option_cost: z.number(),
  strike_price: z.number(),
  pulls_per_try: z.number(),
  explanation_map: z.object({
    win: z.string(),
    lose: z.string(),
    push: z.string().optional(),
  }),
});

const SliderConfigZod = payloadObject({
  title: z.string(),
  variable_label: z.string(),
  min: z.number(),
  max: z.number(),
  default_value: z.number(),
  unit: z.string().optional(),
  scenarios: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
  explanation_template: z.string(),
  outputs: z
    .array(
      z.object({
        label: z.string(),
        model: z.enum(["linear", "quadratic", "exponential", "inverse", "logarithmic"]),
        expression_label: z.string().optional(),
        multiplier: z.number().optional(),
        offset: z.number().optional(),
        unit: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  insight_rules: z
    .array(z.object({ when: z.enum(["low", "mid", "high"]), text: z.string() }))
    .optional(),
});

const CardFlipConfigZod = payloadObject({
  title: z.string(),
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
});

const TimelineConfigZod = payloadObject({
  title: z.string(),
  events: z.array(z.object({ label: z.string(), description: z.string() })),
});

const ComparisonConfigZod = payloadObject({
  title: z.string(),
  left: z.object({ label: z.string(), content: z.string() }),
  right: z.object({ label: z.string(), content: z.string() }),
  subject_a: z.string().optional(),
  subject_b: z.string().optional(),
  dimensions: z
    .array(
      z.object({
        label: z.string(),
        a: z.string(),
        b: z.string(),
        insight: z.string(),
      }),
    )
    .optional(),
  summary: z.string().optional(),
});

const QuizConfigZod = payloadObject({
  title: z.string(),
  question: z.string(),
  options: z.array(
    z.object({
      label: z.string(),
      correct: z.boolean(),
      explanation: z.string(),
    }),
  ),
});

const SandboxConfigZod = payloadObject({
  title: z.string(),
  target: z.string(),
  modules: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      role: z.string().optional(),
    }),
  ),
  required_module_ids: z.array(z.string()).optional(),
  expected_sequence: z.array(z.string()).optional(),
  connections: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })).optional(),
  success_summary: z.string().optional(),
});

const NarrativeBranchConfigZod = payloadObject({
  title: z.string(),
  opening: z.string(),
  branches: z.array(
    z.object({
      choice_label: z.string(),
      outcome_description: z.string(),
      insight: z.string(),
    }),
  ),
});

const ClassificationSortConfigZod = payloadObject({
  title: z.string(),
  categories: z.array(z.object({ id: z.string(), name: z.string() })),
  items: z.array(
    z.object({
      label: z.string(),
      correct_category: z.string(),
      explanation: z.string(),
    }),
  ),
});

const SimulationPlayConfigZod = payloadObject({
  title: z.string(),
  params: z.array(
    z.object({
      label: z.string(),
      min: z.number(),
      max: z.number(),
      default: z.number(),
      unit: z.string().optional(),
    }),
  ).min(2),
  compute_formula_description: z.string(),
  steps: z.number(),
});

export const V1UISchemaZod = z.discriminatedUnion("type", [
  schemaObject({
    type: z.literal("gacha_simulator"),
    version: z.string(),
    config: GachaConfigZod,
  }),
  schemaObject({
    type: z.literal("slider_explorer"),
    version: z.string(),
    config: SliderConfigZod,
  }),
  schemaObject({
    type: z.literal("card_flip"),
    version: z.string(),
    config: CardFlipConfigZod,
  }),
  schemaObject({
    type: z.literal("timeline_scrubber"),
    version: z.string(),
    config: TimelineConfigZod,
  }),
  schemaObject({
    type: z.literal("comparison_split"),
    version: z.string(),
    config: ComparisonConfigZod,
  }),
  schemaObject({
    type: z.literal("quiz_battle"),
    version: z.string(),
    config: QuizConfigZod,
  }),
  schemaObject({
    type: z.literal("build_sandbox"),
    version: z.string(),
    config: SandboxConfigZod,
  }),
  schemaObject({
    type: z.literal("narrative_branch"),
    version: z.string(),
    config: NarrativeBranchConfigZod,
  }),
  schemaObject({
    type: z.literal("classification_sort"),
    version: z.string(),
    config: ClassificationSortConfigZod,
  }),
  schemaObject({
    type: z.literal("simulation_play"),
    version: z.string(),
    config: SimulationPlayConfigZod,
  }),
]);

export const V2UISchemaZod = z.union([
  schemaObject({
    pattern: z.literal("probability"),
    template: z.literal("card_flip_reveal"),
    version: z.string(),
    payload: GachaConfigZod,
  }),
  schemaObject({
    pattern: z.literal("probability"),
    template: z.literal("spin_wheel"),
    version: z.string(),
    payload: GachaConfigZod,
  }),
  schemaObject({
    pattern: z.literal("parameter_explore"),
    template: z.literal("single_slider"),
    version: z.string(),
    payload: SliderConfigZod,
  }),
  schemaObject({
    pattern: z.literal("parameter_explore"),
    template: z.literal("dual_slider"),
    version: z.string(),
    payload: SliderConfigZod,
  }),
  schemaObject({
    pattern: z.literal("concept_memory"),
    template: z.literal("term_cards"),
    version: z.string(),
    payload: CardFlipConfigZod,
  }),
  schemaObject({
    pattern: z.literal("concept_memory"),
    template: z.literal("grid_match"),
    version: z.string(),
    payload: CardFlipConfigZod,
  }),
  schemaObject({
    pattern: z.literal("process_timeline"),
    template: z.literal("horizontal_timeline"),
    version: z.string(),
    payload: TimelineConfigZod,
  }),
  schemaObject({
    pattern: z.literal("process_timeline"),
    template: z.literal("vertical_scroll"),
    version: z.string(),
    payload: TimelineConfigZod,
  }),
  schemaObject({
    pattern: z.literal("comparison"),
    template: z.literal("split_panel"),
    version: z.string(),
    payload: ComparisonConfigZod,
  }),
  schemaObject({
    pattern: z.literal("comparison"),
    template: z.literal("overlay_fade"),
    version: z.string(),
    payload: ComparisonConfigZod,
  }),
  schemaObject({
    pattern: z.literal("knowledge_check"),
    template: z.literal("single_question"),
    version: z.string(),
    payload: QuizConfigZod,
  }),
  schemaObject({
    pattern: z.literal("knowledge_check"),
    template: z.literal("combo_chain"),
    version: z.string(),
    payload: QuizConfigZod,
  }),
  schemaObject({
    pattern: z.literal("system_builder"),
    template: z.literal("module_sandbox"),
    version: z.string(),
    payload: SandboxConfigZod,
  }),
  schemaObject({
    pattern: z.literal("system_builder"),
    template: z.literal("flow_connect"),
    version: z.string(),
    payload: SandboxConfigZod,
  }),
  schemaObject({
    pattern: z.literal("narrative_branch"),
    template: z.literal("branch_story"),
    version: z.string(),
    payload: NarrativeBranchConfigZod,
  }),
  schemaObject({
    pattern: z.literal("classification_sort"),
    template: z.literal("category_buckets"),
    version: z.string(),
    payload: ClassificationSortConfigZod,
  }),
  schemaObject({
    pattern: z.literal("simulation_play"),
    template: z.literal("parameter_simulation"),
    version: z.string(),
    payload: SimulationPlayConfigZod,
  }),
]);

export const UISchemaZod = z.union([V2UISchemaZod, V1UISchemaZod]);

function getMetaphorTraceIssues(schema: UISchema) {
  const config = "pattern" in schema && typeof schema.pattern === "string" ? schema.payload : schema.config;
  const trace = config && typeof config === "object" ? (config as Record<string, unknown>).metaphor_trace : null;
  if (!trace || typeof trace !== "object") return ["payload.metaphor_trace is required"];

  const traceRecord = trace as Record<string, unknown>;
  const mappingChecks = Array.isArray(traceRecord.mapping_checks) ? traceRecord.mapping_checks : [];
  const chosenTerms = Array.isArray(traceRecord.chosen_terms) ? traceRecord.chosen_terms : [];
  const issues: string[] = [];

  if (typeof traceRecord.concept_action !== "string" || traceRecord.concept_action.trim().length < 2) {
    issues.push("metaphor_trace.concept_action must be a meaningful string");
  }
  if (typeof traceRecord.source_domain !== "string" || traceRecord.source_domain.trim().length < 2) {
    issues.push("metaphor_trace.source_domain must be a meaningful string");
  }
  if (typeof traceRecord.candidate_mechanism !== "string" || traceRecord.candidate_mechanism.trim().length < 2) {
    issues.push("metaphor_trace.candidate_mechanism must be a meaningful string");
  }
  if (mappingChecks.filter((item) => typeof item === "string" && item.trim().length >= 6).length < 2) {
    issues.push("metaphor_trace.mapping_checks must contain at least 2 concrete checks");
  }
  if (chosenTerms.filter((item) => typeof item === "string" && item.trim().length >= 2).length < 2) {
    issues.push("metaphor_trace.chosen_terms must contain at least 2 terms");
  }

  return issues;
}

export function getSchemaWarnings(raw: unknown, options: SchemaValidationOptions = {}) {
  const mode = options.metaphorTraceMode ?? "warn";
  if (mode === "off") return [];

  const result = UISchemaZod.safeParse(raw);
  if (!result.success) return [];
  return getMetaphorTraceIssues(result.data as UISchema);
}

export function validateSchema(raw: unknown, options: SchemaValidationOptions = {}): UISchema | null {
  const result = UISchemaZod.safeParse(raw);
  if (!result.success) return null;
  const schema = result.data as UISchema;
  if ((options.metaphorTraceMode ?? "warn") === "reject" && getMetaphorTraceIssues(schema).length > 0) {
    return null;
  }

  return schema;
}

export function getSchemaErrors(raw: unknown, options: SchemaValidationOptions = {}) {
  const result = UISchemaZod.safeParse(raw);
  if (!result.success) return JSON.stringify(result.error.flatten(), null, 2);

  if ((options.metaphorTraceMode ?? "warn") === "reject") {
    const issues = getMetaphorTraceIssues(result.data as UISchema);
    if (issues.length) return JSON.stringify({ metaphor_trace: issues }, null, 2);
  }

  return "";
}

function extractJsonObjects(text: string) {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return candidates;
}

export function parseSchemaCandidate(text: string, options: SchemaValidationOptions = {}) {
  try {
    const parsed = JSON.parse(text);
    return {
      parsed,
      schema: validateSchema(parsed, options),
      error: getSchemaErrors(parsed, options),
    };
  } catch (error) {
    return {
      parsed: null,
      schema: null,
      error: String(error),
    };
  }
}

export function extractSchemaFromText(text: string, options: SchemaValidationOptions = {}): UISchema | null {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const matches = [...text.matchAll(jsonBlockRegex)];

  for (const match of matches) {
    const result = parseSchemaCandidate(match[1], options);
    if (result.schema) return result.schema;
  }

  const direct = parseSchemaCandidate(text.trim(), options);
  if (direct.schema) return direct.schema;

  for (const candidate of extractJsonObjects(text)) {
    const result = parseSchemaCandidate(candidate, options);
    if (result.schema) return result.schema;
  }

  return null;
}

export function getSchemaFailureReason(text: string, options: SchemaValidationOptions = {}) {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const candidates = [
    ...[...text.matchAll(jsonBlockRegex)].map((match) => match[1]),
    text.trim(),
    ...extractJsonObjects(text),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = parseSchemaCandidate(candidate, options);
    if (result.error) return result.error;
  }

  return "No JSON object found in model output.";
}
