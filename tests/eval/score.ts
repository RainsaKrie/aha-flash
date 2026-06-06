import path from "node:path";
import { readEvalCases, readJsonFile, scorePredictions, type Prediction } from "./lib.ts";

const predictionsPath = process.argv[2];
const cases = readEvalCases();
const wantsJson = process.argv.includes("--json");
const resolvedPredictionsPath = predictionsPath && predictionsPath !== "--json" ? predictionsPath : undefined;
const predictions = resolvedPredictionsPath ? readJsonFile<Prediction[]>(path.resolve(resolvedPredictionsPath)) : [];
const report = scorePredictions(cases, predictions);

if (wantsJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const failed = report.cases.filter((item) => item.score < 1);
  console.log(`cases: ${report.total}`);
  console.log(`overall: ${report.averages.overall}`);
  console.log(`json_valid: ${report.averages.json_valid}`);
  console.log(`pattern_accuracy: ${report.averages.pattern_accuracy}`);
  console.log(`template_accuracy: ${report.averages.template_accuracy}`);
  console.log(`depth_accuracy: ${report.averages.depth_accuracy}`);
  console.log(`route_accuracy: ${report.averages.route_accuracy ?? "n/a"}`);
  console.log(`metaphor_fit: ${report.averages.metaphor_fit}`);
  console.log(`payload_completeness: ${report.averages.payload_completeness}`);
  console.log(`failed_cases: ${failed.length ? failed.map((item) => item.id).join(", ") : "none"}`);
}
