import type {
  GenerativeUIComponentProps,
  NormalizedUISchema,
  PatternType,
  TemplateId,
  UISchema,
} from "@/types/schema";
import { normalizeUISchema } from "@/types/schema";
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
import { TimelineScrubber } from "./timeline-scrubber";
import { VerticalTimeline } from "./vertical-timeline";

type RegistryComponent = React.ComponentType<GenerativeUIComponentProps<never>>;
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

  if (!Component) return null;
  return <Component config={normalized.config as never} {...handlers} />;
}
