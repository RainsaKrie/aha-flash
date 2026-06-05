import { z } from "zod";
import type { UISchema } from "@/types/schema";

const GachaConfigZod = z.object({
  title: z.string(),
  quote: z.string().optional(),
  quote_author: z.string().optional(),
  pool: z.array(
    z.object({
      name: z.string(),
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

const SliderConfigZod = z.object({
  title: z.string(),
  variable_label: z.string(),
  min: z.number(),
  max: z.number(),
  default_value: z.number(),
  unit: z.string().optional(),
  scenarios: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
  explanation_template: z.string(),
});

const CardFlipConfigZod = z.object({
  title: z.string(),
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
});

const TimelineConfigZod = z.object({
  title: z.string(),
  events: z.array(z.object({ label: z.string(), description: z.string() })),
});

const ComparisonConfigZod = z.object({
  title: z.string(),
  left: z.object({ label: z.string(), content: z.string() }),
  right: z.object({ label: z.string(), content: z.string() }),
});

const QuizConfigZod = z.object({
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

const SandboxConfigZod = z.object({
  title: z.string(),
  target: z.string(),
  modules: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
    }),
  ),
});

const NarrativeBranchConfigZod = z.object({
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

const ClassificationSortConfigZod = z.object({
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

const SimulationPlayConfigZod = z.object({
  title: z.string(),
  params: z.array(
    z.object({
      label: z.string(),
      min: z.number(),
      max: z.number(),
      default: z.number(),
      unit: z.string().optional(),
    }),
  ),
  compute_formula_description: z.string(),
  steps: z.number(),
});

export const V1UISchemaZod = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("gacha_simulator"),
    version: z.string(),
    config: GachaConfigZod,
  }),
  z.object({
    type: z.literal("slider_explorer"),
    version: z.string(),
    config: SliderConfigZod,
  }),
  z.object({
    type: z.literal("card_flip"),
    version: z.string(),
    config: CardFlipConfigZod,
  }),
  z.object({
    type: z.literal("timeline_scrubber"),
    version: z.string(),
    config: TimelineConfigZod,
  }),
  z.object({
    type: z.literal("comparison_split"),
    version: z.string(),
    config: ComparisonConfigZod,
  }),
  z.object({
    type: z.literal("quiz_battle"),
    version: z.string(),
    config: QuizConfigZod,
  }),
  z.object({
    type: z.literal("build_sandbox"),
    version: z.string(),
    config: SandboxConfigZod,
  }),
  z.object({
    type: z.literal("narrative_branch"),
    version: z.string(),
    config: NarrativeBranchConfigZod,
  }),
  z.object({
    type: z.literal("classification_sort"),
    version: z.string(),
    config: ClassificationSortConfigZod,
  }),
  z.object({
    type: z.literal("simulation_play"),
    version: z.string(),
    config: SimulationPlayConfigZod,
  }),
]);

export const V2UISchemaZod = z.union([
  z.object({
    pattern: z.literal("probability"),
    template: z.literal("card_flip_reveal"),
    version: z.string(),
    payload: GachaConfigZod,
  }),
  z.object({
    pattern: z.literal("probability"),
    template: z.literal("spin_wheel"),
    version: z.string(),
    payload: GachaConfigZod,
  }),
  z.object({
    pattern: z.literal("parameter_explore"),
    template: z.literal("single_slider"),
    version: z.string(),
    payload: SliderConfigZod,
  }),
  z.object({
    pattern: z.literal("parameter_explore"),
    template: z.literal("dual_slider"),
    version: z.string(),
    payload: SliderConfigZod,
  }),
  z.object({
    pattern: z.literal("concept_memory"),
    template: z.literal("term_cards"),
    version: z.string(),
    payload: CardFlipConfigZod,
  }),
  z.object({
    pattern: z.literal("concept_memory"),
    template: z.literal("grid_match"),
    version: z.string(),
    payload: CardFlipConfigZod,
  }),
  z.object({
    pattern: z.literal("process_timeline"),
    template: z.literal("horizontal_timeline"),
    version: z.string(),
    payload: TimelineConfigZod,
  }),
  z.object({
    pattern: z.literal("process_timeline"),
    template: z.literal("vertical_scroll"),
    version: z.string(),
    payload: TimelineConfigZod,
  }),
  z.object({
    pattern: z.literal("comparison"),
    template: z.literal("split_panel"),
    version: z.string(),
    payload: ComparisonConfigZod,
  }),
  z.object({
    pattern: z.literal("comparison"),
    template: z.literal("overlay_fade"),
    version: z.string(),
    payload: ComparisonConfigZod,
  }),
  z.object({
    pattern: z.literal("knowledge_check"),
    template: z.literal("single_question"),
    version: z.string(),
    payload: QuizConfigZod,
  }),
  z.object({
    pattern: z.literal("knowledge_check"),
    template: z.literal("combo_chain"),
    version: z.string(),
    payload: QuizConfigZod,
  }),
  z.object({
    pattern: z.literal("system_builder"),
    template: z.literal("module_sandbox"),
    version: z.string(),
    payload: SandboxConfigZod,
  }),
  z.object({
    pattern: z.literal("system_builder"),
    template: z.literal("flow_connect"),
    version: z.string(),
    payload: SandboxConfigZod,
  }),
  z.object({
    pattern: z.literal("narrative_branch"),
    template: z.literal("branch_story"),
    version: z.string(),
    payload: NarrativeBranchConfigZod,
  }),
  z.object({
    pattern: z.literal("classification_sort"),
    template: z.literal("category_buckets"),
    version: z.string(),
    payload: ClassificationSortConfigZod,
  }),
  z.object({
    pattern: z.literal("simulation_play"),
    template: z.literal("parameter_simulation"),
    version: z.string(),
    payload: SimulationPlayConfigZod,
  }),
]);

export const UISchemaZod = z.union([V2UISchemaZod, V1UISchemaZod]);

export function validateSchema(raw: unknown): UISchema | null {
  const result = UISchemaZod.safeParse(raw);
  return result.success ? (result.data as UISchema) : null;
}

export function getSchemaErrors(raw: unknown) {
  const result = UISchemaZod.safeParse(raw);
  if (result.success) return "";
  return JSON.stringify(result.error.flatten(), null, 2);
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

export function parseSchemaCandidate(text: string) {
  try {
    const parsed = JSON.parse(text);
    return {
      parsed,
      schema: validateSchema(parsed),
      error: getSchemaErrors(parsed),
    };
  } catch (error) {
    return {
      parsed: null,
      schema: null,
      error: String(error),
    };
  }
}

export function extractSchemaFromText(text: string): UISchema | null {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const matches = [...text.matchAll(jsonBlockRegex)];

  for (const match of matches) {
    const result = parseSchemaCandidate(match[1]);
    if (result.schema) return result.schema;
  }

  const direct = parseSchemaCandidate(text.trim());
  if (direct.schema) return direct.schema;

  for (const candidate of extractJsonObjects(text)) {
    const result = parseSchemaCandidate(candidate);
    if (result.schema) return result.schema;
  }

  return null;
}

export function getSchemaFailureReason(text: string) {
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const candidates = [
    ...[...text.matchAll(jsonBlockRegex)].map((match) => match[1]),
    text.trim(),
    ...extractJsonObjects(text),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = parseSchemaCandidate(candidate);
    if (result.error) return result.error;
  }

  return "No JSON object found in model output.";
}
