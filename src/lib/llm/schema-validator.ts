import { z } from "zod";
import {
  SCHEMA_CATALOG,
  V1_TO_V2_SCHEMA_MAP,
  type LearningDepth,
  type NextConcept,
  type PatternType,
  type TemplateId,
  type UISchema,
} from "../../types/schema.ts";

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

const V2PayloadSchemas: Record<string, Record<string, z.ZodType>> = {
  probability: {
    card_flip_reveal: GachaConfigZod,
    spin_wheel: GachaConfigZod,
  },
  parameter_explore: {
    single_slider: SliderConfigZod,
    dual_slider: SliderConfigZod,
  },
  concept_memory: {
    term_cards: CardFlipConfigZod,
    grid_match: CardFlipConfigZod,
  },
  process_timeline: {
    horizontal_timeline: TimelineConfigZod,
    vertical_scroll: TimelineConfigZod,
  },
  comparison: {
    split_panel: ComparisonConfigZod,
    overlay_fade: ComparisonConfigZod,
  },
  knowledge_check: {
    single_question: QuizConfigZod,
    combo_chain: QuizConfigZod,
  },
  system_builder: {
    module_sandbox: SandboxConfigZod,
    flow_connect: SandboxConfigZod,
  },
  narrative_branch: {
    branch_story: NarrativeBranchConfigZod,
  },
  classification_sort: {
    category_buckets: ClassificationSortConfigZod,
  },
  simulation_play: {
    parameter_simulation: SimulationPlayConfigZod,
  },
};

interface KnownV2SchemaInput {
  pattern: PatternType;
  template: TemplateId;
  version?: string;
  depth?: LearningDepth;
  next_concepts?: NextConcept[];
  payload: unknown;
}

