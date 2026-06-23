import type { CompoundInterestFormula, SimulationPlayConfig, SliderExplorerConfig } from "@/types/schema";

type SliderOutput = NonNullable<SliderExplorerConfig["outputs"]>[number];

export interface CompoundInterestState {
  principal: number;
  annualRate: number;
  periods: number;
  rateUnit: "percent" | "decimal";
  output: "future_value" | "interest_earned";
}

const RATE_LABEL_PATTERN = /年利率|利率|annual\s*rate|interest\s*rate/i;
const PRINCIPAL_LABEL_PATTERN = /本金|principal|initial\s*(principal|capital)/i;
const FINAL_VALUE_LABEL_PATTERN = /终值|最终值|未来值|年后|final\s*value|future\s*value/i;

function finitePositive(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function periodsFromLabel(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(?:年|years?)/i);
  return match ? Number(match[1]) : 10;
}

export function formatInteractiveNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits }).format(value);
}

export function resolveSliderCompoundFormula(config: SliderExplorerConfig, output: SliderOutput): CompoundInterestFormula | null {
  if (output.formula?.kind === "compound_interest") return output.formula;

  const evidence = `${config.variable_label} ${output.label}`;
  if (!RATE_LABEL_PATTERN.test(evidence) || !FINAL_VALUE_LABEL_PATTERN.test(evidence)) return null;

  return {
    kind: "compound_interest",
    principal: finitePositive(output.multiplier, 100),
    periods: periodsFromLabel(output.label),
    rate_unit: config.unit === "小数" ? "decimal" : "percent",
    output: "future_value",
  };
}

export function calculateCompoundInterest(formula: CompoundInterestFormula, annualRate: number) {
  const rate = formula.rate_unit === "decimal" ? annualRate : annualRate / 100;
  const futureValue = formula.principal * (1 + rate) ** formula.periods;
  return formula.output === "interest_earned" ? futureValue - formula.principal : futureValue;
}

export function compoundInterestFormulaText(
  formula: CompoundInterestFormula,
  rateLabel: string,
  annualRate: number,
) {
  const resultLabel = formula.output === "interest_earned" ? "利息" : "终值";
  const expression = formula.output === "interest_earned"
    ? `${resultLabel} = 本金 × (1 + ${rateLabel})^期数 − 本金`
    : `${resultLabel} = 本金 × (1 + ${rateLabel})^期数`;
  const rateText = formula.rate_unit === "decimal" ? String(annualRate) : `${annualRate}%`;
  const value = calculateCompoundInterest(formula, annualRate);
  const substitution = formula.output === "interest_earned"
    ? `${formatInteractiveNumber(formula.principal)} × (1 + ${rateText})^${formula.periods} − ${formatInteractiveNumber(formula.principal)} = ${formatInteractiveNumber(value)}`
    : `${formatInteractiveNumber(formula.principal)} × (1 + ${rateText})^${formula.periods} = ${formatInteractiveNumber(value)}`;
  return { expression, substitution, value };
}

export function resolveSimulationCompoundInterest(
  config: SimulationPlayConfig,
  values: Record<string, number>,
): CompoundInterestState | null {
  const declared = config.formula?.kind === "compound_interest" ? config.formula : null;
  const principalParam = declared
    ? config.params.find((param) => param.label === declared.principal_param)
    : config.params.find((param) => PRINCIPAL_LABEL_PATTERN.test(param.label));
  const rateParam = declared
    ? config.params.find((param) => param.label === declared.rate_param)
    : config.params.find((param) => RATE_LABEL_PATTERN.test(param.label));

  if (!principalParam || !rateParam) return null;

  return {
    principal: finitePositive(values[principalParam.label], principalParam.default),
    annualRate: Number.isFinite(values[rateParam.label]) ? values[rateParam.label] : rateParam.default,
    periods: Math.max(1, Math.round(config.steps)),
    rateUnit: declared?.rate_unit || "percent",
    output: "future_value",
  };
}

export function compoundInterestAt(state: CompoundInterestState, period: number) {
  const rate = state.rateUnit === "decimal" ? state.annualRate : state.annualRate / 100;
  return state.principal * (1 + rate) ** Math.max(0, period);
}