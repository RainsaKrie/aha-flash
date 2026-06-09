"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserState } from "@/types/state";

export interface PreferenceValues {
  background: string;
  hobbies: string[];
  knowledge_blindspots: string[];
  metaphor_preferences: string[];
  complexity_tolerance: 1 | 2 | 3 | 4 | 5;
}

function splitList(value: string) {
  return value
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PreferenceForm({
  state,
  onSave,
  saving,
}: {
  state: UserState | null;
  onSave?: (values: PreferenceValues) => void;
  saving?: boolean;
}) {
  const profile = state?.profile;
  const [background, setBackground] = useState(profile?.background || "文科生");
  const [hobbies, setHobbies] = useState(profile?.hobbies.join("，") || "原神，F1赛车");
  const [blindspots, setBlindspots] = useState(profile?.knowledge_blindspots.join("，") || "金融，编程");
  const [metaphors, setMetaphors] = useState(profile?.metaphor_preferences.join("，") || "游戏机制，体育竞技");
  const [complexity, setComplexity] = useState<1 | 2 | 3 | 4 | 5>(profile?.complexity_tolerance || 3);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.({
          background,
          hobbies: splitList(hobbies),
          knowledge_blindspots: splitList(blindspots),
          metaphor_preferences: splitList(metaphors),
          complexity_tolerance: complexity,
        });
      }}
    >
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--muted)]">背景</span>
        <Input value={background} onChange={(event) => setBackground(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--muted)]">爱好</span>
        <Input value={hobbies} onChange={(event) => setHobbies(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--muted)]">知识盲区</span>
        <Input value={blindspots} onChange={(event) => setBlindspots(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--muted)]">隐喻偏好</span>
        <Input value={metaphors} onChange={(event) => setMetaphors(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-[var(--muted)]">复杂度容忍度</span>
        <input
          aria-label="复杂度容忍度"
          type="range"
          min={1}
          max={5}
          value={complexity}
          onChange={(event) => setComplexity(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}
          className="w-full accent-[var(--accent)]"
        />
        <strong className="text-[var(--accent-2)]">{complexity}</strong>
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? "保存中" : "保存偏好"}
      </Button>
    </form>
  );
}
