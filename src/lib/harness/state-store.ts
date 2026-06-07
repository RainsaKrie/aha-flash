import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";
import type { CurrentThread, KnowledgeAsset, ThreadSummary, UserProfile, UserState } from "@/types/state";

function resolveStatesDir() {
  if (process.env.AHA_FLASH_STATE_DIR) return process.env.AHA_FLASH_STATE_DIR;
  if (process.env.VERCEL) return path.join(os.tmpdir(), "aha-flash", "states");
  return path.join(process.cwd(), "data", "states");
}

const STATES_DIR = resolveStatesDir();
const MAX_STATE_BYTES = 5120;
const MAX_KNOWLEDGE_ASSETS = 10;
const MAX_THREAD_SUMMARIES = 6;

function mergeUnique(current: string[] = [], next: string[] = []) {
  return [...new Set([...current, ...next].map((item) => item.trim()).filter(Boolean))].slice(0, 12);
}

function normalizeConcept(value: string) {
  return value.trim().toLowerCase();
}

function compactInput(value: string, max = 120) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? compact.slice(0, max) : compact;
}

function sameConcept(left?: string, right?: string) {
  return Boolean(left && right && normalizeConcept(left) === normalizeConcept(right));
}

function archiveThread(
  thread: CurrentThread,
  current: UserState,
  now: string,
): ThreadSummary | null {
  if (thread.depth <= 1) return null;

  return {
    thread_id: `${normalizeConcept(thread.concept)}-${thread.started_at}`,
    concept: thread.concept,
    total_rounds: thread.depth,
    max_depth: thread.depth,
    final_understanding:
      current.conversation_compressed.last_session_summary ||
      `围绕「${thread.concept}」完成了 ${thread.depth} 轮连续追问。`,
    insight:
      current.conversation_compressed.key_insights[0] ||
      `用户连续追问「${thread.concept}」，需要保持同一隐喻体系。`,
    archived_at: now,
  };
}

export interface StateReflectionPatch {
  profile_patch?: Partial<UserProfile>;
  understanding_level?: "shallow" | "moderate" | "deep";
  summary: string;
}

export class StateStore {
  async get(userId?: string | null): Promise<UserState | null> {
    if (!userId) return null;

    try {
      const raw = await fs.readFile(path.join(STATES_DIR, `${userId}.json`), "utf-8");
      const state = JSON.parse(raw) as UserState;
      return {
        ...state,
        conversation_compressed: {
          ...state.conversation_compressed,
          thread_summaries: state.conversation_compressed.thread_summaries || [],
        },
        knowledge_assets: state.knowledge_assets || [],
      };
    } catch {
      return null;
    }
  }

  async create(userId = nanoid(12)): Promise<UserState> {
    const state: UserState = {
      user_id: userId,
      profile: {
        background: "未知",
        hobbies: ["原神"],
        knowledge_blindspots: ["金融"],
        metaphor_preferences: ["游戏机制"],
        learning_style: "interactive",
        complexity_tolerance: 3,
      },
      conversation_compressed: {
        recent_topics: [],
        key_insights: [],
        last_session_summary: "",
        total_interactions: 0,
        thread_summaries: [],
      },
      knowledge_assets: [],
      ui_preferences: {
        theme: "cyberpunk_dark",
        interaction_density: "medium",
        animation_speed: "normal",
      },
      updated_at: new Date().toISOString(),
    };

    await this.save(state);
    return state;
  }

  async save(state: UserState): Promise<void> {
    const json = JSON.stringify(state, null, 2);
    if (Buffer.byteLength(json, "utf-8") > MAX_STATE_BYTES) {
      throw new Error(`State file exceeds 5KB limit for ${state.user_id}`);
    }

    await fs.mkdir(STATES_DIR, { recursive: true });
    await fs.writeFile(path.join(STATES_DIR, `${state.user_id}.json`), json, "utf-8");
  }

  async update(userId: string, patch: Partial<UserState>): Promise<UserState> {
    const current = await this.get(userId);
    if (!current) throw new Error(`User ${userId} not found`);

    const updated = {
      ...current,
      ...patch,
      profile: { ...current.profile, ...patch.profile },
      conversation_compressed: {
        ...current.conversation_compressed,
        ...patch.conversation_compressed,
      },
      knowledge_assets: patch.knowledge_assets || current.knowledge_assets || [],
      ui_preferences: { ...current.ui_preferences, ...patch.ui_preferences },
      updated_at: new Date().toISOString(),
    };

    await this.save(updated);
    return updated;
  }

