import fs from "node:fs/promises";
import path from "node:path";
import { getPublicBetaConfig, type PublicBetaConfig } from "./config.ts";

export interface IncrementLimitResult {
  allowed: boolean;
  value: number;
}

export interface PublicBetaStore {
  readonly kind: "local" | "upstash";
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  setIfAbsent<T>(key: string, value: T, ttlSeconds: number): Promise<boolean>;
  increment(key: string, amount: number, ttlSeconds?: number): Promise<number>;
  incrementIfBelow(
    key: string,
    amount: number,
    limit: number,
    ttlSeconds: number,
  ): Promise<IncrementLimitResult>;
  push<T>(key: string, value: T, maxItems: number, ttlSeconds?: number): Promise<void>;
  list<T>(key: string, limit: number): Promise<T[]>;
  keys(prefix: string): Promise<string[]>;
  clearPrefix(prefix: string): Promise<number>;
}

interface LocalValue {
  value: string;
  expiresAt?: number;
}

interface LocalList {
  values: string[];
  expiresAt?: number;
}

interface LocalData {
  values: Record<string, LocalValue>;
  lists: Record<string, LocalList>;
}

function expiresAt(ttlSeconds?: number) {
  return ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
}

function parseStored<T>(value: string | undefined): T | null {
  if (value === undefined) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export class LocalFilePublicBetaStore implements PublicBetaStore {
  readonly kind = "local" as const;
  private queue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async load(): Promise<LocalData> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalData>;
      return {
        values: parsed.values || {},
        lists: parsed.lists || {},
      };
    } catch {
      return { values: {}, lists: {} };
    }
  }

  private cleanup(data: LocalData) {
    const now = Date.now();
    for (const [key, item] of Object.entries(data.values)) {
      if (item.expiresAt && item.expiresAt <= now) delete data.values[key];
    }
    for (const [key, item] of Object.entries(data.lists)) {
      if (item.expiresAt && item.expiresAt <= now) delete data.lists[key];
    }
  }

  private async save(data: LocalData) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = this.filePath + ".tmp";
    await fs.writeFile(temporary, JSON.stringify(data), "utf8");
    await fs.rename(temporary, this.filePath);
  }

  private async mutate<T>(operation: (data: LocalData) => Promise<T> | T): Promise<T> {
    let resolveResult!: (value: T) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    this.queue = this.queue
      .catch(() => undefined)
      .then(async () => {
        try {
          const data = await this.load();
          this.cleanup(data);
          const value = await operation(data);
          await this.save(data);
          resolveResult(value);
        } catch (error) {
          rejectResult(error);
        }
      });

    return result;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.load();
    this.cleanup(data);
    return parseStored<T>(data.values[key]?.value);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number) {
    await this.mutate((data) => {
      data.values[key] = {
        value: JSON.stringify(value),
        expiresAt: expiresAt(ttlSeconds),
      };
    });
  }

  async delete(key: string) {
    await this.mutate((data) => {
      delete data.values[key];
      delete data.lists[key];
    });
  }

  async setIfAbsent<T>(key: string, value: T, ttlSeconds: number) {
    return this.mutate((data) => {
      if (data.values[key]) return false;
      data.values[key] = {
        value: JSON.stringify(value),
        expiresAt: expiresAt(ttlSeconds),
      };
      return true;
    });
  }

  async increment(key: string, amount: number, ttlSeconds?: number) {
    return this.mutate((data) => {
      const current = Number(parseStored<number>(data.values[key]?.value) || 0);
      const value = current + amount;
      data.values[key] = {
        value: JSON.stringify(value),
        expiresAt: data.values[key]?.expiresAt || expiresAt(ttlSeconds),
      };
      return value;
    });
  }

  async incrementIfBelow(key: string, amount: number, limit: number, ttlSeconds: number) {
    return this.mutate((data) => {
      const current = Number(parseStored<number>(data.values[key]?.value) || 0);
      if (current + amount > limit) return { allowed: false, value: current };
      const value = current + amount;
      data.values[key] = {
        value: JSON.stringify(value),
        expiresAt: data.values[key]?.expiresAt || expiresAt(ttlSeconds),
      };
      return { allowed: true, value };
    });
  }

  async push<T>(key: string, value: T, maxItems: number, ttlSeconds?: number) {
    await this.mutate((data) => {
      const current = data.lists[key]?.values || [];
      data.lists[key] = {
        values: [JSON.stringify(value), ...current].slice(0, maxItems),
        expiresAt: expiresAt(ttlSeconds) || data.lists[key]?.expiresAt,
      };
    });
  }

  async list<T>(key: string, limit: number) {
    const data = await this.load();
    this.cleanup(data);
    return (data.lists[key]?.values || [])
      .slice(0, limit)
      .map((value) => parseStored<T>(value))
      .filter((value): value is T => value !== null);
  }

  async keys(prefix: string) {
    const data = await this.load();
    this.cleanup(data);
    return Array.from(
      new Set([
        ...Object.keys(data.values),
        ...Object.keys(data.lists),
      ].filter((key) => key.startsWith(prefix))),
    );
  }

  async clearPrefix(prefix: string) {
    return this.mutate((data) => {
      let deleted = 0;
      for (const key of Object.keys(data.values)) {
        if (!key.startsWith(prefix)) continue;
        delete data.values[key];
        deleted += 1;
      }
      for (const key of Object.keys(data.lists)) {
        if (!key.startsWith(prefix)) continue;
        delete data.lists[key];
        deleted += 1;
      }
      return deleted;
    });
  }
}

