"use client";

import { AlertTriangle, BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type SpiritHintTone = "neutral" | "idle" | "loading" | "success" | "error" | "reward";

function SpiritIcon({ tone }: { tone: SpiritHintTone }) {
  if (tone === "loading") return <Loader2 size={16} className="animate-spin" />;
  if (tone === "success" || tone === "reward") return <Sparkles size={16} />;
  if (tone === "error") return <AlertTriangle size={16} />;
  return <BrainCircuit size={16} />;
}

export function SpiritHint({
  tone = "neutral",
  title = "趣灵",
  children,
  compact = false,
}: {
  tone?: SpiritHintTone;
  title?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const liveMode = tone === "error" ? "assertive" : "polite";

  return (
    <motion.aside
      className={`spirit-hint spirit-hint--${tone} ${compact ? "spirit-hint--compact" : ""}`}
      aria-label="趣灵提示"
      aria-live={liveMode}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: tone === "reward" ? [1, 1.03, 1] : 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      <motion.span
        className="spirit-hint__icon"
        aria-hidden="true"
        animate={tone === "loading" ? { rotate: [0, 4, -4, 0] } : tone === "reward" ? { scale: [1, 1.18, 1] } : {}}
        transition={{ duration: tone === "loading" ? 1.2 : 0.42, repeat: tone === "loading" ? Infinity : 0 }}
      >
        <SpiritIcon tone={tone} />
      </motion.span>
      <span className="spirit-hint__body">
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </motion.aside>
  );
}
