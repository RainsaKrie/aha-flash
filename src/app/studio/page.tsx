"use client";

import { BrainCircuit, Map, Save, Settings2, ThumbsDown, ThumbsUp, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { renderBySchema } from "@/components/generative-ui/registry";
import { SpiritHint } from "@/components/spirit-hint";
import { readUserId, writeUserId } from "@/lib/utils/storage";
import { useAppStore } from "@/stores/app-store";
import type { Message } from "@/types/chat";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS, normalizeUISchema } from "@/types/schema";
import type { InteractionEvent, LearningDepth, UISchema } from "@/types/schema";
import type { UserState } from "@/types/state";

function nextDepth(depth: LearningDepth): LearningDepth | null {
  if (depth === "rapid") return "scenario";
  if (depth === "scenario") return "mapping";
  return null;
}

function depthGuideCopy(depth: LearningDepth) {
  if (depth === "scenario") return "试一下：代入真实场景";
  return "拆开看：看看原理映射";
}

function patternVictoryCopy(pattern: string) {
  const copy: Record<string, string> = {
    probability: "你已经摸到“付出一点成本，保留未来选择”的关键动作。",
    parameter_explore: "你已经看见变量怎么推着结果变化了。",
    concept_memory: "你已经把术语和含义连上了一次。",
    process_timeline: "你已经顺着阶段看完了这条变化线。",
    comparison: "你已经抓住两者最关键的差别。",
    knowledge_check: "你已经完成了一次理解校验。",
    system_builder: "你已经把模块之间的依赖关系拼出来了。",
    narrative_branch: "你已经做了一次选择，并看到了后果。",
    classification_sort: "你已经把边界放回了正确的分类里。",
    simulation_play: "你已经跑完了一次机制推演。",
  };
  return copy[pattern] || "你已经完成了一次互动理解。";
}

type ChatStreamEvent =
  | { type: "stage"; label: string }
  | { type: "final"; payload: Record<string, unknown> }
  | { type: "error"; message?: string };

