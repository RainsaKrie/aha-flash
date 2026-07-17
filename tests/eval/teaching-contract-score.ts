import { generateDynamicFlow } from "../../src/lib/content/dynamic-flow-generation.ts";
import { evaluateFlowAgainstBlueprint } from "../../src/lib/content/knowledge-blueprint.ts";

type GeneratedFlow = Awaited<ReturnType<typeof generateDynamicFlow>>["flow"];

function cloneFlow(flow: GeneratedFlow): GeneratedFlow {
  return JSON.parse(JSON.stringify(flow)) as GeneratedFlow;
}

function schemaRecord(flow: GeneratedFlow, index: number) {
  return flow.plays[index].schema as unknown as { template: string; payload: Record<string, unknown> };
}

function requireCondition(condition: unknown, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

async function main() {
  const savedApiKey = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  const failures: string[] = [];

  try {
    const result = await generateDynamicFlow({ topic: "DNS parsing", preferredPattern: "auto" });
    const blueprint = result.blueprint;
    const baseline = result.quality_gate;
    requireCondition(Boolean(blueprint), "missing deterministic Blueprint", failures);
    requireCondition(Boolean(baseline?.teaching_metrics), "missing teaching metrics", failures);

    const baselineMetrics = baseline?.teaching_metrics;
    requireCondition(baselineMetrics?.expected_steps === 4, `expected 4 teaching steps, got ${baselineMetrics?.expected_steps}`, failures);
    requireCondition(baselineMetrics?.action_contract_steps === 4, `expected 4 action contracts, got ${baselineMetrics?.action_contract_steps}`, failures);
    requireCondition(baselineMetrics?.template_affordance_steps === 4, `expected 4 template affordances, got ${baselineMetrics?.template_affordance_steps}`, failures);

    if (blueprint) {
      const ungrounded = cloneFlow(result.flow);
      const stageTwo = ungrounded.plays[1];
      const stageTwoSchema = schemaRecord(ungrounded, 1);
      stageTwo.title = "沿着路径走";
      stageTwo.reward_copy = "这一关先看流程。";
      stageTwoSchema.payload.title = "把它排一排";
      stageTwoSchema.payload.events = [
        { label: "开始", description: "先出现一个变化。" },
        { label: "过程", description: "接着发生下一步。" },
        { label: "结束", description: "最后得到一个结果。" },
      ];
      stageTwoSchema.payload.correct_order = ["开始", "过程", "结束"];
      if (stageTwo.teaching_trace) stageTwo.teaching_trace.covered_terms = ["过程"];
      const ungroundedQuality = evaluateFlowAgainstBlueprint(ungrounded, blueprint, "auto");
      requireCondition(
        ungroundedQuality.teaching_metrics.visible_term_steps < ungroundedQuality.teaching_metrics.expected_steps,
        "ungrounded stage should reduce visible-term coverage",
        failures,
      );
      requireCondition(
        ungroundedQuality.failures.some((failure) => failure.includes("visibly connect")),
        "ungrounded stage should fail visible grounding",
        failures,
      );
      requireCondition(
        ungroundedQuality.failures.some((failure) => failure.includes("trace does not cover")),
        "ungrounded stage should fail trace grounding",
        failures,
      );

      const wrongTemplate = cloneFlow(result.flow);
      schemaRecord(wrongTemplate, 1).template = "horizontal_timeline";
      const wrongTemplateQuality = evaluateFlowAgainstBlueprint(wrongTemplate, blueprint, "auto");
      requireCondition(
        wrongTemplateQuality.failures.some((failure) => failure.includes("action contract failed") && failure.includes("sequence_order")),
        "timeline sort must reject a non-sortable template",
        failures,
      );

      const missingFeedback = cloneFlow(result.flow);
      const quizSchema = schemaRecord(missingFeedback, 3);
      const options = Array.isArray(quizSchema.payload.options) ? quizSchema.payload.options as Array<Record<string, unknown>> : [];
      if (options[0]) options[0].explanation = "";
      const missingFeedbackQuality = evaluateFlowAgainstBlueprint(missingFeedback, blueprint, "auto");
      requireCondition(
        missingFeedbackQuality.failures.some((failure) => failure.includes("action contract failed") && failure.includes("explanation")),
        "knowledge check must require answer feedback",
        failures,
      );

      const ambiguousQuiz = cloneFlow(result.flow);
      const ambiguousQuizSchema = schemaRecord(ambiguousQuiz, 3);
      ambiguousQuizSchema.payload.question = "为了最大化结果，下列哪种干预最有效？";
      ambiguousQuizSchema.payload.options = [
        { label: "只提高收益率", correct: false, explanation: "它会改变结果。" },
        { label: "只延长时间", correct: true, explanation: "时间会放大累积效应。" },
        { label: "同时提高收益率和初始本金", correct: false, explanation: "它同时改变两个条件。" },
      ];
      const ambiguousQuizQuality = evaluateFlowAgainstBlueprint(ambiguousQuiz, blueprint, "auto");
      requireCondition(
        ambiguousQuizQuality.failures.some((failure) => failure.includes("ambiguous superlative")),
        "knowledge check must reject superlative questions with a combined intervention",
        failures,
      );

      const detachedQuiz = cloneFlow(result.flow);
      const detachedQuizSchema = schemaRecord(detachedQuiz, 3);
      detachedQuizSchema.payload.question = "If future use is frequent but learning ability is limited, which entrance should you choose?";
      detachedQuizSchema.payload.options = [
        { label: "Choose entrance A", correct: true, explanation: "It is easier to learn." },
        { label: "Choose entrance B", correct: false, explanation: "It has a broader boundary." },
        { label: "Either one", correct: false, explanation: "Choose based on mood." },
      ];
      const detachedQuizQuality = evaluateFlowAgainstBlueprint(detachedQuiz, blueprint, "auto");
      requireCondition(
        detachedQuizQuality.failures.some((failure) => failure.includes("knowledge check prompt does not visibly connect")),
        "knowledge check question and options must remain visibly grounded to the topic",
        failures,
      );

      const overlong = cloneFlow(result.flow);
      overlong.estimated_minutes = 7;
      const overlongQuality = evaluateFlowAgainstBlueprint(overlong, blueprint, "auto");
      requireCondition(
        overlongQuality.failures.some((failure) => failure.includes("outside the 3-5 minute product promise")),
        "dynamic Flow must stay within the 3-5 minute product promise",
        failures,
      );
    }
  } finally {
    if (savedApiKey) process.env.DEEPSEEK_API_KEY = savedApiKey;
  }

  console.log(`checks: ${failures.length ? "failed" : "passed"}`);
  if (failures.length) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
