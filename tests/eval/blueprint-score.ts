import cases from "../fixtures/blueprint-cases.json" with { type: "json" };
import { buildKnowledgeBlueprint, type KnowledgeStructureType } from "../../src/lib/content/knowledge-blueprint.ts";
import { getKnowledgeSkill } from "../../src/lib/content/skill-packs.ts";
import type { PatternType } from "../../src/types/schema.ts";

interface BlueprintEvalCase {
  id: string;
  topic: string;
  expectedStructure: KnowledgeStructureType;
  expectedPatterns: PatternType[];
}

interface BlueprintEvalResult {
  id: string;
  score: number;
  reason: string;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function asCases(value: unknown): BlueprintEvalCase[] {
  return Array.isArray(value) ? (value as BlueprintEvalCase[]) : [];
}

function scoreCase(testCase: BlueprintEvalCase): BlueprintEvalResult {
  const blueprint = buildKnowledgeBlueprint({
    topic: testCase.topic,
    domain: "eval",
    core_question: "How should " + testCase.topic + " be taught?",
    grounding_terms: [],
    knowledge_structure: "",
    recommended_patterns: [],
    avoid_patterns: [],
    learning_path: [],
  });
  const failures: string[] = [];

  if (blueprint.structure_type !== testCase.expectedStructure) {
    failures.push("structure " + blueprint.structure_type + " != " + testCase.expectedStructure);
  }
  for (const pattern of testCase.expectedPatterns) {
    if (!blueprint.pattern_strategy.includes(pattern)) {
      failures.push("missing pattern " + pattern + "; got " + blueprint.pattern_strategy.join(" -> "));
    }
  }
  if (blueprint.teaching_sequence.length < 4) {
    failures.push("teaching_sequence " + blueprint.teaching_sequence.length + "/4");
  }
  if (blueprint.confidence < 0.7) {
    failures.push("confidence " + blueprint.confidence + " < 0.7");
  }
  if (!blueprint.core_terms.some((term) => testCase.topic.includes(term) || term.includes(testCase.topic.slice(0, 32)))) {
    failures.push("topic is missing from Blueprint grounding terms");
  }

  const skill = getKnowledgeSkill(testCase.expectedStructure);
  if (!skill) {
    failures.push("missing generic Skill for " + testCase.expectedStructure);
  } else {
    if (blueprint.skill_id !== skill.id) {
      failures.push("skill " + (blueprint.skill_id || "missing") + " != " + skill.id);
    }
    const missingAvoidPatterns = skill.unsuitable_patterns.filter((pattern) => !blueprint.avoid_patterns.includes(pattern));
    if (missingAvoidPatterns.length) {
      failures.push("missing Skill avoid patterns: " + missingAvoidPatterns.join(", "));
    }
  }

  return {
    id: testCase.id,
    score: failures.length ? 0 : 1,
    reason: failures.length ? failures.join("; ") : blueprint.structure_type + ": " + blueprint.pattern_strategy.join(" -> "),
  };
}

function main() {
  const results = asCases(cases).map(scoreCase);
  for (const result of results) {
    console.log(result.id + ": " + (result.score ? "pass" : "fail") + " (" + result.reason + ")");
  }
  const failed = results.filter((result) => result.score < 1);
  const overall = Number(average(results.map((result) => result.score)).toFixed(3));

  console.log("cases: " + results.length);
  console.log("overall: " + overall);
  console.log("failed_cases: " + (failed.length ? failed.map((result) => result.id).join(", ") : "none"));

  if (failed.length) process.exit(1);
}

main();