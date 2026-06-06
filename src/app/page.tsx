"use client";

import { BrainCircuit, FileJson2, History, Map, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatHistory } from "@/components/chat/chat-history";
import { ChatInput } from "@/components/chat/chat-input";
import { Card } from "@/components/ui/card";
import { renderBySchema } from "@/components/generative-ui/registry";
import { readUserId, writeUserId } from "@/lib/utils/storage";
import { useAppStore } from "@/stores/app-store";
import type { Message } from "@/types/chat";
import { DEFAULT_LEARNING_DEPTH, LEARNING_DEPTH_LABELS, normalizeUISchema } from "@/types/schema";
import type { InteractionEvent, LearningDepth } from "@/types/schema";
import type { UserState } from "@/types/state";

export default function HomePage() {
  const {
    userId,
    userState,
    messages,
    currentSchema,
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

  async function recordComponentEvent(event: InteractionEvent) {
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

  const profile = userState?.profile;
  const summary = userState?.conversation_compressed;
  const knowledgeAssets = userState?.knowledge_assets || [];
  const metaphor = profile?.metaphor_preferences[0] || "抽卡机制";
  const currentRenderableSchema = currentSchema ? normalizeUISchema(currentSchema) : null;
  const nextConcepts = currentRenderableSchema?.next_concepts.slice(0, 2) || [];

  return (
    <main className="app-shell">
      <aside className="sidebar grid content-between gap-6">
        <div className="grid gap-6">
          <header className="grid gap-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[8px] border border-[var(--line)] bg-[rgba(53,230,155,0.12)]">
                <BrainCircuit size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">趣灵</h1>
                <p className="text-sm text-[var(--muted)]">互动式知识学习引擎</p>
              </div>
            </div>
          </header>

          <Card className="grid gap-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileJson2 size={16} />
                当前状态
              </div>
              <div className="flex gap-2">
                <Link href="/sandbox" className="tool-button icon-button" title="知识沙盒">
                  <Map size={16} />
                </Link>
                <Link href="/onboarding" className="tool-button icon-button" title="偏好设置">
                  <Settings2 size={16} />
                </Link>
              </div>
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">用户</dt>
                <dd className="truncate">{userId || "初始化中"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">背景</dt>
                <dd>{profile?.background || "未知"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">爱好</dt>
                <dd className="max-w-40 truncate">{profile?.hobbies.join("，") || "未设置"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">隐喻域</dt>
                <dd>{metaphor}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">输出</dt>
                <dd>
                  {currentRenderableSchema
                    ? `${currentRenderableSchema.pattern}/${currentRenderableSchema.template}`
                    : "待生成"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">深度</dt>
                <dd>{LEARNING_DEPTH_LABELS[currentRenderableSchema?.depth || learningDepth]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">交互</dt>
                <dd>{summary?.total_interactions ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">已学</dt>
                <dd>{knowledgeAssets.length}</dd>
              </div>
            </dl>
          </Card>

          <Card className="grid gap-4 p-4">
            <div className="text-sm font-medium">状态摘要</div>
            <div className="grid gap-3 text-sm">
              <div>
                <div className="mb-2 text-xs text-[var(--muted)]">最近主题</div>
                <div className="flex flex-wrap gap-2">
                  {summary?.recent_topics.length ? (
                    summary.recent_topics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-[8px] border border-[var(--line)] bg-[#07120f] px-2 py-1 text-xs"
                      >
                        {topic}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--muted)]">暂无</span>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-[var(--muted)]">关键洞察</div>
                <ul className="grid gap-2 text-xs leading-5 text-[var(--muted)]">
                  {summary?.key_insights.length ? (
                    summary.key_insights.slice(0, 3).map((insight) => <li key={insight}>{insight}</li>)
                  ) : (
                    <li>暂无</li>
                  )}
                </ul>
              </div>
              {summary?.last_session_summary && (
                <p className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-3 text-xs leading-5 text-[var(--muted)]">
                  {summary.last_session_summary}
                </p>
              )}
              <div>
                <div className="mb-2 text-xs text-[var(--muted)]">已学概念</div>
                <div className="flex flex-wrap gap-2">
                  {knowledgeAssets.length ? (
                    knowledgeAssets.slice(0, 5).map((asset) => (
                      <span
                        key={`${asset.concept}-${asset.learned_at}`}
                        className="rounded-[8px] border border-[var(--line)] bg-[#07120f] px-2 py-1 text-xs"
                        title={`${asset.pattern}/${asset.template}`}
                      >
                        {asset.concept}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--muted)]">暂无</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="grid gap-4 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History size={16} />
              对话
            </div>
            <ChatHistory messages={messages} isLoading={isLoading} errorMessage={errorMessage} />
          </Card>
        </div>

        <Card className="p-4">
          <ChatInput
            onSubmit={submit}
            depth={learningDepth}
            onDepthChange={setLearningDepth}
            disabled={isLoading}
          />
        </Card>
      </aside>

      <section className="workbench">
        <div className="schema-stage">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">generative ui</p>
              <h2 className="mt-1 text-xl font-semibold">互动组件工作台</h2>
            </div>
            <Link className="tool-button icon-button" href="/onboarding" title="偏好设置">
              <Settings2 size={18} />
            </Link>
          </header>

          <Card className="widget-surface">
            {currentSchema ? (
              <div className="grid h-full gap-4">
                {renderBySchema(currentSchema, {
                  onInteraction: (event) => void recordComponentEvent(event),
                  onComplete: (event) => void recordComponentEvent(event),
                })}
                {nextConcepts.length > 0 && (
                  <div className="grid gap-3 border-t border-[var(--line)] pt-4">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                      下一步
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {nextConcepts.map((concept) => (
                        <button
                          key={`${concept.label}-${concept.relation}`}
                          type="button"
                          className="rounded-[8px] border border-[var(--line)] bg-[#07120f] p-3 text-left transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isLoading}
                          onClick={() => void followNextConcept(concept.label, concept.relation)}
                        >
                          <span className="block text-sm font-semibold text-[var(--text)]">{concept.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{concept.relation}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-full min-h-[560px] place-items-center p-6 text-center">
                <div className="max-w-md">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[8px] border border-[var(--line)] bg-[#07120f]">
                    <BrainCircuit size={30} />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold">等待第一个概念</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    输入框里已经放了一个期权示例，生成后这里会出现可玩的解释组件。
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>
    </main>
  );
}