  async recordInteraction(userId: string, topic: string, insight: string) {
    const current = (await this.get(userId)) ?? (await this.create(userId));
    const recent_topics = [topic, ...current.conversation_compressed.recent_topics]
      .filter(Boolean)
      .slice(0, 5);
    const key_insights = [insight, ...current.conversation_compressed.key_insights]
      .filter(Boolean)
      .slice(0, 5);

    return this.update(userId, {
      conversation_compressed: {
        ...current.conversation_compressed,
        recent_topics,
        key_insights,
        last_session_summary: `最近围绕「${topic}」生成过互动解释。`,
        total_interactions: current.conversation_compressed.total_interactions + 1,
      },
    });
  }

  async addKnowledgeAsset(userId: string, asset: Omit<KnowledgeAsset, "learned_at">): Promise<UserState> {
    const current = (await this.get(userId)) ?? (await this.create(userId));
    const normalizedConcept = normalizeConcept(asset.concept);
    const nextAsset: KnowledgeAsset = {
      ...asset,
      concept: asset.concept.trim().slice(0, 40),
      topic_area: asset.topic_area?.trim().slice(0, 24) || undefined,
      learned_at: new Date().toISOString(),
    };
    const knowledge_assets = [
      nextAsset,
      ...(current.knowledge_assets || []).filter(
        (item) => normalizeConcept(item.concept) !== normalizedConcept,
      ),
    ].slice(0, MAX_KNOWLEDGE_ASSETS);

    return this.update(userId, { knowledge_assets });
  }

  async mergeProfilePatch(userId: string, patch: Partial<UserProfile>): Promise<UserState> {
    const current = (await this.get(userId)) ?? (await this.create(userId));
    const nextProfile: UserProfile = {
      ...current.profile,
      background:
        patch.background && (!current.profile.background || current.profile.background === "未知")
          ? patch.background
          : current.profile.background,
      hobbies: mergeUnique(current.profile.hobbies, patch.hobbies),
      knowledge_blindspots: mergeUnique(
        current.profile.knowledge_blindspots,
        patch.knowledge_blindspots,
      ),
      metaphor_preferences: mergeUnique(
        current.profile.metaphor_preferences,
        patch.metaphor_preferences,
      ),
      learning_style: patch.learning_style || current.profile.learning_style,
      complexity_tolerance: patch.complexity_tolerance || current.profile.complexity_tolerance,
    };

    return this.update(userId, { profile: nextProfile });
  }

  async applyTurnReflection(
    userId: string,
    topic: string,
    insight: string,
    reflection: StateReflectionPatch,
  ) {
    let current = await this.recordInteraction(userId, topic, insight);
    if (reflection.profile_patch) {
      current = await this.mergeProfilePatch(userId, reflection.profile_patch);
    }

    return this.update(userId, {
      conversation_compressed: {
        ...current.conversation_compressed,
        key_insights: mergeUnique(current.conversation_compressed.key_insights, [
          reflection.summary,
        ]).slice(0, 5),
        last_session_summary: reflection.summary.slice(0, 150),
        understanding_level:
          reflection.understanding_level || current.conversation_compressed.understanding_level,
      },
    });
  }

  async updateCurrentThread(
    userId: string,
    params: { concept: string; input: string; isFollowup: boolean },
  ): Promise<UserState> {
    const current = (await this.get(userId)) ?? (await this.create(userId));
    const now = new Date().toISOString();
    const previous = current.conversation_compressed.current_thread;
    const continuesThread =
      params.isFollowup && previous && sameConcept(previous.concept, params.concept);
    const archived = previous && !continuesThread ? archiveThread(previous, current, now) : null;
    const current_thread: CurrentThread = {
      concept: params.concept.trim().slice(0, 40) || previous?.concept || "当前概念",
      depth: continuesThread ? Math.min(previous.depth + 1, 12) : 1,
      started_at: continuesThread ? previous.started_at : now,
      last_user_input: compactInput(params.input),
    };
    const thread_summaries = [
      ...(archived ? [archived] : []),
      ...(current.conversation_compressed.thread_summaries || []),
    ].slice(0, MAX_THREAD_SUMMARIES);

    return this.update(userId, {
      conversation_compressed: {
        ...current.conversation_compressed,
        current_thread,
        thread_summaries,
      },
    });
  }
}

export const stateStore = new StateStore();
