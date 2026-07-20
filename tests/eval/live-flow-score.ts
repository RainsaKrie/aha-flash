import fs from "node:fs";
import path from "node:path";
import { generateDynamicFlow, type DynamicFlowGenerationStage, type RepairAction, type RepairActionTag } from "../../src/lib/content/dynamic-flow-generation.ts";
import type { FlowPatternPreference } from "../../src/lib/content/flow-pattern-options.ts";
import type { KnowledgeStructurePreference, KnowledgeStructureType, TeachingMetrics } from "../../src/lib/content/knowledge-blueprint.ts";
import { hasSpecificPlayTitle } from "../../src/lib/content/knowledge-blueprint.ts";
import { createModelAccessContext, runWithModelAccess } from "../../src/lib/public-beta/model-context.ts";
import { normalizeUISchema, type PatternType } from "../../src/types/schema.ts";

interface LiveFlowEvalCase {
  id: string;
  topic: string;
  preferredPattern: FlowPatternPreference;
  preferredStructure?: KnowledgeStructurePreference;
  expectedStructure: KnowledgeStructureType;
  expectedPatterns: PatternType[];
}

interface RunResult {
  id: string;
  topic: string;
  run: number;
  source: string;
  score: number;
  reasons: string[];
  patterns: PatternType[];
  structure?: KnowledgeStructureType;
  validation_error?: string;
  quality_gate?: { ok: boolean; reason?: string; failures: string[]; teaching_metrics?: TeachingMetrics };
  repair_warnings: string[];
  repair_actions: RepairAction[];
  repair_action_counts: Partial<Record<RepairActionTag, number>>;
  generation_stages: DynamicFlowGenerationStage[];
  schema_repaired: boolean;
  flow_repaired: boolean;
  repaired: boolean;
  raw_output?: string;
  raw_plan_output?: string;
  concept_plan?: unknown;
  flow?: unknown;
}

const cases: LiveFlowEvalCase[] = [
  { id: "live-optimization-linear-programming", topic: "linear programming", preferredPattern: "auto", expectedStructure: "optimization_model", expectedPatterns: ["system_builder", "parameter_explore", "comparison", "knowledge_check"] },
  { id: "live-system-dns", topic: "DNS resolution", preferredPattern: "auto", expectedStructure: "system_process", expectedPatterns: ["system_builder", "process_timeline", "classification_sort", "knowledge_check"] },
  { id: "live-probability-bayes", topic: "Bayes theorem", preferredPattern: "auto", expectedStructure: "probabilistic_reasoning", expectedPatterns: ["probability", "parameter_explore", "concept_memory", "knowledge_check"] },
  { id: "live-history-industrial-revolution", topic: "industrial revolution", preferredPattern: "auto", expectedStructure: "historical_change", expectedPatterns: ["process_timeline", "classification_sort", "narrative_branch"] },
  { id: "live-comparison-inflation-deflation", topic: "inflation vs deflation", preferredPattern: "auto", expectedStructure: "comparison_frame", expectedPatterns: ["narrative_branch", "comparison", "classification_sort", "knowledge_check"] },
  { id: "live-classification-waste-sorting", topic: "waste classification", preferredPattern: "auto", expectedStructure: "classification_rule", expectedPatterns: ["classification_sort", "knowledge_check", "concept_memory", "narrative_branch"] },
  { id: "live-causal-compound-interest", topic: "compound interest", preferredPattern: "auto", expectedStructure: "causal_mechanism", expectedPatterns: ["system_builder", "parameter_explore", "narrative_branch", "knowledge_check"] },
  { id: "live-procedure-binary-search", topic: "binary search algorithm", preferredPattern: "auto", expectedStructure: "procedure_algorithm", expectedPatterns: ["process_timeline", "classification_sort", "concept_memory", "knowledge_check"] },
];

function getArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    if (process.env[key]) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getPatterns(flow: Awaited<ReturnType<typeof generateDynamicFlow>>["flow"]) {
  return flow.plays.map((play) => {
    const schema = play.schema as { pattern?: unknown };
    return typeof schema.pattern === "string" ? (schema.pattern as PatternType) : normalizeUISchema(play.schema).pattern;
  });
}

function textIncludesTopic(text: string, topic: string) {
  return text.toLowerCase().includes(topic.toLowerCase());
}

