import path from "node:path";
import { readEvalCases, readJsonFile, scorePredictions, type Prediction } from "./lib.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--json");
const wantsJson = process.argv.includes("--json");
const [baselinePath, candidatePath] = args;

if (!baselinePath || !candidatePath) {
  console.error("Usage: node --experimental-strip-types tests/eval/compare.ts <baseline.json> <candidate.json>");
  process.exit(1);
}

const cases = readEvalCases();
const baseline = scorePredictions(cases, readJsonFile<Prediction[]>(path.resolve(baselinePath)));
const candidate = scorePredictions(cases, readJsonFile<Prediction[]>(path.resolve(candidatePath)));
const baselineCases = new Map(baseline.cases.map((item) => [item.id, item]));

const caseDiffs = candidate.cases.map((next) => {
  const prev = baselineCases.get(next.id);
  return {
    id: next.id,
    delta: Number((next.score - (prev?.score || 0)).toFixed(3)),
    baseline_score: prev?.score,
    candidate_score: next.score,
    baseline_actual: prev?.actual,
    candidate_actual: next.actual,
  };
});

const report = {
  total: candidate.total,
  baseline: baseline.averages,
  candidate: candidate.averages,
  delta: {
    overall: Number((candidate.averages.overall - baseline.averages.overall).toFixed(3)),
    json_valid: Number((candidate.averages.json_valid - baseline.averages.json_valid).toFixed(3)),
    pattern_accuracy: Number((candidate.averages.pattern_accuracy - baseline.averages.pattern_accuracy).toFixed(3)),
    template_accuracy: Number((candidate.averages.template_accuracy - baseline.averages.template_accuracy).toFixed(3)),
    depth_accuracy: Number((candidate.averages.depth_accuracy - baseline.averages.depth_accuracy).toFixed(3)),
    metaphor_fit: Number((candidate.averages.metaphor_fit - baseline.averages.metaphor_fit).toFixed(3)),
    payload_completeness: Number(
      (candidate.averages.payload_completeness - baseline.averages.payload_completeness).toFixed(3),
    ),
  },
  cases: caseDiffs,
};

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const changed = caseDiffs.filter((item) => item.delta !== 0);
  console.log(`cases: ${report.total}`);
  console.log(`baseline_overall: ${report.baseline.overall}`);
  console.log(`candidate_overall: ${report.candidate.overall}`);
  console.log(`delta_overall: ${report.delta.overall}`);
  console.log(`delta_pattern_accuracy: ${report.delta.pattern_accuracy}`);
  console.log(`delta_template_accuracy: ${report.delta.template_accuracy}`);
  console.log(`delta_depth_accuracy: ${report.delta.depth_accuracy}`);
  console.log(`changed_cases: ${changed.length ? changed.map((item) => `${item.id}:${item.delta}`).join(", ") : "none"}`);
}
