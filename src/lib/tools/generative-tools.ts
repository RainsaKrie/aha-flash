import { jsonSchema, tool, type ToolSet } from "ai";
import type { LearningDepth, PatternType, TemplateId } from "../../types/schema.ts";

type JsonSchema = Record<string, unknown>;

export interface GenerativeToolDefinition {
  pattern: PatternType;
  template: TemplateId;
  description: string;
  inputSchema: JsonSchema;
}

const depthProperty = {
  type: "string",
  enum: ["rapid", "scenario", "mapping"],
};

const nextConceptsProperty = {
  type: "array",
  maxItems: 3,
  items: {
    type: "object",
    properties: {
      label: { type: "string" },
      relation: { type: "string" },
    },
    required: ["label", "relation"],
    additionalProperties: false,
  },
};

const metaphorTraceProperty = {
  type: "object",
  properties: {
    concept_action: { type: "string" },
    source_domain: { type: "string" },
    candidate_mechanism: { type: "string" },
    mapping_checks: { type: "array", items: { type: "string" }, minItems: 2 },
    chosen_terms: { type: "array", items: { type: "string" }, minItems: 2 },
  },
  required: ["concept_action", "source_domain", "candidate_mechanism", "mapping_checks", "chosen_terms"],
  additionalProperties: false,
};

function schema(properties: Record<string, unknown>, required: string[]) {
  return {
    type: "object",
    properties: {
      ...properties,
      depth: depthProperty,
      next_concepts: nextConceptsProperty,
      metaphor_trace: metaphorTraceProperty,
    },
    required,
    additionalProperties: false,
  };
}

const probabilityInputSchema = schema(
  {
    title: { type: "string" },
    quote: { type: "string" },
    quote_author: { type: "string" },
    pool: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          flavor_label: { type: "string" },
          rarity: { type: "string" },
          probability: { type: "number" },
          value: { type: "number" },
        },
        required: ["name", "rarity", "probability", "value"],
        additionalProperties: false,
      },
    },
    option_cost: { type: "number" },
    strike_price: { type: "number" },
    pulls_per_try: { type: "number" },
    explanation_map: {
      type: "object",
      properties: {
        win: { type: "string" },
        lose: { type: "string" },
        push: { type: "string" },
      },
      required: ["win", "lose"],
      additionalProperties: false,
    },
  },
  ["title", "pool", "option_cost", "strike_price", "pulls_per_try", "explanation_map"],
);

const parameterExploreInputSchema = schema(
  {
    title: { type: "string" },
    variable_label: { type: "string" },
    min: { type: "number" },
    max: { type: "number" },
    default_value: { type: "number" },
    unit: { type: "string" },
    scenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "number" },
        },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    explanation_template: { type: "string" },
    outputs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          model: { type: "string", enum: ["linear", "quadratic", "exponential", "inverse", "logarithmic"] },
          expression_label: { type: "string" },
          multiplier: { type: "number" },
          offset: { type: "number" },
          unit: { type: "string" },
          description: { type: "string" },
        },
        required: ["label", "model"],
        additionalProperties: false,
      },
    },
    insight_rules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          when: { type: "string", enum: ["low", "mid", "high"] },
          text: { type: "string" },
        },
        required: ["when", "text"],
        additionalProperties: false,
      },
    },
  },
  ["title", "variable_label", "min", "max", "default_value", "explanation_template"],
);

const conceptMemoryInputSchema = schema(
  {
    title: { type: "string" },
    cards: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
        additionalProperties: false,
      },
    },
  },
  ["title", "cards"],
);

const processTimelineInputSchema = schema(
  {
    title: { type: "string" },
    events: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          description: { type: "string" },
        },
        required: ["label", "description"],
        additionalProperties: false,
      },
    },
  },
  ["title", "events"],
);

const comparisonInputSchema = schema(
  {
    title: { type: "string" },
    left: {
      type: "object",
      properties: {
        label: { type: "string" },
        content: { type: "string" },
      },
      required: ["label", "content"],
      additionalProperties: false,
    },
    right: {
      type: "object",
      properties: {
        label: { type: "string" },
        content: { type: "string" },
      },
      required: ["label", "content"],
      additionalProperties: false,
    },
    subject_a: { type: "string" },
    subject_b: { type: "string" },
    dimensions: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          a: { type: "string" },
          b: { type: "string" },
          insight: { type: "string" },
        },
        required: ["label", "a", "b", "insight"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  ["title", "left", "right"],
);

const knowledgeCheckInputSchema = schema(
  {
    title: { type: "string" },
    question: { type: "string" },
    options: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          correct: { type: "boolean" },
          explanation: { type: "string" },
        },
        required: ["label", "correct", "explanation"],
        additionalProperties: false,
      },
    },
  },
  ["title", "question", "options"],
);

