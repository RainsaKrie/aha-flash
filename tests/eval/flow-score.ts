import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOCK_KNOWLEDGE_FLOWS, type KnowledgeFlow, type KnowledgePlay } from "../../src/lib/content/mock-flows.ts";
import { normalizeUISchema, type PatternType, type UISchema } from "../../src/types/schema.ts";

interface FlowEvalCase {
  id: string;
  flow_id: string;
  knowledge_type: "probability" | "timeline" | "comparison";
  check: "step_count" | "pattern_chain" | "payload_quality" | "copy_safety" | "concept_anchor";
  expected_count?: number;
  expected_patterns?: PatternType[];
  target_pattern?: PatternType;
  required_keywords?: string[];
}

interface FlowApiResponse {
  flow?: KnowledgeFlow;
  source?: "llm" | "mock";
  validation_error?: string;
}

interface FlowRun {
  flowId: string;
  run: number;
  source: "local" | "llm" | "mock" | "missing";
  flow: KnowledgeFlow | null;
  validationError?: string;
}

interface FlowCaseScore {
  id: string;
  flow_id: string;
  knowledge_type: FlowEvalCase["knowledge_type"];
  check: FlowEvalCase["check"];
  run: number;
  source: FlowRun["source"];
  score: number;
  reason: string;
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultCasesPath = path.join(rootDir, "tests/fixtures/flow-cases.json");

function getArg(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getPayload(play: KnowledgePlay) {
  const schema = play.schema as UISchema;
  const normalized = normalizeUISchema(schema);
  return {
    normalized,
    payload: normalized.config as Record<string, unknown>,
  };
}

function getPatterns(flow: KnowledgeFlow) {
  return flow.plays.map((play) => getPayload(play).normalized.pattern);
}

function findPlayByPattern(flow: KnowledgeFlow, pattern: PatternType) {
  return flow.plays.find((play) => getPayload(play).normalized.pattern === pattern) || null;
}

function includesPatternSubsequence(actual: PatternType[], expected: PatternType[]) {
  let cursor = 0;
  for (const pattern of actual) {
    if (pattern === expected[cursor]) cursor += 1;
    if (cursor === expected.length) return true;
  }
  return expected.length === 0;
}

function hasText(value: unknown, min = 2) {
  return typeof value === "string" && value.trim().length >= min;
}
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  const record = asRecord(value);
  if (record) return Object.values(record).flatMap((item) => collectStrings(item));
  return [];
}

function hasPlaceholderInStrings(value: unknown) {
  return collectStrings(value).some((text) => /\{[^{}]+\}|\{\{[^{}]+\}\}/.test(text));
}

function hasHtmlInStrings(value: unknown) {
  return collectStrings(value).some((text) => /<[^>]+>/.test(text));
}


function scoreQuizPayload(payload: Record<string, unknown>) {
  const options = Array.isArray(payload.options) ? payload.options : [];
  const validOptions = options.filter((raw) => {
    const option = asRecord(raw);
    return option && hasText(option.label) && typeof option.correct === "boolean" && hasText(option.explanation, 4);
  });
  const correctCount = options.filter((raw) => asRecord(raw)?.correct === true).length;
  return options.length === 3 && validOptions.length === 3 && correctCount === 1;
}

function scoreCardPayload(payload: Record<string, unknown>) {
  const cards = Array.isArray(payload.cards) ? payload.cards : [];
  return cards.length >= 3 && cards.every((raw) => {
    const card = asRecord(raw);
    return card && hasText(card.front) && hasText(card.back, 6);
  });
}

function scoreSliderPayload(payload: Record<string, unknown>) {
  const scenarios = Array.isArray(payload.scenarios) ? payload.scenarios : [];
  const outputs = Array.isArray(payload.outputs) ? payload.outputs : [];
  const insightRules = Array.isArray(payload.insight_rules) ? payload.insight_rules : [];
  const hasPlaceholders = hasPlaceholderInStrings(payload);
  return (
    hasText(payload.title) &&
    hasText(payload.variable_label) &&
    typeof payload.min === "number" &&
    typeof payload.max === "number" &&
    typeof payload.default_value === "number" &&
    hasText(payload.explanation_template, 8) &&
    scenarios.length >= 3 &&
    outputs.length >= 2 &&
    insightRules.length >= 3 &&
    !hasPlaceholders
  );
}

function scoreTimelinePayload(payload: Record<string, unknown>) {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const completeEvents = events.filter((raw) => {
    const event = asRecord(raw);
    return event && hasText(event.label) && hasText(event.description, 10);
  });
  return events.length >= 4 && events.length <= 6 && completeEvents.length === events.length;
}

function scoreComparisonPayload(payload: Record<string, unknown>) {
  const left = asRecord(payload.left);
  const right = asRecord(payload.right);
  const dimensions = Array.isArray(payload.dimensions) ? payload.dimensions : [];
  return Boolean(
    left &&
      right &&
      hasText(left.label) &&
      hasText(left.content, 8) &&
      hasText(right.label) &&
      hasText(right.content, 8) &&
      dimensions.length >= 4 &&
      dimensions.every((raw) => {
        const dimension = asRecord(raw);
        return dimension && hasText(dimension.label) && hasText(dimension.a, 2) && hasText(dimension.b, 2) && hasText(dimension.insight, 6);
      }),
  );
}

function scorePayloadQuality(flow: KnowledgeFlow, targetPattern?: PatternType) {
  if (!targetPattern) return { score: 0, reason: "missing target_pattern" };
  const play = findPlayByPattern(flow, targetPattern);
  if (!play) return { score: 0, reason: `missing pattern ${targetPattern}` };
  const { payload } = getPayload(play);

  const matched =
    targetPattern === "knowledge_check" ? scoreQuizPayload(payload) :
    targetPattern === "concept_memory" ? scoreCardPayload(payload) :
    targetPattern === "parameter_explore" ? scoreSliderPayload(payload) :
    targetPattern === "process_timeline" ? scoreTimelinePayload(payload) :
    targetPattern === "comparison" ? scoreComparisonPayload(payload) :
    Boolean(payload && Object.keys(payload).length > 0);

  return { score: matched ? 1 : 0, reason: matched ? "payload complete" : `${targetPattern} payload incomplete` };
}

function scoreCopySafety(flow: KnowledgeFlow) {
  const hasPlaceholder = hasPlaceholderInStrings(flow);
  const hasHtml = hasHtmlInStrings(flow);
  const hasBannedReward = /(工具箱|入库|魔力|升级版|跳舞)/.test(flow.plays.map((play) => play.reward_copy).join(" "));
  const safe = !hasPlaceholder && !hasHtml && !hasBannedReward;
  return { score: safe ? 1 : 0, reason: safe ? "copy safe" : "copy contains placeholder/html/banned reward" };
}

function scoreConceptAnchor(flow: KnowledgeFlow, requiredKeywords: string[] = []) {
  if (!requiredKeywords.length) return { score: 1, reason: "no required keywords" };
  const text = JSON.stringify({ summary: flow.summary, concepts: flow.concepts, plays: flow.plays });
  const hits = requiredKeywords.filter((keyword) => text.includes(keyword)).length;
  const score = hits / requiredKeywords.length;
  return { score: Number(score.toFixed(3)), reason: `${hits}/${requiredKeywords.length} keyword hits` };
}

function scoreCase(testCase: FlowEvalCase, run: FlowRun): FlowCaseScore {
  if (!run.flow) {
    return {
      id: testCase.id,
      flow_id: testCase.flow_id,
      knowledge_type: testCase.knowledge_type,
      check: testCase.check,
      run: run.run,
      source: run.source,
      score: 0,
      reason: run.validationError || "flow missing",
    };
  }

  let result: { score: number; reason: string };

  if (testCase.check === "step_count") {
    const matched = run.flow.plays.length === (testCase.expected_count || 3);
    result = { score: matched ? 1 : 0, reason: `steps ${run.flow.plays.length}/${testCase.expected_count || 3}` };
  } else if (testCase.check === "pattern_chain") {
    const actual = getPatterns(run.flow);
    const expected = testCase.expected_patterns || [];
    const matched = includesPatternSubsequence(actual, expected);
    result = { score: matched ? 1 : 0, reason: `patterns ${actual.join(" -> ")}` };
  } else if (testCase.check === "payload_quality") {
    result = scorePayloadQuality(run.flow, testCase.target_pattern);
  } else if (testCase.check === "copy_safety") {
    result = scoreCopySafety(run.flow);
  } else {
    result = scoreConceptAnchor(run.flow, testCase.required_keywords);
  }

  return {
    id: testCase.id,
    flow_id: testCase.flow_id,
    knowledge_type: testCase.knowledge_type,
    check: testCase.check,
    run: run.run,
    source: run.source,
    score: Number(result.score.toFixed(3)),
    reason: result.reason,
  };
}

function buildEndpoint(baseUrl: string, flowId: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("flowId", flowId);
  return url.toString();
}

async function loadFlowRuns(flowIds: string[], runs: number, baseUrl?: string): Promise<FlowRun[]> {
  const results: FlowRun[] = [];

  if (!baseUrl) {
    for (const flowId of flowIds) {
      const flow = MOCK_KNOWLEDGE_FLOWS.find((item) => item.id === flowId) || null;
      results.push({ flowId, run: 1, source: flow ? "local" : "missing", flow });
    }
    return results;
  }

  for (const flowId of flowIds) {
    for (let run = 1; run <= runs; run += 1) {
      const endpoint = buildEndpoint(baseUrl, flowId);
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(`${flowId} run ${run} failed: HTTP ${response.status}`);
      const payload = (await response.json()) as FlowApiResponse;
      results.push({
        flowId,
        run,
        source: payload.source || "missing",
        flow: payload.flow || null,
        validationError: payload.validation_error,
      });
      console.log(`flow ${flowId} run ${run}/${runs}: ${payload.source || "missing"}`);
    }
  }

  return results;
}

function groupAverage(scores: FlowCaseScore[], check: FlowEvalCase["check"]) {
  return Number(average(scores.filter((item) => item.check === check).map((item) => item.score)).toFixed(3));
}

async function main() {
  const casesPath = path.resolve(getArg("cases") || defaultCasesPath);
  const cases = readJsonFile<FlowEvalCase[]>(casesPath);
  const wantsJson = process.argv.includes("--json");
  const runs = Math.max(1, Math.min(20, Number(getArg("runs") || "1") || 1));
  const baseUrl = getArg("url");
  const flowIds = Array.from(new Set(cases.map((item) => item.flow_id)));
  const flowRuns = await loadFlowRuns(flowIds, runs, baseUrl);
  const runMap = new Map<string, FlowRun[]>();
  for (const run of flowRuns) {
    runMap.set(run.flowId, [...(runMap.get(run.flowId) || []), run]);
  }

  const scores = cases.flatMap((testCase) => (runMap.get(testCase.flow_id) || []).map((run) => scoreCase(testCase, run)));
  const failed = scores.filter((item) => item.score < 1);
  const report = {
    total: scores.length,
    flows: flowIds.length,
    runs,
    mode: baseUrl ? "api" : "local",
    averages: {
      overall: Number(average(scores.map((item) => item.score)).toFixed(3)),
      flow_validity: Number(average([
        groupAverage(scores, "step_count"),
        groupAverage(scores, "pattern_chain"),
      ]).toFixed(3)),
      pattern_fit: groupAverage(scores, "pattern_chain"),
      payload_completeness: groupAverage(scores, "payload_quality"),
      copy_safety: groupAverage(scores, "copy_safety"),
      concept_anchor: groupAverage(scores, "concept_anchor"),
    },
    cases: scores,
  };

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`cases: ${report.total}`);
  console.log(`flows: ${report.flows}`);
  console.log(`runs: ${report.runs}`);
  console.log(`mode: ${report.mode}`);
  console.log(`overall: ${report.averages.overall}`);
  console.log(`flow_validity: ${report.averages.flow_validity}`);
  console.log(`pattern_fit: ${report.averages.pattern_fit}`);
  console.log(`payload_completeness: ${report.averages.payload_completeness}`);
  console.log(`copy_safety: ${report.averages.copy_safety}`);
  console.log(`concept_anchor: ${report.averages.concept_anchor}`);
  console.log(`failed_cases: ${failed.length ? failed.map((item) => `${item.id}#${item.run}`).join(", ") : "none"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});