"use client";

import type { ComponentType, CSSProperties } from "react";
import type {
  GenerativeUIComponentProps,
  NormalizedUISchema,
  PatternType,
  TemplateId,
  UISchema,
} from "@/types/schema";
import { normalizeUISchema } from "@/types/schema";
import { getVisualAsset } from "@/lib/content/visual-assets";
import { BuildSandbox } from "./build-sandbox";
import { CardFlip } from "./card-flip";
import { CardGridMatch } from "./card-grid-match";
import { ClassificationSort } from "./classification-sort";
import { ComparisonOverlay } from "./comparison-overlay";
import { ComparisonSplit } from "./comparison-split";
import { DualSliderExplorer } from "./dual-slider-explorer";
import { GachaSimulator } from "./gacha-simulator";
import { GachaSpinWheel } from "./gacha-spin-wheel";
import { NarrativeBranch } from "./narrative-branch";
import { QuizBattle } from "./quiz-battle";
import { QuizComboChain } from "./quiz-combo-chain";
import { SandboxFlowConnect } from "./sandbox-flow-connect";
import { SimulationPlay } from "./simulation-play";
import { SliderExplorer } from "./slider-explorer";
import { GenerativeUIErrorBoundary, StateTransition, patternStyle } from "./shared";
import { TimelineScrubber } from "./timeline-scrubber";
import { TimelineSequenceOrder } from "./timeline-sequence-order";
import { VerticalTimeline } from "./vertical-timeline";

type RegistryComponent = ComponentType<GenerativeUIComponentProps<never>>;
type PatternRegistry = Partial<Record<TemplateId, RegistryComponent>> & {
  default: TemplateId;
};

const patternRegistry: Record<PatternType, PatternRegistry> = {
  probability: {
    default: "card_flip_reveal",
    card_flip_reveal: GachaSimulator as RegistryComponent,
    spin_wheel: GachaSpinWheel as RegistryComponent,
  },
  parameter_explore: {
    default: "single_slider",
    single_slider: SliderExplorer as RegistryComponent,
    dual_slider: DualSliderExplorer as RegistryComponent,
  },
  concept_memory: {
    default: "term_cards",
    term_cards: CardFlip as RegistryComponent,
    grid_match: CardGridMatch as RegistryComponent,
  },
  process_timeline: {
    default: "horizontal_timeline",
    horizontal_timeline: TimelineScrubber as RegistryComponent,
    vertical_scroll: VerticalTimeline as RegistryComponent,
    sequence_order: TimelineSequenceOrder as RegistryComponent,
  },
  comparison: {
    default: "split_panel",
    split_panel: ComparisonSplit as RegistryComponent,
    overlay_fade: ComparisonOverlay as RegistryComponent,
  },
  knowledge_check: {
    default: "single_question",
    single_question: QuizBattle as RegistryComponent,
    combo_chain: QuizComboChain as RegistryComponent,
  },
  system_builder: {
    default: "module_sandbox",
    module_sandbox: BuildSandbox as RegistryComponent,
    flow_connect: SandboxFlowConnect as RegistryComponent,
  },
  narrative_branch: {
    default: "branch_story",
    branch_story: NarrativeBranch as RegistryComponent,
  },
  classification_sort: {
    default: "category_buckets",
    category_buckets: ClassificationSort as RegistryComponent,
  },
  simulation_play: {
    default: "parameter_simulation",
    parameter_simulation: SimulationPlay as RegistryComponent,
  },
};

export function getRenderableSchema(schema: UISchema): NormalizedUISchema {
  return normalizeUISchema(schema);
}

export function renderBySchema(
  schema: UISchema,
  handlers?: Pick<GenerativeUIComponentProps, "onInteraction" | "onComplete">,
) {
  const normalized = getRenderableSchema(schema);
  const pattern = patternRegistry[normalized.pattern];
  const Component = pattern[normalized.template] || pattern[pattern.default];
  const visualAsset = getVisualAsset(normalized.pattern, normalized.visual_asset);

  if (!Component) return null;
  const config = {
    ...(normalized.config as Record<string, unknown>),
    depth: normalized.depth,
  };

  const themeStyle = {
    ...patternStyle(normalized.pattern),
    "--visual-accent": visualAsset.accentVar,
  } as CSSProperties;

  return (
    <GenerativeUIErrorBoundary>
      <StateTransition
        className="generative-component-shell"
      >
        <div className="generative-component-theme" data-pattern={normalized.pattern} data-visual-tag={visualAsset.tag} style={themeStyle}>
          <Component config={config as never} {...handlers} />
        </div>
      </StateTransition>
    </GenerativeUIErrorBoundary>
  );
}

