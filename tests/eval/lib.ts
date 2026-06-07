import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMockSchema } from "../../src/lib/llm/mock-schema.ts";
import { extractSchemaFromText, validateSchema } from "../../src/lib/llm/schema-validator.ts";
import { normalizeUISchema, type LearningDepth, type UISchema } from "../../src/types/schema.ts";

export interface EvalCase {
  id: string;
  input: string;
  depth: LearningDepth;
  expected_route: "knowledge" | "preference" | "casual";
  expected_pattern: string;
  expected_template: string;
  required_keywords: string[];
}

export interface Prediction {
  id: string;
  route?: string;
  rawOutput?: string;
  schema?: unknown;
}

export interface CaseScore {
  id: string;
  json_valid: boolean;
  pattern_match: boolean;
  template_match: boolean;
  depth_match: boolean;
  route_match: boolean | null;
  metaphor_hit_rate: number;
  metaphor_consistency: number;
  payload_complete: boolean;
  score: number;
  expected: {
    route: string;
    pattern: string;
    template: string;
    depth: LearningDepth;
  };
  actual: {
    route?: string;
    pattern?: string;
    template?: string;
    depth?: string;
  };
}

export interface ScoreReport {
  total: number;
  averages: {
    overall: number;
    json_valid: number;
    pattern_accuracy: number;
    template_accuracy: number;
    depth_accuracy: number;
    route_accuracy: number | null;
    metaphor_fit: number;
    metaphor_consistency: number;
    payload_completeness: number;
  };
  cases: CaseScore[];
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultCasesPath = path.join(rootDir, "tests/fixtures/test-cases.json");

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
}

export function readEvalCases(filePath = defaultCasesPath) {
  return readJsonFile<EvalCase[]>(filePath);
}

function inferRouteByRules(input: string): EvalCase["expected_route"] {
  if (/(我是|喜欢|爱好|之后用|以后用|偏好|背景)/.test(input)) return "preference";
  if (/(不学习|随便聊|闲聊|你好)/.test(input)) return "casual";
  return "knowledge";
}

function schemaFromPrediction(testCase: EvalCase, prediction?: Prediction) {
  if (!prediction) return { ...createMockSchema(testCase.input, testCase.depth), depth: testCase.depth };
  if (prediction.schema) return validateSchema(prediction.schema);
  if (prediction.rawOutput) return extractSchemaFromText(prediction.rawOutput);
  return null;
}

function keywordHitRate(schema: UISchema | null, requiredKeywords: string[]) {
  if (!schema || requiredKeywords.length === 0) return 0;
  const text = JSON.stringify(schema);
  const hits = requiredKeywords.filter((keyword) => text.includes(keyword)).length;
  return hits / requiredKeywords.length;
}

function metaphorTraceScore(config: unknown, hasPrediction: boolean) {
  if (!hasPrediction) return 1;
  if (!config || typeof config !== "object") return 0;

  const trace = (config as Record<string, unknown>).metaphor_trace;
  if (!trace || typeof trace !== "object") return 0;

  const traceRecord = trace as Record<string, unknown>;
  const mappingChecks = Array.isArray(traceRecord.mapping_checks) ? traceRecord.mapping_checks : [];
  const chosenTerms = Array.isArray(traceRecord.chosen_terms) ? traceRecord.chosen_terms : [];

  const dimensions = [
    typeof traceRecord.concept_action === "string" && traceRecord.concept_action.trim().length >= 2,
    typeof traceRecord.source_domain === "string" && traceRecord.source_domain.trim().length >= 2,
    typeof traceRecord.candidate_mechanism === "string" && traceRecord.candidate_mechanism.trim().length >= 2,
    mappingChecks.filter((item) => typeof item === "string" && item.trim().length >= 6).length >= 2,
    chosenTerms.filter((item) => typeof item === "string" && item.trim().length >= 2).length >= 2,
  ];

  return average(dimensions.map((matched) => (matched ? 1 : 0)));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function scorePredictions(cases: EvalCase[], predictions: Prediction[] = []): ScoreReport {
  const predictionMap = new Map(predictions.map((prediction) => [prediction.id, prediction]));

  const caseScores = cases.map((testCase) => {
    const prediction = predictionMap.get(testCase.id);
    const schema = schemaFromPrediction(testCase, prediction);
    const normalized = schema ? normalizeUISchema(schema) : null;
    const actualRoute = prediction?.route || (!prediction ? inferRouteByRules(testCase.input) : undefined);
    const jsonValid = Boolean(schema);
    const patternMatch = normalized?.pattern === testCase.expected_pattern;
    const templateMatch = normalized?.template === testCase.expected_template;
    const depthMatch = normalized?.depth === testCase.depth;
    const routeMatch = actualRoute ? actualRoute === testCase.expected_route : null;
    const metaphorHitRate = keywordHitRate(schema, testCase.required_keywords);
    const metaphorConsistency = metaphorTraceScore(normalized?.config, Boolean(prediction));
    const payloadComplete = jsonValid && Boolean(normalized?.config);

    const dimensions = [
      jsonValid ? 1 : 0,
      patternMatch ? 1 : 0,
      templateMatch ? 1 : 0,
      depthMatch ? 1 : 0,
      routeMatch === null ? 1 : routeMatch ? 1 : 0,
      metaphorHitRate,
      metaphorConsistency,
      payloadComplete ? 1 : 0,
    ];

    return {
      id: testCase.id,
      json_valid: jsonValid,
      pattern_match: patternMatch,
      template_match: templateMatch,
      depth_match: depthMatch,
      route_match: routeMatch,
      metaphor_hit_rate: Number(metaphorHitRate.toFixed(3)),
      metaphor_consistency: Number(metaphorConsistency.toFixed(3)),
      payload_complete: payloadComplete,
      score: Number(average(dimensions).toFixed(3)),
      expected: {
        route: testCase.expected_route,
        pattern: testCase.expected_pattern,
        template: testCase.expected_template,
        depth: testCase.depth,
      },
      actual: {
        route: actualRoute,
        pattern: normalized?.pattern,
        template: normalized?.template,
        depth: normalized?.depth,
      },
    } satisfies CaseScore;
  });

  const routeScores = caseScores
    .map((item) => item.route_match)
    .filter((value): value is boolean => value !== null)
    .map((value) => (value ? 1 : 0));

  return {
    total: caseScores.length,
    averages: {
      overall: Number(average(caseScores.map((item) => item.score)).toFixed(3)),
      json_valid: Number(average(caseScores.map((item) => (item.json_valid ? 1 : 0))).toFixed(3)),
      pattern_accuracy: Number(average(caseScores.map((item) => (item.pattern_match ? 1 : 0))).toFixed(3)),
      template_accuracy: Number(average(caseScores.map((item) => (item.template_match ? 1 : 0))).toFixed(3)),
      depth_accuracy: Number(average(caseScores.map((item) => (item.depth_match ? 1 : 0))).toFixed(3)),
      route_accuracy: routeScores.length ? Number(average(routeScores).toFixed(3)) : null,
      metaphor_fit: Number(average(caseScores.map((item) => item.metaphor_hit_rate)).toFixed(3)),
      metaphor_consistency: Number(average(caseScores.map((item) => item.metaphor_consistency)).toFixed(3)),
      payload_completeness: Number(average(caseScores.map((item) => (item.payload_complete ? 1 : 0))).toFixed(3)),
    },
    cases: caseScores,
  };
}
