import { getShowcaseFlows } from "../../src/lib/content/mock-flows.ts";
import { normalizeUISchema, SCHEMA_CATALOG, type PatternType } from "../../src/types/schema.ts";

interface PatternHit {
  pattern: PatternType;
  flowId: string;
  playId: string;
}

const requiredPatterns = Object.keys(SCHEMA_CATALOG) as PatternType[];
const flows = getShowcaseFlows();
const hits: PatternHit[] = flows.flatMap((flow) =>
  flow.plays.map((play) => ({
    pattern: normalizeUISchema(play.schema).pattern,
    flowId: flow.id,
    playId: play.id,
  })),
);

const coverage = new Map<PatternType, PatternHit[]>();
for (const hit of hits) {
  coverage.set(hit.pattern, [...(coverage.get(hit.pattern) || []), hit]);
}

const missing = requiredPatterns.filter((pattern) => !coverage.has(pattern));

console.log(`showcase_flows: ${flows.length}`);
console.log(`showcase_plays: ${hits.length}`);
console.log(`patterns_required: ${requiredPatterns.length}`);
console.log(`patterns_covered: ${requiredPatterns.length - missing.length}`);
console.log(`missing_patterns: ${missing.length ? missing.join(", ") : "none"}`);

for (const pattern of requiredPatterns) {
  const patternHits = coverage.get(pattern) || [];
  const locations = patternHits.map((hit) => `${hit.flowId}/${hit.playId}`).join(", ");
  console.log(`${pattern}: ${locations || "missing"}`);
}

if (flows.length < 5) {
  console.error("Expected at least 5 showcase flows for public Pattern coverage.");
  process.exit(1);
}

if (missing.length) {
  console.error(`Showcase Pattern coverage incomplete: ${missing.join(", ")}`);
  process.exit(1);
}