async function readChatStream(
  response: Response,
  onStage: (label: string) => void,
): Promise<Record<string, unknown>> {
  if (!response.body) return (await response.json()) as Record<string, unknown>;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: Record<string, unknown> | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ChatStreamEvent;
      if (event.type === "stage") onStage(event.label);
      if (event.type === "final") finalPayload = event.payload;
      if (event.type === "error") throw new Error(event.message || "Chat stream failed");
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer) as ChatStreamEvent;
    if (event.type === "stage") onStage(event.label);
    if (event.type === "final") finalPayload = event.payload;
    if (event.type === "error") throw new Error(event.message || "Chat stream failed");
  }

  if (!finalPayload) throw new Error("Chat stream ended without final payload");
  return finalPayload;
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
  const [componentFeedback, setComponentFeedback] = useState<"helpful" | "off" | null>(null);
  const [loadingStage, setLoadingStage] = useState("正在生成互动组件...");
  const [lastSubmitted, setLastSubmitted] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [inputDraft, setInputDraft] = useState("期权是什么？用我能听懂的方式讲。");
  const [studioStatus, setStudioStatus] = useState<string | null>(null);

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
    const recentMessages = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 500),
        created_at: message.created_at,
      }));
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
    setComponentFeedback(null);
    setLoadingStage("读取你的学习状态");
    setLastSubmitted(value);
    setValidationError(null);
    setStudioStatus(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, userId, depth, recent_messages: recentMessages, stream: true }),
      });
      if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
      const data = await readChatStream(response, setLoadingStage);

      if (data.userId) {
        writeUserId(String(data.userId));
        setUserId(String(data.userId));
      }

      if (data.userState) {
        setUserState(data.userState as UserState);
      }
      setValidationError(typeof data.validation_error === "string" ? data.validation_error : null);
      const schema = data.schema as UISchema;

      const assistantMessage: Message = {
        id: typeof data.id === "string" ? data.id : crypto.randomUUID(),
        role: "assistant",
        content: typeof data.content === "string" ? data.content : "已生成互动组件。",
        schema,
        created_at: typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
      };

      addMessage(assistantMessage);
      setCurrentSchema(schema);
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
      setLoadingStage("正在生成互动组件...");
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

  function saveDraft() {
    if (!currentSchema) return;
    setStudioStatus("草稿已保存到本地工作台（mock）。");
  }

  function publishToExplore() {
    if (!currentSchema) return;
    setStudioStatus("已发布到探索页候选池（mock），真实发布流后续接入。");
  }

  async function recordComponentFeedback(rating: "helpful" | "off") {
    setComponentFeedback(rating);
    if (!userId || !currentSchema) return;

    const normalizedSchema = normalizeUISchema(currentSchema);

    try {
      const response = await fetch("/api/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          schemaType: normalizedSchema.type,
          eventType: "component_feedback",
          payload: {
            rating,
            pattern: normalizedSchema.pattern,
            template: normalizedSchema.template,
            depth: normalizedSchema.depth,
          },
        }),
      });
      if (!response.ok) throw new Error("Feedback request failed");
      const data = await response.json();
      if (data.userState) {
        setUserState(data.userState);
      }
    } catch {
      setError("反馈暂时没有写入状态记忆。");
    }
  }

  async function followNextConcept(label: string, relation: string) {
    await submit(`${label}是什么？它和刚才的关系是：${relation}`, learningDepth);
  }

  const currentRenderableSchema = currentSchema ? normalizeUISchema(currentSchema) : null;
  const activeDepth = currentRenderableSchema?.depth || learningDepth;
  const nextLearningDepth = componentCompleted ? nextDepth(activeDepth) : null;
  const nextConcepts = currentRenderableSchema?.next_concepts.slice(0, 2) || [];
  const starterPrompts = ["贝叶斯定理", "股票和期权区别", "复利为什么厉害"];

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/explore" className="brand-mark" aria-label="趣灵首页">
          <span className="brand-mark__icon">
            <BrainCircuit size={20} />
          </span>
          <span className="brand-mark__text">趣灵</span>
        </Link>
        <nav className="topbar-actions" aria-label="主导航">
          <Link href="/hub" className="tool-button" title="个人图鉴">
            <Map size={16} />
            图鉴
          </Link>
          <Link href="/onboarding" className="tool-button" title="偏好设置">
            <Settings2 size={16} />
            设置
          </Link>
        </nav>
      </header>

      <section className="component-stage" aria-live="polite">
        <div className="component-stage__inner">
          {(lastSubmitted || currentRenderableSchema || errorMessage) && (
            <div className="component-stage__context">
              {lastSubmitted && (
                <div className="current-prompt" aria-label="当前问题">
                  <span>当前问题</span>
                  <strong>{lastSubmitted}</strong>
                </div>
              )}
              {currentRenderableSchema && !errorMessage && (
                <SpiritHint compact>
                  这次我把它做成了一个小关卡：先动手，再看反馈。
                </SpiritHint>
              )}
              {errorMessage && (
                <SpiritHint tone="error" compact>
                  这次生成链路不太顺，我会保留当前组件，你也可以换个更短的问题再试。
                </SpiritHint>
              )}
            </div>
          )}
          {currentSchema ? (
            renderBySchema(currentSchema, {
              onInteraction: (event) => void recordComponentEvent(event),
              onComplete: (event) => void recordComponentEvent(event, true),
            })
          ) : (
            <div className="empty-stage">
              <span className="empty-stage__icon">
                <BrainCircuit size={34} />
              </span>
              <h1>输入一个概念开始探索</h1>
              <SpiritHint>
                把一个概念丢给我，我会把它变成能操作、能反馈的小组件。
              </SpiritHint>
              <div className="empty-stage__prompts" aria-label="可填入的引导关键词">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      setInputDraft(prompt);
                    }}
                    onClick={() => setInputDraft(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isLoading && (
            <div className="stage-loading" role="status">
              <div className="stage-loading__card">
                <BrainCircuit size={22} />
                <span>{loadingStage}</span>
              </div>
              <SpiritHint tone="loading" compact>
                我正在找这个概念里最适合动手理解的结构。
              </SpiritHint>
            </div>
          )}
          {currentSchema && !isLoading && (
            <div className="component-followups">
              {componentCompleted && currentRenderableSchema && (
                <div className="learning-reward" role="status">
                  <SpiritHint tone="success" compact title="小胜利">
                    {patternVictoryCopy(currentRenderableSchema.pattern)} 理解进度 +1
                  </SpiritHint>
                </div>
              )}
              <div className="component-followups__actions">
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
                <div className="studio-actions" aria-label="Studio mock actions">
                  <button type="button" className="studio-action" title="保存草稿" onClick={saveDraft}>
                    <Save size={15} /> 保存草稿
                  </button>
                  <button type="button" className="studio-action" title="发布到探索页" onClick={publishToExplore}>
                    <UploadCloud size={15} /> 发布到探索页
                  </button>
                </div>
                <div className="component-feedback" aria-label="互动组件反馈">
                  <button
                    type="button"
                    className="component-feedback__button"
                    aria-pressed={componentFeedback === "helpful"}
                    title="这个组件有帮助"
                    onClick={() => void recordComponentFeedback("helpful")}
                  >
                    <ThumbsUp size={15} />
                    有帮助
                  </button>
                  <button
                    type="button"
                    className="component-feedback__button"
                    aria-pressed={componentFeedback === "off"}
                    title="这个组件不够准确"
                    onClick={() => void recordComponentFeedback("off")}
                  >
                    <ThumbsDown size={15} />
                    不准确
                  </button>
                </div>
              </div>
              {studioStatus && <p className="studio-status" role="status">{studioStatus}</p>}
            </div>
          )}
        </div>
      </section>

      <footer className="input-bar">
        {errorMessage && (
          <div className="input-error" role="alert">
            {errorMessage}
          </div>
        )}
        {process.env.NODE_ENV !== "production" && validationError && (
          <div className="dev-validation-error">
            <strong>Schema fallback</strong>
            <span>{validationError}</span>
          </div>
        )}
        <ChatInput
          value={inputDraft}
          onValueChange={setInputDraft}
          onSubmit={(value) => submit(value, learningDepth)}
          disabled={isLoading}
        />
      </footer>
    </main>
  );
}