interface UpstashResponse<T> {
  result?: T;
  error?: string;
}

export class UpstashPublicBetaStore implements PublicBetaStore {
  readonly kind = "upstash" as const;
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  private async request<T>(command: Array<string | number>): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    const payload = await response.json() as UpstashResponse<T>;
    if (!response.ok || payload.error) {
      throw new Error(payload.error || "Persistent store request failed");
    }
    return payload.result as T;
  }

  private async pipeline(commands: Array<Array<string | number>>) {
    const response = await fetch(this.url + "/pipeline", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    const payload = await response.json() as Array<UpstashResponse<unknown>>;
    if (!response.ok || payload.some((item) => item.error)) {
      throw new Error(payload.find((item) => item.error)?.error || "Persistent store pipeline failed");
    }
  }

  async get<T>(key: string) {
    const value = await this.request<string | null>(["GET", key]);
    return value === null ? null : parseStored<T>(value);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number) {
    const command: Array<string | number> = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) command.push("EX", ttlSeconds);
    await this.request(command);
  }

  async delete(key: string) {
    await this.request(["DEL", key]);
  }

  async setIfAbsent<T>(key: string, value: T, ttlSeconds: number) {
    const result = await this.request<string | null>([
      "SET",
      key,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
      "NX",
    ]);
    return result === "OK";
  }

  async increment(key: string, amount: number, ttlSeconds?: number) {
    const script = [
      "local value = redis.call('INCRBY', KEYS[1], ARGV[1])",
      "if tonumber(ARGV[2]) > 0 and redis.call('TTL', KEYS[1]) < 0 then",
      "redis.call('EXPIRE', KEYS[1], ARGV[2]) end",
      "return value",
    ].join(" ");
    return Number(await this.request<number>([
      "EVAL",
      script,
      "1",
      key,
      amount,
      ttlSeconds || 0,
    ]));
  }

  async incrementIfBelow(key: string, amount: number, limit: number, ttlSeconds: number) {
    const script = [
      "local current = tonumber(redis.call('GET', KEYS[1]) or '0')",
      "local amount = tonumber(ARGV[1])",
      "local limit = tonumber(ARGV[2])",
      "if current + amount > limit then return {0, current} end",
      "local value = redis.call('INCRBY', KEYS[1], amount)",
      "if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end",
      "return {1, value}",
    ].join(" ");
    const result = await this.request<[number, number]>([
      "EVAL",
      script,
      "1",
      key,
      amount,
      limit,
      ttlSeconds,
    ]);
    return { allowed: Number(result[0]) === 1, value: Number(result[1]) };
  }

  async push<T>(key: string, value: T, maxItems: number, ttlSeconds?: number) {
    const commands: Array<Array<string | number>> = [
      ["LPUSH", key, JSON.stringify(value)],
      ["LTRIM", key, 0, Math.max(0, maxItems - 1)],
    ];
    if (ttlSeconds) commands.push(["EXPIRE", key, ttlSeconds]);
    await this.pipeline(commands);
  }

  async list<T>(key: string, limit: number) {
    const values = await this.request<string[]>(["LRANGE", key, 0, Math.max(0, limit - 1)]);
    return values
      .map((value) => parseStored<T>(value))
      .filter((value): value is T => value !== null);
  }

  async keys(prefix: string) {
    const found: string[] = [];
    let cursor = "0";
    do {
      const result = await this.request<[string, string[]]>([
        "SCAN",
        cursor,
        "MATCH",
        prefix + "*",
        "COUNT",
        500,
      ]);
      cursor = String(result[0]);
      found.push(...result[1]);
    } while (cursor !== "0" && found.length < 5000);
    return found;
  }

  async clearPrefix(prefix: string) {
    const keys = await this.keys(prefix);
    if (keys.length === 0) return 0;
    await this.request(["DEL", ...keys]);
    return keys.length;
  }
}

const storeCache = new Map<string, PublicBetaStore>();

export function getPublicBetaStore(config: PublicBetaConfig = getPublicBetaConfig()) {
  if (!config.storageAvailable) return null;
  const cacheKey = [
    config.storageDriver,
    config.localFile,
    config.upstashUrl || "",
    config.namespace,
  ].join("|");
  const cached = storeCache.get(cacheKey);
  if (cached) return cached;

  const store = config.storageDriver === "upstash"
    ? new UpstashPublicBetaStore(config.upstashUrl || "", config.upstashToken || "")
    : new LocalFilePublicBetaStore(path.resolve(config.localFile));
  storeCache.set(cacheKey, store);
  return store;
}

export function resetPublicBetaStoreCacheForTests() {
  storeCache.clear();
}