const REPAIR_ACTION_TAGS: RepairActionTag[] = [
  "field_fix",
  "pattern_normalize",
  "placeholder_clean",
  "schema_repair",
  "schema_fallback",
  "flow_repair",
  "template_normalize",
];
const SCHEMA_REPAIR_TAGS = new Set<RepairActionTag>(["field_fix", "placeholder_clean", "schema_repair", "schema_fallback"]);
const FLOW_REPAIR_TAGS = new Set<RepairActionTag>(["flow_repair", "pattern_normalize", "template_normalize"]);

function countRepairActions(actions: RepairAction[]) {
  return actions.reduce<Partial<Record<RepairActionTag, number>>>((counts, action) => {
    counts[action.tag] = (counts[action.tag] || 0) + 1;
    return counts;
  }, {});
}

function hasRepairTag(actions: RepairAction[], tags: Set<RepairActionTag>) {
  return actions.some((action) => tags.has(action.tag));
}

function repairActionSummary(counts: Partial<Record<RepairActionTag, number>>) {
  return REPAIR_ACTION_TAGS
    .map((tag) => counts[tag] ? `${tag}=${counts[tag]}` : "")
    .filter(Boolean)
    .join(",");
}

function aggregateRepairActionCounts(results: RunResult[]) {
  return results.reduce<Partial<Record<RepairActionTag, number>>>((totals, result) => {
    for (const tag of REPAIR_ACTION_TAGS) totals[tag] = (totals[tag] || 0) + (result.repair_action_counts[tag] || 0);
    return totals;
  }, {});
}

function repairActionRate(results: RunResult[], tag: RepairActionTag) {
  return Number(average(results.map((result) => result.repair_action_counts[tag] ? 1 : 0)).toFixed(3));
}

const TEACHING_METRIC_KEYS: Array<Exclude<keyof TeachingMetrics, "expected_steps">> = [
  "trace_covered_steps",
  "visible_term_steps",
  "action_contract_steps",
  "template_affordance_steps",
];

function teachingMetricRate(results: RunResult[], key: Exclude<keyof TeachingMetrics, "expected_steps">) {
  return Number(average(results.map((result) => {
    const metrics = result.quality_gate?.teaching_metrics;
    if (!metrics?.expected_steps) return 0;
    return metrics[key] / metrics.expected_steps;
  })).toFixed(3));
}

function aggregateQualityByStructure(results: RunResult[]) {
  return results.reduce<Record<string, {
    runs: number;
    repair_reliance_rate: number;
    repair_action_counts: Partial<Record<RepairActionTag, number>>;
    teaching_metrics: Record<Exclude<keyof TeachingMetrics, "expected_steps">, number>;
  }>>((summary, result) => {
    const key = result.structure || "unclassified";
    const current = summary[key] || {
      runs: 0,
      repair_reliance_rate: 0,
      repair_action_counts: {},
      teaching_metrics: {
        trace_covered_steps: 0,
        visible_term_steps: 0,
        action_contract_steps: 0,
        template_affordance_steps: 0,
      },
    };
    current.runs += 1;
    current.repair_reliance_rate += result.repaired ? 1 : 0;
    for (const tag of REPAIR_ACTION_TAGS) {
      current.repair_action_counts[tag] = (current.repair_action_counts[tag] || 0) + (result.repair_action_counts[tag] || 0);
    }
    const metrics = result.quality_gate?.teaching_metrics;
    if (metrics?.expected_steps) {
      for (const metric of TEACHING_METRIC_KEYS) current.teaching_metrics[metric] += metrics[metric] / metrics.expected_steps;
    }
    summary[key] = current;
    return summary;
  }, {});
}

