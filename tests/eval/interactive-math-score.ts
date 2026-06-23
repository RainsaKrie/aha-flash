import {
  calculateCompoundInterest,
  compoundInterestAt,
  resolveSimulationCompoundInterest,
  resolveSliderCompoundFormula,
} from "../../src/lib/interactive-math.ts";
import type { SimulationPlayConfig, SliderExplorerConfig } from "../../src/types/schema.ts";

function assertClose(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(label + ": expected " + expected + ", received " + actual);
  }
}

const sliderConfig: SliderExplorerConfig = {
  depth: "rapid",
  title: "调整年利率",
  variable_label: "年利率",
  min: 0,
  max: 20,
  default_value: 5,
  unit: "%",
  explanation_template: "年利率提高会放大复利的累积效果。",
  outputs: [{ label: "10年后终值", model: "exponential", multiplier: 100, unit: "元" }],
};
const sliderFormula = resolveSliderCompoundFormula(sliderConfig, sliderConfig.outputs![0]);
if (!sliderFormula) throw new Error("Slider compound-interest formula was not inferred.");
assertClose(calculateCompoundInterest(sliderFormula, 5), 162.8894626777, "100元按5%复利10年后的终值");

const simulationConfig: SimulationPlayConfig = {
  depth: "rapid",
  title: "复利模拟",
  params: [
    { label: "初始本金", min: 1000, max: 50000, default: 10000, unit: "元" },
    { label: "年利率", min: 1, max: 12, default: 5, unit: "%" },
  ],
  compute_formula_description: "每年利息加入本金，下一年按新的本金继续计息。",
  steps: 10,
};
const compoundState = resolveSimulationCompoundInterest(simulationConfig, {
  初始本金: 10000,
  年利率: 5,
});
if (!compoundState) throw new Error("Simulation compound-interest state was not inferred.");
assertClose(compoundInterestAt(compoundState, 5), 12762.815625, "10000元按5%复利第5期终值");
assertClose(compoundInterestAt(compoundState, 10), 16288.9462678, "10000元按5%复利第10期终值");

console.log("interactive-math score: 1");
console.log("slider: 100 × (1 + 5%)^10 = 162.89");
console.log("simulation: 10000 × (1 + 5%)^5 = 12762.82");