function getRecord(raw: unknown) {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function summarizeZodIssues(error: z.ZodError, prefix = "") {
  return error.issues.slice(0, 8).map((issue) => ({
    path: [prefix, issue.path.join(".")].filter(Boolean).join(".") || "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

function sanitizeAdvisoryPayloadFields(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const record = payload as Record<string, unknown>;
  if (!Object.hasOwn(record, "metaphor_trace")) return payload;
  if (record.metaphor_trace && typeof record.metaphor_trace === "object" && !Array.isArray(record.metaphor_trace)) return payload;

  const { metaphor_trace: _metaphorTrace, ...rest } = record;
  return rest;
}

function diagnoseSchemaMismatch(raw: unknown, error: z.ZodError) {
  const record = getRecord(raw);
  if (!record) {
    return {
      reason: "schema is not an object",
      actual_type: Array.isArray(raw) ? "array" : typeof raw,
      suspected_field: "(root)",
      zod_issues: summarizeZodIssues(error),
    };
  }

  const pattern = typeof record.pattern === "string" ? record.pattern : undefined;
  const template = typeof record.template === "string" ? record.template : undefined;
  const type = typeof record.type === "string" ? record.type : undefined;
  const version = typeof record.version === "string" ? record.version : undefined;
  const hasPayload = Object.hasOwn(record, "payload");
  const hasConfig = Object.hasOwn(record, "config");
  const patternCatalog = pattern ? SCHEMA_CATALOG[pattern as keyof typeof SCHEMA_CATALOG] : undefined;
  const v1Catalog = type ? V1_TO_V2_SCHEMA_MAP[type as keyof typeof V1_TO_V2_SCHEMA_MAP] : undefined;
  const targetedPayloadSchema = pattern && template ? V2PayloadSchemas[pattern]?.[template] : undefined;
  const targetedPayloadResult = targetedPayloadSchema && hasPayload ? targetedPayloadSchema.safeParse(record.payload) : null;
  const targetedPayloadIssues = targetedPayloadResult && !targetedPayloadResult.success
    ? summarizeZodIssues(targetedPayloadResult.error, "payload")
    : [];

  let suspectedField = "union";
  let reason = "schema does not match any known pattern/template shape";

  if (!pattern && !type) {
    suspectedField = "pattern";
    reason = "missing pattern for V2 schema and missing type for V1 schema";
  } else if (pattern && !patternCatalog) {
    suspectedField = "pattern";
    reason = "unknown pattern";
  } else if (pattern && !template) {
    suspectedField = "template";
    reason = "missing template for V2 schema";
  } else if (patternCatalog && template && !(patternCatalog.templates as readonly string[]).includes(template)) {
    suspectedField = "template";
    reason = `template does not belong to pattern ${pattern}`;
  } else if (pattern && !hasPayload) {
    suspectedField = "payload";
    reason = "missing payload for V2 schema";
  } else if (type && !v1Catalog) {
    suspectedField = "type";
    reason = "unknown V1 type";
  } else if (type && !hasConfig) {
    suspectedField = "config";
    reason = "missing config for V1 schema";
  } else if (!version) {
    suspectedField = "version";
    reason = "missing version";
  } else if (targetedPayloadIssues.length > 0) {
    suspectedField = targetedPayloadIssues[0].path;
    reason = "payload field does not satisfy the selected pattern/template schema";
  } else if (pattern && hasPayload) {
    suspectedField = "payload";
    reason = "payload fields do not satisfy the selected pattern/template schema";
  } else if (type && hasConfig) {
    suspectedField = "config";
    reason = "config fields do not satisfy the selected V1 type schema";
  }

  return {
    reason,
    suspected_field: suspectedField,
    actual_pattern: pattern ?? null,
    actual_template: template ?? null,
    actual_type: type ?? null,
    has_payload: hasPayload,
    has_config: hasConfig,
    allowed_templates_for_pattern: patternCatalog?.templates ?? null,
    zod_issues: targetedPayloadIssues.length ? targetedPayloadIssues : summarizeZodIssues(error),
  };
}

function stringifySchemaDiagnostics(raw: unknown, error: z.ZodError) {
  return JSON.stringify(diagnoseSchemaMismatch(raw, error), null, 2);
}

function getMetaphorTraceIssues(schema: UISchema) {
  const config = "pattern" in schema && typeof schema.pattern === "string" ? schema.payload : schema.config;
  const trace = config && typeof config === "object" ? (config as Record<string, unknown>).metaphor_trace : null;
  if (!trace || typeof trace !== "object") return ["payload.metaphor_trace is missing"];

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

function getAdvisorySchemaIssues(schema: UISchema) {
  const issues = [...getMetaphorTraceIssues(schema)];

  if (!schema.depth) {
    issues.push("depth is missing");
  }

  if (!Array.isArray(schema.next_concepts) || schema.next_concepts.length === 0) {
    issues.push("next_concepts is missing");
  }

  return issues;
}

function emitSchemaWarnings(issues: string[], options: SchemaValidationOptions) {
  const mode = options.metaphorTraceMode ?? "warn";
  if (mode !== "warn" || issues.length === 0 || process.env.NODE_ENV !== "production") return;
  console.warn("[aha-flash] schema warnings", issues);
}

export function getSchemaWarnings(raw: unknown, options: SchemaValidationOptions = {}) {
  const mode = options.metaphorTraceMode ?? "warn";
  if (mode === "off") return [];

  const result = UISchemaZod.safeParse(raw);
  if (!result.success) return [];
  return getAdvisorySchemaIssues(result.data as UISchema);
}

export function getKnownV2SchemaError(input: KnownV2SchemaInput) {
  const payloadSchema = V2PayloadSchemas[input.pattern]?.[input.template];
  if (!payloadSchema) {
    return JSON.stringify(
      {
        reason: "unknown pattern/template pair",
        actual_pattern: input.pattern,
        actual_template: input.template,
      },
      null,
      2,
    );
  }

  const payloadResult = payloadSchema.safeParse(sanitizeAdvisoryPayloadFields(input.payload));
  if (!payloadResult.success) {
    return JSON.stringify(
      {
        reason: "payload does not satisfy selected tool schema",
        actual_pattern: input.pattern,
        actual_template: input.template,
        zod_issues: summarizeZodIssues(payloadResult.error, "payload"),
      },
      null,
      2,
    );
  }

  const advisoryIssues = getAdvisorySchemaIssues({
    pattern: input.pattern,
    template: input.template,
    version: input.version || "2.0",
    depth: input.depth,
    next_concepts: input.next_concepts,
    payload: payloadResult.data as Record<string, unknown>,
  });

  if (advisoryIssues.length) {
    return JSON.stringify({ warnings: advisoryIssues }, null, 2);
  }

  return "";
}

export function validateKnownV2Schema(input: KnownV2SchemaInput, options: SchemaValidationOptions = {}): UISchema | null {
  const payloadSchema = V2PayloadSchemas[input.pattern]?.[input.template];
  if (!payloadSchema) return null;

  const payloadResult = payloadSchema.safeParse(sanitizeAdvisoryPayloadFields(input.payload));
  if (!payloadResult.success) return null;

  const schema = {
    pattern: input.pattern,
    template: input.template,
    version: input.version || "2.0",
    depth: input.depth,
    next_concepts: input.next_concepts,
    payload: payloadResult.data as Record<string, unknown>,
  } satisfies UISchema;

  const advisoryIssues = getAdvisorySchemaIssues(schema);
  if ((options.metaphorTraceMode ?? "warn") === "reject" && advisoryIssues.length > 0) {
    return null;
  }

  emitSchemaWarnings(advisoryIssues, options);
  return schema;
}

export function validateSchema(raw: unknown, options: SchemaValidationOptions = {}): UISchema | null {
  const result = UISchemaZod.safeParse(raw);
  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[aha-flash] schema validation failed", diagnoseSchemaMismatch(raw, result.error));
    }
    return null;
  }
  const schema = result.data as UISchema;
  const advisoryIssues = getAdvisorySchemaIssues(schema);
  if ((options.metaphorTraceMode ?? "warn") === "reject" && advisoryIssues.length > 0) {
    return null;
  }

  emitSchemaWarnings(advisoryIssues, options);
  return schema;
}

export function getSchemaErrors(raw: unknown, options: SchemaValidationOptions = {}) {
  const result = UISchemaZod.safeParse(raw);
  if (!result.success) return stringifySchemaDiagnostics(raw, result.error);

  if ((options.metaphorTraceMode ?? "warn") === "reject") {
    const issues = getAdvisorySchemaIssues(result.data as UISchema);
    if (issues.length) return JSON.stringify({ warnings: issues }, null, 2);
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
