"use client";

import { BrainCircuit, Map, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { renderBySchema } from "@/components/generative-ui/registry";
import { readUserId, writeUserId } from "@/lib/utils/storage";
import { useAppStore } from "@/stores/app-store";
import type { Message } from "@/types/chat";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS, normalizeUISchema } from "@/types/schema";
import type { InteractionEvent, LearningDepth } from "@/types/schema";
import type { UserState } from "@/types/state";

function nextDepth(depth: LearningDepth): LearningDepth | null {
  if (depth === "rapid") return "scenario";
  if (depth === "scenario") return "mapping";
  return null;
}

function depthGuideCopy(depth: LearningDepth) {
  if (depth === "scenario") return "还不够清楚？代入真实场景试试";
  return "想不想拆开看看原理？";
}

export default function HomePage() {
  const {
    userId,
    currentSchema,
    messages,
    isLoading,
    errorMessage,
    setUserId,
    setUserState,
    addMessage,
    setCurrentSchema,
    setLoading,
    setError,
  } = useAppStore();
  const [learningDepth, setLearningDepth] = useState<LearningDepth>(DEFAULT_LEARNING_DEPTH);
  const [componentCompleted, setComponentCompleted] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        const stored = readUserId();
        const response = await fetch(`/api/state${stored ? `?userId=${stored}` : ""}`);
        if (!response.ok) throw new Error("状态初始化失败");
        const state = (await response.json()) as UserState;
        writeUserId(state.user_id);
        setUserState(state);
      } catch {
        setError("状态初始化失败，请刷新页面重试。");
      }
    }

    void boot();
  }, [setError, setUserState]);

  async function submit(value: string, depth: LearningDepth = learningDepth) {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
      created_at: new Date().toISOString(),
    };

    addMessage(userMessage);
    setLoading(true);
    setError(null);
    setComponentCompleted(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, userId, depth }),
      });
      if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
      const data = await response.json();

      if (data.userId) {
        writeUserId(data.userId);
        setUserId(data.userId);
      }

      if (data.userState) {
        setUserState(data.userState);
      }

      const assistantMessage: Message = {
        id: data.id || crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        schema: data.schema,
        sources: data.sources || [],
        created_at: data.created_at || new Date().toISOString(),
      };

      addMessage(assistantMessage);
      setCurrentSchema(data.schema);
    } catch {
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "这次生成失败了。可以稍后重试，或换一个更短的问题。",
        created_at: new Date().toISOString(),
      };
      addMessage(fallbackMessage);
      setError("聊天请求失败，没有更新当前互动组件。");
    } finally {
      setLoading(false);
    }
  }

  async function requestDepth(depth: LearningDepth) {
    setLearningDepth(depth);
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content;
    const concept = lastUserMessage || currentRenderableSchema?.config.title || "当前概念";
    await submit(`${concept}\n请用「${LEARNING_DEPTH_LABELS[depth]}」深度重新生成互动组件。`, depth);
  }

  async function recordComponentEvent(event: InteractionEvent, completed = false) {
    if (event.type === "depth_switch_requested") {
      const requestedDepth = event.payload?.depth;
      if (requestedDepth === "rapid" || requestedDepth === "scenario" || requestedDepth === "mapping") {
        await requestDepth(requestedDepth);
      }
      return;
    }

    if (completed) setComponentCompleted(true);
    if (!userId || !currentSchema) return;

    const normalizedSchema = normalizeUISchema(currentSchema);

    try {
      const response = await fetch("/api/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          schemaType: normalizedSchema.type,
          eventType: event.type,
          payload: event.payload || {},
        }),
      });
      if (!response.ok) throw new Error("Interaction request failed");
      const data = await response.json();
      if (data.userState) {
        setUserState(data.userState);
      }
    } catch {
      setError("交互反馈暂时没有写入状态记忆。");
    }
  }

  async function followNextConcept(label: string, relation: string) {
    await submit(`${label}是什么？它和刚才的关系是：${relation}`, learningDepth);
  }

  const currentRenderableSchema = currentSchema ? normalizeUISchema(currentSchema) : null;
  const activeDepth = currentRenderableSchema?.depth || learningDepth;
  const nextLearningDepth = componentCompleted ? nextDepth(activeDepth) : null;
  const nextConcepts = currentRenderableSchema?.next_concepts.slice(0, 2) || [];

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand-mark" aria-label="趣灵首页">
          <span className="brand-mark__icon">
            <BrainCircuit size={20} />
          </span>
          <span className="brand-mark__text">趣灵</span>
        </Link>
        <nav className="topbar-actions" aria-label="主导航">
          <Link href="/sandbox" className="tool-button" title="知识沙盒">
            <Map size={16} />
            沙盒
          </Link>
          <Link href="/onboarding" className="tool-button" title="偏好设置">
            <Settings2 size={16} />
            设置
          </Link>
        </nav>
      </header>

      <section className="component-stage" aria-live="polite">
        <div className="component-stage__inner">
          {currentSchema ? (
            renderBySchema(currentSchema, {
              onInteraction: (event) => void recordComponentEvent(event),
              onComplete: (event) => void recordComponentEvent(event, true),
            })
          ) : (
            <div className="empty-stage">
              <BrainCircuit size={34} />
              <h1>输入一个概念开始探索</h1>
              <p>趣灵会把它变成一个能操作、能反馈的小组件。</p>
            </div>
          )}
          {isLoading && (
            <div className="stage-loading" role="status">
              正在生成互动组件...
            </div>
          )}
        </div>
      </section>

      <footer className="input-bar">
        {(nextConcepts.length > 0 || nextLearningDepth) && (
          <div className="learning-guides">
            {nextLearningDepth && (
              <button
                type="button"
                className="learning-guide"
                disabled={isLoading}
                onClick={() => void requestDepth(nextLearningDepth)}
              >
                {depthGuideCopy(nextLearningDepth)}
              </button>
            )}
            {nextConcepts.map((concept) => (
              <button
                key={`${concept.label}-${concept.relation}`}
                type="button"
                className="learning-guide"
                disabled={isLoading}
                onClick={() => void followNextConcept(concept.label, concept.relation)}
              >
                下一步：{concept.label}
              </button>
            ))}
          </div>
        )}
        {errorMessage && <div className="input-error">{errorMessage}</div>}
        <ChatInput onSubmit={(value) => submit(value, learningDepth)} disabled={isLoading} />
      </footer>
    </main>
  );
}
