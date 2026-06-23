import { generateDynamicFlow } from "../../src/lib/content/dynamic-flow-generation.ts";
import type { FlowPatternPreference } from "../../src/lib/content/flow-pattern-options.ts";
import type { KnowledgeStructurePreference } from "../../src/lib/content/knowledge-blueprint.ts";
import { normalizeUISchema, type PatternType, type TemplateId } from "../../src/types/schema.ts";

interface DynamicFlowEvalCase {
  id: string;
  topic: string;
  preferredPattern: FlowPatternPreference;
  preferredStructure?: KnowledgeStructurePreference;
  expectedStructure?: KnowledgeStructurePreference;
  expectedPattern?: PatternType;
  expectedTemplateAt?: { step: number; template: TemplateId };
  expectedConceptIncludes?: string;
  requiredTerms?: string[];
  bannedTerms?: string[];
  bannedPatterns?: PatternType[];
  requiredFollowUpTerms?: string[];
}

interface CaseResult {
  id: string;
  topic: string;
  source: string;
  score: number;
  reason: string;
}

const cases: DynamicFlowEvalCase[] = [
  { id: "dynamic-auto-photosynthesis", topic: "photosynthesis", preferredPattern: "auto" },
  { id: "dynamic-system-dns", topic: "DNS parsing", preferredPattern: "system_builder", expectedPattern: "system_builder", expectedTemplateAt: { step: 1, template: "sequence_order" } },
  { id: "dynamic-timeline-industrial", topic: "industrial revolution", preferredPattern: "process_timeline", expectedPattern: "process_timeline" },
  { id: "dynamic-comparison-inflation", topic: "inflation vs deflation", preferredPattern: "comparison", expectedPattern: "comparison" },
  { id: "dynamic-parameter-utility", topic: "marginal utility", preferredPattern: "parameter_explore", expectedPattern: "parameter_explore" },
  { id: "dynamic-agent-grounding", topic: "Agent", preferredPattern: "auto", expectedConceptIncludes: "Agent", bannedTerms: ["相近概念", "专用兜底"] },
  { id: "dynamic-kubernetes-operator", topic: "Kubernetes operator", preferredPattern: "auto", expectedConceptIncludes: "Kubernetes operator", bannedTerms: ["相近概念"] },
  { id: "dynamic-linear-programming-grounding", topic: "linear programming", preferredPattern: "auto", expectedConceptIncludes: "linear programming", bannedPatterns: ["probability"], requiredFollowUpTerms: ["单纯形法", "对偶问题", "敏感性分析"] },
  { id: "dynamic-structure-override-comparison", topic: "Agent", preferredPattern: "auto", preferredStructure: "comparison_frame", expectedStructure: "comparison_frame", expectedPattern: "comparison", expectedConceptIncludes: "Agent" },

];

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPatterns(flow: Awaited<ReturnType<typeof generateDynamicFlow>>["flow"]) {
  return flow.plays.map((play) => normalizeUISchema(play.schema).pattern);
}

async function scoreCase(testCase: DynamicFlowEvalCase): Promise<CaseResult> {
  const result = await generateDynamicFlow({
    topic: testCase.topic,
    preferredPattern: testCase.preferredPattern,
    preferredStructure: testCase.preferredStructure,
  });
  const flow = result.flow;
  const patterns = getPatterns(flow);
  const failures: string[] = [];
  const expectedConcept = testCase.expectedConceptIncludes || testCase.topic;

  if (result.source !== "mock") failures.push(`expected mock fallback, got ${result.source}`);
  if (!result.failure) failures.push("expected honest generation_unavailable failure in no-key mode");
  if (result.failure && result.failure.code !== "generation_unavailable") failures.push(`unexpected failure state: ${result.failure.code}`);
  if (!result.failure && result.quality_gate && !result.quality_gate.ok) {
    failures.push(`quality gate failed: ${result.quality_gate.reason || result.quality_gate.failures.join("; ")}`);
  }
  if (testCase.expectedStructure && result.blueprint?.structure_type !== testCase.expectedStructure) {
    failures.push(`expected structure ${testCase.expectedStructure}, got ${result.blueprint?.structure_type || "missing"}`);
  }
  if (!flow.id.startsWith("custom-")) failures.push(`id ${flow.id} does not start with custom-`);
  if (flow.source !== "generated") failures.push(`flow source is ${flow.source || "missing"}`);
    if (flow.plays.length !== 4) failures.push("plays " + flow.plays.length + "/4");
  if (!flow.plays.every((play) => play.teaching_trace)) failures.push("missing teaching_trace on generated plays");
  if (!flow.concept.toLowerCase().includes(expectedConcept.toLowerCase())) failures.push(`concept ${flow.concept} is not anchored to ${expectedConcept}`);
  if (!flow.title.toLowerCase().includes(expectedConcept.toLowerCase())) failures.push("title is not anchored to topic");
  if (!flow.follow_ups || flow.follow_ups.length < 2) failures.push("missing follow_ups");
  const followUpText = JSON.stringify(flow.follow_ups || []);
  for (const term of testCase.requiredFollowUpTerms || []) {
    if (!followUpText.includes(term)) failures.push(`missing follow-up term ${term}`);
  }

  const flowText = JSON.stringify(flow);
  for (const term of testCase.requiredTerms || []) {
    if (!flowText.includes(term)) failures.push(`missing required term ${term}`);
  }

  for (const term of testCase.bannedTerms || []) {
    if (flowText.includes(term)) failures.push(`contains banned term ${term}`);
  }

  for (const bannedPattern of testCase.bannedPatterns || []) {
    if (patterns.includes(bannedPattern)) failures.push(`contains banned pattern ${bannedPattern}; got ${patterns.join(" -> ")}`);
  }

  if (testCase.expectedTemplateAt) {
    const step = flow.plays[testCase.expectedTemplateAt.step];
    const template = step ? normalizeUISchema(step.schema).template : "missing";
    if (template !== testCase.expectedTemplateAt.template) {
      failures.push(`step ${testCase.expectedTemplateAt.step + 1} expected template ${testCase.expectedTemplateAt.template}, got ${template}`);
    }
  }

  if (testCase.expectedPattern && !patterns.includes(testCase.expectedPattern)) {
    failures.push(`missing expected pattern ${testCase.expectedPattern}; got ${patterns.join(" -> ")}`);
  }

  return {
    id: testCase.id,
    topic: testCase.topic,
    source: result.source,
    score: failures.length ? 0 : 1,
    reason: failures.length ? failures.join("; ") : `patterns ${patterns.join(" -> ")}`,
  };
}

async function main() {
  const savedApiKey = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;

  try {
    const results = [];
    for (const testCase of cases) {
      const result = await scoreCase(testCase);
      results.push(result);
      console.log(`${testCase.id}: ${result.score ? "pass" : "fail"} (${result.reason})`);
    }

    const failed = results.filter((result) => result.score < 1);
    const overall = Number(average(results.map((result) => result.score)).toFixed(3));

    console.log(`cases: ${results.length}`);
    console.log(`overall: ${overall}`);
    console.log(`failed_cases: ${failed.length ? failed.map((result) => result.id).join(", ") : "none"}`);

    if (failed.length) process.exit(1);
  } finally {
    if (savedApiKey) process.env.DEEPSEEK_API_KEY = savedApiKey;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});