function finalizeQualityByStructure(summary: ReturnType<typeof aggregateQualityByStructure>) {
  return Object.fromEntries(Object.entries(summary).map(([structure, value]) => [structure, {
    ...value,
    repair_reliance_rate: Number((value.repair_reliance_rate / value.runs).toFixed(3)),
    teaching_metrics: Object.fromEntries(TEACHING_METRIC_KEYS.map((metric) => [metric, Number((value.teaching_metrics[metric] / value.runs).toFixed(3))])),
  }]));
}
async function scoreRun(testCase: LiveFlowEvalCase, run: number): Promise<RunResult> {
  const repairWarnings: string[] = [];
  const generationStages: DynamicFlowGenerationStage[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(" ");
    if (text.includes("schema validation failed")) repairWarnings.push(text);
    if (hasFlag("verbose-logs")) originalError(...args);
  };

  let result: Awaited<ReturnType<typeof generateDynamicFlow>>;
  try {
    result = await generateDynamicFlow({
      topic: testCase.topic,
      preferredPattern: testCase.preferredPattern,
      preferredStructure: testCase.preferredStructure,
    }, {
      includeRaw: hasFlag("raw"),
      onStage: (stage) => { generationStages.push(stage); },
    });
  } finally {
    console.error = originalError;
  }

  const patterns = getPatterns(result.flow);
  const reasons: string[] = [];
  const repairActions = result.repair_actions || [];
  const repairActionCounts = countRepairActions(repairActions);
  const schemaRepaired = repairWarnings.length > 0 || hasRepairTag(repairActions, SCHEMA_REPAIR_TAGS);
  const flowRepaired = hasRepairTag(repairActions, FLOW_REPAIR_TAGS) || /repaired|validation failed|Repair failed/i.test(result.validation_error || "");
  const repaired = schemaRepaired || flowRepaired || repairActions.length > 0;

  if (result.source !== "llm") reasons.push(`expected llm source, got ${result.source}`);
  if (result.failure) reasons.push(`unexpected failure state: ${result.failure.code}`);
  if (!result.quality_gate?.ok) reasons.push(`quality gate failed: ${result.quality_gate?.reason || "missing quality gate"}`);
  const teachingMetrics = result.quality_gate?.teaching_metrics;
  if (!teachingMetrics) {
    reasons.push("missing teaching metrics");
  } else {
    for (const metric of TEACHING_METRIC_KEYS) {
      if (teachingMetrics[metric] !== teachingMetrics.expected_steps) {
        reasons.push(`${metric} ${teachingMetrics[metric]}/${teachingMetrics.expected_steps}`);
      }
    }
  }
  if (result.blueprint?.structure_type !== testCase.expectedStructure) reasons.push(`structure ${result.blueprint?.structure_type || "missing"} != ${testCase.expectedStructure}`);
  for (const pattern of testCase.expectedPatterns) {
    if (!patterns.includes(pattern)) reasons.push(`missing pattern ${pattern}; got ${patterns.join(" -> ")}`);
  }
  if (hasFlag("strict") && repaired) reasons.push(`repair relied on ${repairActionSummary(repairActionCounts) || `schema=${repairWarnings.length}, flow=${flowRepaired}`}`);
    if (result.flow.plays.length !== 4) reasons.push("plays " + result.flow.plays.length + "/4");
  result.flow.plays.forEach((play, index) => {
    if (!hasSpecificPlayTitle(play)) reasons.push(`step ${index + 1} title is too generic: ${play.title}`);
  });
  if (!result.flow.plays.every((play) => play.teaching_trace)) reasons.push("missing teaching_trace");
  if (!textIncludesTopic(result.flow.concept, testCase.topic)) reasons.push(`concept ${result.flow.concept} is not anchored to ${testCase.topic}`);
  if (!result.flow.follow_ups || result.flow.follow_ups.length < 2) reasons.push("missing follow_ups");

  const expectedStages: DynamicFlowGenerationStage[] = ["concept_plan", "blueprint", "flow", "quality_gate"];
  let previousStageIndex = -1;
  for (const stage of expectedStages) {
    const stageIndex = generationStages.indexOf(stage);
    if (stageIndex < 0) reasons.push(`missing generation stage ${stage}`);
    if (stageIndex >= 0 && stageIndex < previousStageIndex) reasons.push(`generation stage order drifted at ${stage}`);
    if (stageIndex >= 0) previousStageIndex = stageIndex;
  }
  const includeRaw = hasFlag("raw");

  return {
    id: testCase.id,
    topic: testCase.topic,
    run,
    source: result.source,
    score: reasons.length ? 0 : 1,
    reasons,
    patterns,
    structure: result.blueprint?.structure_type,
    validation_error: result.validation_error,
    quality_gate: result.quality_gate ? { ok: result.quality_gate.ok, reason: result.quality_gate.reason, failures: result.quality_gate.failures, teaching_metrics: result.quality_gate.teaching_metrics } : undefined,
    repair_warnings: repairWarnings,
    repair_actions: repairActions,
    repair_action_counts: repairActionCounts,
    generation_stages: generationStages,
    schema_repaired: schemaRepaired,
    flow_repaired: flowRepaired,
    repaired,
    raw_output: includeRaw ? result.raw_output : undefined,
    raw_plan_output: includeRaw ? result.raw_plan_output : undefined,
    concept_plan: includeRaw ? result.concept_plan : undefined,
    flow: includeRaw ? result.flow : undefined,
  };
}