const systemBuilderInputSchema = schema(
  {
    title: { type: "string" },
    target: { type: "string" },
    modules: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          role: { type: "string" },
        },
        required: ["id", "label", "description"],
        additionalProperties: false,
      },
    },
    required_module_ids: { type: "array", items: { type: "string" } },
    expected_sequence: { type: "array", items: { type: "string" } },
    connections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          label: { type: "string" },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
    },
    success_summary: { type: "string" },
  },
  ["title", "target", "modules"],
);

const narrativeBranchInputSchema = schema(
  {
    title: { type: "string" },
    opening: { type: "string" },
    branches: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          choice_label: { type: "string" },
          outcome_description: { type: "string" },
          insight: { type: "string" },
        },
        required: ["choice_label", "outcome_description", "insight"],
        additionalProperties: false,
      },
    },
  },
  ["title", "opening", "branches"],
);

const classificationSortInputSchema = schema(
  {
    title: { type: "string" },
    categories: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
        required: ["id", "name"],
        additionalProperties: false,
      },
    },
    items: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          correct_category: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["label", "correct_category", "explanation"],
        additionalProperties: false,
      },
    },
  },
  ["title", "categories", "items"],
);

const simulationPlayInputSchema = schema(
  {
    title: { type: "string" },
    params: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          min: { type: "number" },
          max: { type: "number" },
          default: { type: "number" },
          unit: { type: "string" },
        },
        required: ["label", "min", "max", "default"],
        additionalProperties: false,
      },
    },
    compute_formula_description: { type: "string" },
    steps: { type: "number" },
  },
  ["title", "params", "compute_formula_description", "steps"],
);

export const GENERATIVE_TOOLS = {
  generate_probability: {
    pattern: "probability",
    template: "card_flip_reveal",
    description: "生成概率、期权、保险或投资组合类互动组件。",
    inputSchema: probabilityInputSchema,
  },
  generate_parameter_explore: {
    pattern: "parameter_explore",
    template: "single_slider",
    description: "生成参数影响、因果变量或利率变化类互动组件。",
    inputSchema: parameterExploreInputSchema,
  },
  generate_concept_memory: {
    pattern: "concept_memory",
    template: "term_cards",
    description: "生成术语配对、定义记忆或概念映射类互动组件。",
    inputSchema: conceptMemoryInputSchema,
  },
  generate_process_timeline: {
    pattern: "process_timeline",
    template: "horizontal_timeline",
    description: "生成历史、流程或阶段演化类互动组件。",
    inputSchema: processTimelineInputSchema,
  },
  generate_comparison: {
    pattern: "comparison",
    template: "split_panel",
    description: "生成对比、辨析或方案权衡类互动组件。",
    inputSchema: comparisonInputSchema,
  },
  generate_knowledge_check: {
    pattern: "knowledge_check",
    template: "single_question",
    description: "生成理解检查、快问快答类互动组件。",
    inputSchema: knowledgeCheckInputSchema,
  },
  generate_system_builder: {
    pattern: "system_builder",
    template: "module_sandbox",
    description: "生成系统架构、模块组合或流程搭建类互动组件。",
    inputSchema: systemBuilderInputSchema,
  },
  generate_narrative_branch: {
    pattern: "narrative_branch",
    template: "branch_story",
    description: "生成案例决策、逻辑谬误或历史选择类互动组件。",
    inputSchema: narrativeBranchInputSchema,
  },
  generate_classification_sort: {
    pattern: "classification_sort",
    template: "category_buckets",
    description: "生成分类归因、概念边界辨析类互动组件。",
    inputSchema: classificationSortInputSchema,
  },
  generate_simulation_play: {
    pattern: "simulation_play",
    template: "parameter_simulation",
    description: "生成复利、供需、种群演化或网络效应类互动组件。",
    inputSchema: simulationPlayInputSchema,
  },
} satisfies Record<string, GenerativeToolDefinition>;

export type GenerativeToolName = keyof typeof GENERATIVE_TOOLS;

export function getGenerativeToolNames() {
  return Object.keys(GENERATIVE_TOOLS) as GenerativeToolName[];
}

export function isGenerativeToolName(name: string): name is GenerativeToolName {
  return Object.hasOwn(GENERATIVE_TOOLS, name);
}

export function buildSchemaFromGenerativeToolCall(name: GenerativeToolName, args: Record<string, unknown>) {
  const tool = GENERATIVE_TOOLS[name];
  const { depth, next_concepts, ...payload } = args;
  return {
    pattern: tool.pattern,
    template: tool.template,
    version: "2.0",
    depth: depth as LearningDepth | undefined,
    next_concepts,
    payload,
  };
}

export function buildGenerativeAiTools() {
  return Object.fromEntries(
    Object.entries(GENERATIVE_TOOLS).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(definition.inputSchema as never),
      }),
    ]),
  ) as ToolSet;
}
