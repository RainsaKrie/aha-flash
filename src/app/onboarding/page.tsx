"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PreferenceForm, type PreferenceValues } from "@/components/onboarding/preference-form";
import { StyleQuiz } from "@/components/onboarding/style-quiz";
import { Card } from "@/components/ui/card";
import { readUserId, writeUserId } from "@/lib/utils/storage";
import type { UserState } from "@/types/state";

export default function OnboardingPage() {
  const [state, setState] = useState<UserState | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(["游戏机制"]);

  useEffect(() => {
    async function boot() {
      const stored = readUserId();
      const response = await fetch(`/api/state${stored ? `?userId=${stored}` : ""}`);
      const nextState = (await response.json()) as UserState;
      writeUserId(nextState.user_id);
      setState(nextState);
      setSelectedStyles(nextState.profile.metaphor_preferences);
    }

    void boot();
  }, []);

  function toggleStyle(value: string) {
    setSelectedStyles((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function save(values: PreferenceValues) {
    if (!state) return;
    setSaving(true);

    try {
      const response = await fetch("/api/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: state.user_id,
          profile: {
            ...state.profile,
            ...values,
            metaphor_preferences: selectedStyles.length ? selectedStyles : values.metaphor_preferences,
          },
        }),
      });
      const updated = (await response.json()) as UserState;
      setState(updated);
      writeUserId(updated.user_id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-3xl content-center gap-5 p-6">
      <Link href="/" className="tool-button w-fit px-3">
        <ArrowLeft size={16} />
        返回
      </Link>
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">user state</p>
        <h1 className="mt-1 text-3xl font-semibold">偏好设置</h1>
      </header>
      <Card className="grid gap-6 p-5">
        <StyleQuiz selected={selectedStyles} onSelect={toggleStyle} />
        <PreferenceForm state={state} onSave={save} saving={saving} />
      </Card>
    </main>
  );
}
