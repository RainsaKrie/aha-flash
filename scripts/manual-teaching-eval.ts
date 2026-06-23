import fs from "node:fs";
import path from "node:path";
import { generateDynamicFlow } from "../src/lib/content/dynamic-flow-generation.ts";
import type { KnowledgeBlueprint, TeachingMetrics } from "../src/lib/content/knowledge-blueprint.ts";

interface ReviewRun {
  topic: string;
  run: number;
  source: string;
  structure?: string;
  validation_error?: string;
  repair_actions: Array<{ tag: string; message: string }>;
  blueprint?: KnowledgeBlueprint;
  teaching_metrics?: TeachingMetrics;
  quality_failures: string[];
  flow: Awaited<ReturnType<typeof generateDynamicFlow>>["flow"];
}

function getArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function short(value: unknown, max = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function summarizePayload(schema: unknown) {
  const payload = asRecord(asRecord(schema).payload);
  const fragments = [
    short(payload.question),
    short(payload.title),
    short(payload.variable_label),
    short(payload.goal),
    short(payload.instruction),
  ].filter(Boolean);

  const labels = [payload.options, payload.cards, payload.events, payload.modules, payload.items]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .map((item) => {
      const record = asRecord(item);
      return short(record.label || record.front || record.name);
    })
    .filter(Boolean)
    .slice(0, 5);

  return [...fragments, ...labels].join(" / ") || "(没有可读的 payload 摘要)";
}

function metricLine(metrics?: TeachingMetrics) {
  if (!metrics) return "缺失";
  const expected = metrics.expected_steps || 0;
  return `trace ${metrics.trace_covered_steps}/${expected} · visible terms ${metrics.visible_term_steps}/${expected} · action ${metrics.action_contract_steps}/${expected} · affordance ${metrics.template_affordance_steps}/${expected}`;
}

function renderMarkdown(reviews: ReviewRun[]) {
  const lines = [
    "# 趣灵四步教学人工评审",
    "",
    `- 生成时间：${new Date().toISOString()}`,
    `- 样本数：${reviews.length}`,
    "- 规则：QualityGate 已验证字段、术语、动作和模板；以下评分只判断人是否真的被教会。每项 1-5 分，低于 3 分必须写出具体卡点。",
    "",
  ];

  for (const review of reviews) {
    lines.push(`## ${review.topic} · Run ${review.run}`);
    lines.push("");
    lines.push(`- Source: ${review.source}`);
    lines.push(`- Knowledge structure: ${review.structure || "missing"}`);
    lines.push(`- Deterministic QualityGate: ${metricLine(review.teaching_metrics)}`);
    lines.push(`- Repair actions: ${review.repair_actions.length ? review.repair_actions.map((action) => `${action.tag}: ${action.message}`).join(" | ") : "none"}`);
    if (review.validation_error) lines.push(`- Validation note: ${short(review.validation_error, 360)}`);
    if (review.quality_failures.length) lines.push(`- Gate failures: ${review.quality_failures.join(" | ")}`);
    lines.push("");

    review.flow.plays.forEach((play, index) => {
      const expected = review.blueprint?.teaching_sequence[index];
      const schema = asRecord(play.schema);
      const trace = play.teaching_trace;
      lines.push(`### 第 ${index + 1} 关：${play.title}`);
      lines.push("");
      lines.push(`- 计划：${expected ? `${expected.goal}；用户动作：${expected.user_action}；应解释：${expected.must_explain.join(" / ")}` : "missing Blueprint step"}`);
      lines.push(`- 实际组件：${String(schema.pattern || "unknown")}/${String(schema.template || "unknown")}`);
      lines.push(`- 用户看见：${summarizePayload(schema)}`);
      lines.push(`- Trace：${trace ? `${trace.blueprint_step_goal}；${trace.intended_user_action}；${trace.covered_terms.join(" / ")}` : "missing"}`);
      lines.push("- 人工勾选：");
      lines.push("  - [ ] 我能说出这一关在解释的具体机制，而不只是复述标题。");
      lines.push("  - [ ] 页面要求我做的动作，和这一关的学习目标一致。");
      lines.push("  - [ ] 操作后的反馈解释了为什么，而不只是告诉我对或错。");
      lines.push("");
    });

    lines.push("### 整体评分");
    lines.push("");
    lines.push("- 主题贴合度（1-5）：__");
    lines.push("- 四关递进性（1-5）：__");
    lines.push("- 交互与目标一致性（1-5）：__");
    lines.push("- 解释准确性与可理解性（1-5）：__");
    lines.push("- 学完后我能解释核心机制（是 / 否）：__");
    lines.push("- 最需要修的关卡与原因：__");
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  loadLocalEnv();
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");

  const topics = getArg("topics", "linear programming")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 8);
  const runs = Math.max(1, Math.min(3, Number(getArg("runs", "1")) || 1));
  const reviews: ReviewRun[] = [];

  for (const topic of topics) {
    for (let run = 1; run <= runs; run += 1) {
      const result = await generateDynamicFlow({ topic, preferredPattern: "auto" });
      reviews.push({
        topic,
        run,
        source: result.source,
        structure: result.blueprint?.structure_type,
        validation_error: result.validation_error,
        repair_actions: result.repair_actions || [],
        blueprint: result.blueprint,
        teaching_metrics: result.quality_gate?.teaching_metrics,
        quality_failures: result.quality_gate?.failures || [],
        flow: result.flow,
      });
      console.log(`${topic} ${run}/${runs}: ${result.source}; ${metricLine(result.quality_gate?.teaching_metrics)}`);
    }
  }

  const outDir = path.resolve("output", "manual-teaching-eval");
  fs.mkdirSync(outDir, { recursive: true });
  const base = `teaching-${timestamp()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderMarkdown(reviews), "utf8");
  console.log(`json: ${jsonPath}`);
  console.log(`markdown: ${markdownPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});