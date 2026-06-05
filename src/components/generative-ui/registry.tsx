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
import { ComparisonSplit } from "./comparison-split";
import { GachaSimulator } from "./gacha-simulator";
import { QuizBattle } from "./quiz-battle";
import { SliderExplorer } from "./slider-explorer";
import { TimelineScrubber } from "./timeline-scrubber";

type RegistryComponent = React.ComponentType<GenerativeUIComponentProps<never>>;
type PatternRegistry = Partial<Record<TemplateId, RegistryComponent>> & {
  default: TemplateId;
};

const patternRegistry: Record<PatternType, PatternRegistry> = {
  probability: {
    default: "card_flip_reveal",
    card_flip_reveal: GachaSimulator as RegistryComponent,
  },
  parameter_explore: {
    default: "single_slider",
    single_slider: SliderExplorer as RegistryComponent,
  },
  concept_memory: {
    default: "term_cards",
    term_cards: CardFlip as RegistryComponent,
  },
  process_timeline: {
    default: "horizontal_timeline",
    horizontal_timeline: TimelineScrubber as RegistryComponent,
  },
  comparison: {
    default: "split_panel",
    split_panel: ComparisonSplit as RegistryComponent,
  },
  knowledge_check: {
    default: "single_question",
    single_question: QuizBattle as RegistryComponent,
  },
  system_builder: {
    default: "module_sandbox",
    module_sandbox: BuildSandbox as RegistryComponent,
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
