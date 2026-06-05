import type { UISchema } from "@/types/schema";

function includesAny(input: string, words: string[]) {
  return words.some((word) => input.includes(word));
}

export function createMockSchema(input: string): UISchema {
  const normalized = input.toLowerCase();

  if (includesAny(input, ["期权", "保险", "抽卡"]) || normalized.includes("option")) {
    return {
      type: "gacha_simulator",
      version: "1.0",
      config: {
        title: "期权 · 抽卡锁价版",
        quote: "期权就是花小钱，买一个未来可选择的权利。",
        quote_author: "趣灵",
        pool: [
          { name: "限定 5 星角色", rarity: "5", probability: 0.016, value: 2000 },
          { name: "强力 4 星角色", rarity: "4", probability: 0.13, value: 350 },
          { name: "普通素材", rarity: "3", probability: 0.854, value: 40 },
        ],
        option_cost: 100,
        strike_price: 1000,
        pulls_per_try: 10,
        explanation_map: {
          win: "角色市场价涨到 {{market_price}}，但你仍按锁定价 {{strike_price}} 入手。期权的价值来自未来上涨时的选择权。",
          lose: "没有抽到高价值结果，你最多只损失 {{option_cost}}。这就是期权的有限损失。",
        },
      },
    };
  }

  if (includesAny(input, ["算法", "复杂度", "利率", "通胀", "参数"])) {
    return {
      pattern: "parameter_explore",
      template: "single_slider",
      version: "2.0",
      payload: {
        title: "变量影响 · 滑块探索器",
        variable_label: includesAny(input, ["算法", "复杂度"]) ? "输入数量 n" : "关键变量",
        min: 1,
        max: 100,
        default_value: 20,
        unit: includesAny(input, ["算法", "复杂度"]) ? "个" : "%",
        scenarios: [
          { label: "保守", value: 10 },
          { label: "中等", value: 50 },
          { label: "激进", value: 100 },
        ],
        explanation_template:
          "当变量变成 {{value}} 时，影响不是只多一点点；某些系统会因为乘法效应突然变重。",
      },
    };
  }

  if (includesAny(input, ["历史", "过程", "时间线", "演化", "发展"])) {
    return {
      type: "timeline_scrubber",
      version: "1.0",
      config: {
        title: "概念演化 · 时间轴",
        events: [
          { label: "起点", description: "先出现一个朴素问题：人们想解决什么麻烦。" },
          { label: "机制", description: "关键规则被抽象出来，概念开始变得可复用。" },
          { label: "扩散", description: "更多场景套用这套规则，概念变成通用工具。" },
          { label: "误区", description: "当边界条件被忽视时，概念也会被误用。" },
        ],
      },
    };
  }

  if (includesAny(input, ["比较", "区别", "对比", "A/B", "优缺点"])) {
    return {
      type: "comparison_split",
      version: "1.0",
      config: {
        title: "左右对比 · 把差异拉开看",
        left: { label: "表层差异", content: "看起来像是名词不同，实际常常只是使用场景不同。" },
        right: { label: "底层差异", content: "真正要抓的是约束、成本、收益和风险如何变化。" },
      },
    };
  }

  if (includesAny(input, ["测试", "测验", "quiz", "检查", "问答"])) {
    return {
      type: "quiz_battle",
      version: "1.0",
      config: {
        title: "理解检查 · 快问快答",
        question: "判断一个概念是否真的懂了，最可靠的信号是什么？",
        options: [
          { label: "能背出定义", correct: false, explanation: "定义有帮助，但容易停在表面。" },
          { label: "能预测交互结果", correct: true, explanation: "能预测结果，说明你抓住了机制。" },
          { label: "能说很多术语", correct: false, explanation: "术语密度不等于理解密度。" },
        ],
      },
    };
  }

  if (includesAny(input, ["系统", "架构", "模块", "组合", "沙盒"])) {
    return {
      type: "build_sandbox",
      version: "1.0",
      config: {
        title: "系统结构 · 模块沙盒",
        target: "把输入、规则、反馈三个模块组合成一个可学习系统",
        modules: [
          { id: "input", label: "输入", description: "用户提出问题、粘贴材料或提供外部链接。" },
          { id: "rules", label: "规则", description: "Harness 读取状态，选择隐喻域和组件类型。" },
          { id: "feedback", label: "反馈", description: "用户交互结果回流，更新状态记忆。" },
        ],
      },
    };
  }

  return {
    type: "card_flip",
    version: "1.0",
    config: {
      title: "把概念翻成能玩的说法",
      cards: [
        { front: "抽象概念", back: "先找一个你熟悉的系统，再把概念映射成动作和反馈。" },
        { front: "理解路径", back: "少读解释，多做一次选择，然后看结果怎么变。" },
        { front: "记忆方式", back: "记住关键动作，而不是背定义。" },
      ],
    },
  };
}