function writeReport(results: RunResult[]) {
  const outDir = path.resolve("output", "live-flow-eval");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `live-flow-${timestamp()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  return outPath;
}

async function main() {
  loadLocalEnv();
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log("skipped: DEEPSEEK_API_KEY is not configured");
    console.log("cases: 0");
    console.log("overall: skipped");
    return;
  }

  const runs = Math.max(1, Math.min(5, Number(getArg("runs", "1")) || 1));
  const caseFilter = getArg("case", "").toLowerCase();
  const candidateCases = caseFilter
    ? cases.filter((item) => [item.id, item.topic, item.expectedStructure].some((value) => value.toLowerCase().includes(caseFilter)))
    : cases;
  if (!candidateCases.length) {
    console.log(`cases: 0`);
    console.log(`overall: 0`);
    console.log(`failed_runs: no case matched --case=${caseFilter}`);
    process.exit(1);
  }
  const limit = Math.max(1, Math.min(candidateCases.length, Number(getArg("limit", String(candidateCases.length))) || candidateCases.length));
  const thresholdInput = Number(getArg("threshold", "0.75"));
  const threshold = Math.max(0, Math.min(1, Number.isFinite(thresholdInput) ? thresholdInput : 0.75));
  const selectedCases = candidateCases.slice(0, limit);
  const results: RunResult[] = [];

  for (const testCase of selectedCases) {
    for (let run = 1; run <= runs; run += 1) {
      const result = await scoreRun(testCase, run);
      results.push(result);
      const legacyRepairDetails = [result.schema_repaired ? `schema=${result.repair_warnings.length}` : "", result.flow_repaired ? "flow" : ""].filter(Boolean).join(",");
      const repairDetails = repairActionSummary(result.repair_action_counts) || legacyRepairDetails;
      const repairNote = result.repaired ? `; repaired=${repairDetails || "yes"}` : "";
      const details = result.score ? result.patterns.join(" -> ") : result.reasons.join("; ");
      console.log(`${testCase.id} run ${run}/${runs}: ${result.score ? "pass" : "fail"} (${details}${repairNote})`);
    }
  }

  const overall = Number(average(results.map((result) => result.score)).toFixed(3));
  const llmRate = Number(average(results.map((result) => (result.source === "llm" ? 1 : 0))).toFixed(3));
  const cleanRate = Number(average(results.map((result) => (result.schema_repaired ? 0 : 1))).toFixed(3));
  const schemaRepairRate = Number(average(results.map((result) => (result.schema_repaired ? 1 : 0))).toFixed(3));
  const flowRepairRate = Number(average(results.map((result) => (result.flow_repaired ? 1 : 0))).toFixed(3));
  const repairRate = Number(average(results.map((result) => (result.repaired ? 1 : 0))).toFixed(3));
  const failed = results.filter((result) => result.score < 1);
  const repairActionTotals = aggregateRepairActionCounts(results);
  const qualityByStructure = finalizeQualityByStructure(aggregateQualityByStructure(results));
  const reportPath = writeReport(results);

  console.log(`cases: ${selectedCases.length}`);
  console.log(`runs_per_case: ${runs}`);
  console.log(`overall: ${overall}`);
  console.log(`llm_success_rate: ${llmRate}`);
  console.log(`clean_schema_rate: ${cleanRate}`);
  console.log(`schema_repair_rate: ${schemaRepairRate}`);
  console.log(`flow_repair_rate: ${flowRepairRate}`);
  console.log(`repair_reliance_rate: ${repairRate}`);
  console.log(`repair_action_counts: ${JSON.stringify(repairActionTotals)}`);
  for (const tag of REPAIR_ACTION_TAGS) console.log(`repair_action_${tag}_rate: ${repairActionRate(results, tag)}`);
  for (const metric of TEACHING_METRIC_KEYS) console.log(`teaching_${metric}_rate: ${teachingMetricRate(results, metric)}`);
  console.log(`quality_by_structure: ${JSON.stringify(qualityByStructure)}`);
  console.log(`threshold: ${threshold}`);
  console.log(`failed_runs: ${failed.length ? failed.map((result) => `${result.id}#${result.run}`).join(", ") : "none"}`);
  console.log(`report: ${reportPath}`);

  if (overall < threshold) process.exit(1);
}

const liveEvalContext = createModelAccessContext({
  requestId: "internal-live-flow-eval",
  callType: "flow",
  anonymousUserId: "internal_live_eval",
  sessionId: "internal_live_eval_session",
  allowed: false,
  internalBypass: true,
});

runWithModelAccess(liveEvalContext, main).catch((error) => {
  console.error(error);
  process.exit(1);
});
