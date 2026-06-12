import fs from "node:fs";
import path from "node:path";

interface ApiResponse {
  flow?: {
    id: string;
    title: string;
    summary?: string;
    concepts?: string[];
    plays?: Array<{
      id: string;
      title: string;
      concept: string;
      estimated_minutes: number;
      reward_copy: string;
      schema: Record<string, unknown>;
    }>;
  };
  source?: "llm" | "mock";
  validation_error?: string;
}

function getArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function summarizeSchema(schema: Record<string, unknown>) {
  const pattern = String(schema.pattern || schema.type || "unknown");
  const template = String(schema.template || "v1");
  const payload = asRecord(schema.payload) || asRecord(schema.config) || {};
  const lines = [`- Pattern: ${pattern}/${template}`];

  if (typeof payload.question === "string") {
    lines.push(`- Question: ${payload.question}`);
    const options = Array.isArray(payload.options) ? payload.options : [];
    options.slice(0, 4).forEach((raw, index) => {
      const option = asRecord(raw) || {};
      lines.push(`  - ${index + 1}. ${String(option.label || "")} ${option.correct === true ? "[correct]" : ""}`.trimEnd());
    });
  }

  if (Array.isArray(payload.cards)) {
    payload.cards.slice(0, 4).forEach((raw, index) => {
      const card = asRecord(raw) || {};
      lines.push(`- Card ${index + 1}: ${String(card.front || "")} -> ${String(card.back || "").slice(0, 80)}`);
    });
  }

  if (typeof payload.variable_label === "string") {
    lines.push(`- Variable: ${payload.variable_label} (${String(payload.min)}-${String(payload.max)}${String(payload.unit || "")})`);
    if (typeof payload.explanation_template === "string") {
      lines.push(`- Explanation: ${payload.explanation_template}`);
    }
    const insightRules = Array.isArray(payload.insight_rules) ? payload.insight_rules : [];
    insightRules.slice(0, 3).forEach((raw) => {
      const rule = asRecord(raw) || {};
      lines.push(`  - ${String(rule.when || "")}: ${String(rule.text || "")}`);
    });
  }

  if (Array.isArray(payload.events)) {
    payload.events.slice(0, 6).forEach((raw, index) => {
      const event = asRecord(raw) || {};
      lines.push(`- Event ${index + 1}: ${String(event.label || "")} -> ${String(event.description || "").slice(0, 100)}`);
    });
  }

  const left = asRecord(payload.left);
  const right = asRecord(payload.right);
  if (left || right) {
    lines.push(`- Compare: ${String(left?.label || payload.subject_a || "A")} vs ${String(right?.label || payload.subject_b || "B")}`);
    const dimensions = Array.isArray(payload.dimensions) ? payload.dimensions : [];
    dimensions.slice(0, 5).forEach((raw) => {
      const dimension = asRecord(raw) || {};
      lines.push(`  - ${String(dimension.label || "维度")}: ${String(dimension.a || "")} / ${String(dimension.b || "")} -> ${String(dimension.insight || "")}`);
    });
  }

  return lines.join("\n");
}

function flowIdFromEndpoint(endpoint: string) {
  try {
    return new URL(endpoint).searchParams.get("flowId") || "bayes-starter";
  } catch {
    return "bayes-starter";
  }
}

function renderMarkdown(responses: ApiResponse[], endpoint: string) {
  const flowId = flowIdFromEndpoint(endpoint);
  const lines = [
    `# ${flowId} LLM Flow Steps 手动评测`,
    "",
    `- Endpoint: ${endpoint}`,
    `- Runs: ${responses.length}`,
    `- Generated at: ${new Date().toISOString()}`,
    "",
    "人工判断标准：每次 3 关下来，如果你觉得自己真的多抓住了核心机制，记为 aha。10 次里 >=8 次 aha，则该知识类型的 Flow Steps 方向暂时成立。",
    "",
  ];

  responses.forEach((response, index) => {
    const flow = response.flow;
    lines.push(`## Run ${index + 1}`);
    lines.push("");
    lines.push(`- Source: ${response.source || "unknown"}`);
    if (response.validation_error) lines.push(`- Validation error: ${response.validation_error.replace(/\n/g, " ").slice(0, 400)}`);
    lines.push(`- Summary: ${flow?.summary || ""}`);
    lines.push(`- Concepts: ${(flow?.concepts || []).join(" / ")}`);
    lines.push("");

    for (const play of flow?.plays || []) {
      lines.push(`### ${play.title}｜${play.concept}｜${play.estimated_minutes}min`);
      lines.push("");
      lines.push(summarizeSchema(play.schema));
      lines.push("");
      lines.push(`Reward: ${play.reward_copy}`);
      lines.push("");
    }

    lines.push("人工评分：__/10");
    lines.push("Aha：是 / 否");
    lines.push("备注：");
    lines.push("");
  });

  return lines.join("\n");
}

async function main() {
  const runs = Math.max(1, Math.min(20, Number(getArg("runs", "10")) || 10));
  const endpoint = getArg("url", "http://127.0.0.1:3000/api/flow?flowId=bayes-starter");
  const responses: ApiResponse[] = [];

  for (let index = 0; index < runs; index += 1) {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`Run ${index + 1} failed: HTTP ${response.status}`);
    responses.push((await response.json()) as ApiResponse);
    console.log(`run ${index + 1}/${runs}: ${responses[index].source || "unknown"}`);
  }

  const outDir = path.resolve("output", "manual-flow-eval");
  fs.mkdirSync(outDir, { recursive: true });
  const base = `${flowIdFromEndpoint(endpoint)}-${timestamp()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const mdPath = path.join(outDir, `${base}.md`);

  fs.writeFileSync(jsonPath, `${JSON.stringify(responses, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, renderMarkdown(responses, endpoint), "utf8");

  const llmCount = responses.filter((item) => item.source === "llm").length;
  console.log(`llm_runs: ${llmCount}/${runs}`);
  console.log(`json: ${jsonPath}`);
  console.log(`markdown: ${mdPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
