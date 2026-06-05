import { NextResponse } from "next/server";
import { stateStore } from "@/lib/harness/state-store";

function summarizeInteraction(schemaType: string, eventType: string, payload: Record<string, unknown>) {
  if (eventType === "gacha_completed") {
    return payload.won
      ? `用户完成抽卡模拟并获得收益 ${payload.profit ?? ""}`
      : `用户完成抽卡模拟并理解有限损失 ${payload.profit ?? ""}`;
  }

  if (eventType === "quiz_answered") {
    return payload.correct ? "用户在测验中答对，理解度提升" : "用户在测验中答错，需要更低门槛解释";
  }

  if (eventType === "build_sandbox_completed") {
    return "用户完成模块构建沙盒";
  }

  if (eventType === "card_flip_completed") {
    return "用户翻完全部概念卡片";
  }

  if (eventType === "timeline_completed") {
    return `用户拖到时间线终点：${payload.final_label ?? "最后节点"}`;
  }

  if (eventType === "timeline_node_viewed") {
    return `用户查看时间线节点：${payload.label ?? ""}`;
  }

  if (eventType === "slider_scenario_selected") {
    return `用户选择滑块场景：${payload.label ?? ""}`;
  }

  if (eventType === "slider_value_changed") {
    return `用户拖动滑块到 ${payload.value ?? ""}`;
  }

  if (eventType === "comparison_ratio_changed") {
    return `用户调整对比视角到 ${payload.ratio ?? ""}%`;
  }

  if (eventType === "narrative_branch_selected") {
    return `用户选择叙事分支：${payload.choice ?? ""}`;
  }

  if (eventType === "classification_item_sorted") {
    return payload.correct
      ? `用户正确分类：${payload.item ?? ""}`
      : `用户尝试分类：${payload.item ?? ""}`;
  }

  if (eventType === "classification_sort_completed") {
    return `用户完成分类归因，得分 ${payload.score ?? 0}/${payload.total ?? 0}`;
  }

  if (eventType === "simulation_param_changed") {
    return `用户调整模拟参数：${payload.label ?? ""}=${payload.value ?? ""}`;
  }

  if (eventType === "simulation_play_completed") {
    return `用户完成模拟推演，终值 ${payload.final_value ?? ""}`;
  }

  return `用户触发 ${schemaType} 的 ${eventType} 事件`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const userId = String(body.userId || "");
  const schemaType = String(body.schemaType || "unknown_schema");
  const eventType = String(body.eventType || "interaction");
  const payload = (body.payload || {}) as Record<string, unknown>;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const updatedState = await stateStore.recordInteraction(
    userId,
    schemaType,
    summarizeInteraction(schemaType, eventType, payload),
  );

  return NextResponse.json({ userState: updatedState });
}
