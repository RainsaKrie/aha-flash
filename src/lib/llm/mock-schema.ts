import type { LearningDepth, UISchema } from "@/types/schema";

const OPTION_NEXT_CONCEPTS = [
  { label: "期货", relation: "同属衍生品，但期货更像约定未来必须交易" },
  { label: "保险", relation: "都用小成本管理未来不确定性" },
];

function includesAny(input: string, words: string[]) {
  return words.some((word) => input.includes(word));
}

function createOptionConfig(depth: LearningDepth) {
  const depthCopy = {
    rapid: {
      title: "期权 · 10 秒锁价券",
      quote: "期权就是花小钱，买一个未来可选择的权利。",
      pulls_per_try: 6,
      win: "高价值结果涨到 {{market_price}}，你仍按锁定价 {{strike_price}} 行动：选择权开始变值钱。",
      lose: "没有出现高价值结果，你最多只损失 {{option_cost}}：坏结果被封顶。",
    },
    scenario: {
      title: "期权 · 到期决策版",
      quote: "先付期权费，等未来价格揭晓，再决定要不要行权。",
      pulls_per_try: 10,
      win: "未来价格来到 {{market_price}}，高过锁定价 {{strike_price}}，此时行权更划算。",
      lose: "未来结果不够好，你可以放弃行权，只把 {{option_cost}} 当作买选择权的成本。",
    },
    mapping: {
      title: "期权 · 隐喻映射版",
      quote: "抽卡券=期权费，锁定价=行权价，角色价值=标的价格，是否使用=行权决策。",
      pulls_per_try: 8,
      win: "标的价格 {{market_price}} 高于行权价 {{strike_price}}，收益来自价格差减去期权费。",
      lose: "标的价格没有越过边界，损失被限制在期权费 {{option_cost}}，这就是有限损失结构。",
    },
  }[depth];

  return {
    title: depthCopy.title,
    quote: depthCopy.quote,
    quote_author: "趣灵",
    pool: [
      { name: "限定 5 星角色", rarity: "5", probability: 0.016, value: 2000 },
      { name: "强力 4 星角色", rarity: "4", probability: 0.13, value: 350 },
      { name: "普通素材", rarity: "3", probability: 0.854, value: 40 },
    ],
    option_cost: 100,
    strike_price: 1000,
    pulls_per_try: depthCopy.pulls_per_try,
    explanation_map: {
      win: depthCopy.win,
      lose: depthCopy.lose,
    },
  };
}

function createSunkCostPayload(depth: LearningDepth) {
  if (depth === "scenario") {
    return {
      title: "沉没成本 · 真实决策场景",
      opening:
        "你排队 40 分钟买限定甜品，快到你时发现评价很普通。现在要决定的不是“前 40 分钟值不值”，而是“接下来 10 分钟还值不值”。",
      branches: [
        {
          choice_label: "继续排队",
          outcome_description: "你买到了甜品，但体验一般。新的 10 分钟没有带来足够收益。",
          insight: "场景决策看未来：继续投入只该由未来收益决定。",
        },
        {
          choice_label: "立刻离开",
          outcome_description: "你承认前 40 分钟已经回不来，把剩下时间换成更确定的安排。",
          insight: "离开不是浪费过去，而是保护还没投入的资源。",
        },
        {
          choice_label: "换一个目标",
          outcome_description: "你去附近买了更确定好吃的东西，整体体验更稳。",
          insight: "比较下一步方案时，机会成本比已付成本更重要。",
        },
      ],
    };
  }

  if (depth === "mapping") {
    return {
      title: "沉没成本 · 隐喻映射版",
      opening:
        "把故事拆成三件事：已等待时间=沉没成本，接下来时间=新增成本，能得到的体验=未来收益。决策只看后两者。",
      branches: [
        {
          choice_label: "把已等待时间算进理由",
          outcome_description: "你让不可追回的时间继续指挥未来，新增成本被过去绑架。",
          insight: "映射：沉没成本不可改变，不应进入下一步收益计算。",
        },
        {
          choice_label: "只比较未来 10 分钟",
          outcome_description: "你重新估算下一步投入和可能收益，决策变得清楚。",
          insight: "映射：边际成本和边际收益才是当前选择的核心变量。",
        },
        {
          choice_label: "列出替代方案",
          outcome_description: "你发现同一段未来时间可以换来更好体验。",
          insight: "映射：机会成本提醒你，继续不是默认选项。",
        },
      ],
    };
  }

  return {
    title: "沉没成本 · 10 秒止损版",
    opening: "已经花掉的时间不能退回。下一步只看：继续投入还划不划算？",
    branches: [
      {
        choice_label: "继续",
        outcome_description: "你继续投入，但过去的损失没有因此变回来。",
        insight: "沉没成本的关键：过去不能追回。",
      },
      {
        choice_label: "停止",
        outcome_description: "你保住了接下来还能自由使用的时间。",
        insight: "止损是在保护未来资源。",
      },
      {
        choice_label: "换目标",
        outcome_description: "你把剩余资源换到更值得的地方。",
        insight: "下一步应该看未来收益。",
      },
    ],
  };
}

export function createMockSchema(input: string, depth: LearningDepth = "rapid"): UISchema {
  const normalized = input.toLowerCase();

  const asksComparison = includesAny(input, ["比较", "区别", "对比", "A/B", "优缺点"]);
  const asksQuiz = includesAny(input, ["测试", "测验", "quiz", "检查", "问答", "连答", "连击"]);

  if ((includesAny(input, ["期权", "保险", "抽卡"]) || normalized.includes("option")) && !asksComparison && !asksQuiz) {
    if (includesAny(input, ["转盘", "spin"])) {
      return {
        pattern: "probability",
        template: "spin_wheel",
        version: "2.0",
        depth,
        next_concepts: OPTION_NEXT_CONCEPTS,
        payload: createOptionConfig(depth),
      };
    }

    return {
      type: "gacha_simulator",
      version: "1.0",
      depth,
      next_concepts: OPTION_NEXT_CONCEPTS,
      config: createOptionConfig(depth),
    };
  }

  if (includesAny(input, ["算法", "复杂度", "利率", "通胀", "参数"])) {
    return {
      pattern: "parameter_explore",
      template: includesAny(input, ["双滑块", "双变量", "对照"]) ? "dual_slider" : "single_slider",
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

  if (includesAny(input, ["沉没成本", "后悔", "分支", "选择", "案例"])) {
    return {
      pattern: "narrative_branch",
      template: "branch_story",
      version: "2.0",
      depth,
      payload: createSunkCostPayload(depth),
    };
  }

  if (includesAny(input, ["分类", "归因", "怎么分", "分辨", "价值投资", "成长投资"])) {
    return {
      pattern: "classification_sort",
      template: "category_buckets",
      version: "2.0",
      payload: {
        title: "投资风格 · 分类桶",
        categories: [
          { id: "value", name: "价值投资" },
          { id: "growth", name: "成长投资" },
          { id: "index", name: "指数投资" },
        ],
        items: [
          {
            label: "便宜买入现金流稳定但被低估的公司",
            correct_category: "value",
            explanation: "核心是价格低于内在价值，像用折扣价买稳定产出。",
          },
          {
            label: "愿意为高速扩张和未来市场空间付更高价格",
            correct_category: "growth",
            explanation: "核心是未来增速，像提前押注角色后续会变强。",
          },
          {
            label: "不挑单个公司，长期买入一篮子市场组合",
            correct_category: "index",
            explanation: "核心是跟随整体市场，不把胜负押在单点判断上。",
          },
        ],
      },
    };
  }

  if (includesAny(input, ["复利", "供需", "模拟", "推演", "网络效应", "滚起来"])) {
    return {
      pattern: "simulation_play",
      template: "parameter_simulation",
      version: "2.0",
      payload: {
        title: "复利 · 滚雪球模拟",
        params: [
          { label: "每步增长率", min: 1, max: 30, default: 8, unit: "%" },
          { label: "初始加成", min: 0, max: 200, default: 20, unit: "" },
        ],
        compute_formula_description:
          "每一步都会把上一步的结果当成新的本金，所以增长率看似只多一点，后面会越滚越快。",
        steps: 8,
      },
    };
  }

  if (includesAny(input, ["历史", "过程", "时间线", "演化", "发展"])) {
    if (includesAny(input, ["纵向", "滚动"])) {
      return {
        pattern: "process_timeline",
        template: "vertical_scroll",
        version: "2.0",
        payload: {
          title: "概念演化 · 纵向阶段",
          events: [
            { label: "起点", description: "先出现一个朴素问题：人们想解决什么麻烦。" },
            { label: "机制", description: "关键规则被抽象出来，概念开始变得可复用。" },
            { label: "扩散", description: "更多场景套用这套规则，概念变成通用工具。" },
            { label: "误区", description: "当边界条件被忽视时，概念也会被误用。" },
          ],
        },
      };
    }

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

  if (asksComparison) {
    if (includesAny(input, ["叠加", "淡入", "overlay"])) {
      return {
        pattern: "comparison",
        template: "overlay_fade",
        version: "2.0",
        payload: {
          title: "叠加对比 · 视角切换",
          left: { label: "表层差异", content: "看起来像是名词不同，实际常常只是使用场景不同。" },
          right: { label: "底层差异", content: "真正要抓的是约束、成本、收益和风险如何变化。" },
        },
      };
    }

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

  if (asksQuiz) {
    if (includesAny(input, ["连答", "combo", "连击"])) {
      return {
        pattern: "knowledge_check",
        template: "combo_chain",
        version: "2.0",
        payload: {
          title: "理解检查 · 连答 Combo",
          question: "判断一个概念是否真的懂了，最可靠的信号是什么？",
          options: [
            { label: "能背出定义", correct: false, explanation: "定义有帮助，但容易停在表面。" },
            { label: "能预测交互结果", correct: true, explanation: "能预测结果，说明你抓住了机制。" },
            { label: "能说很多术语", correct: false, explanation: "术语密度不等于理解密度。" },
          ],
        },
      };
    }

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
    if (includesAny(input, ["连线", "流程", "flow"])) {
      return {
        pattern: "system_builder",
        template: "flow_connect",
        version: "2.0",
        payload: {
          title: "系统结构 · 流程连线",
          target: "把输入、规则、反馈三个模块连接成一个可学习系统",
          modules: [
            { id: "input", label: "输入", description: "用户提出问题、粘贴材料或提供外部链接。" },
            { id: "rules", label: "规则", description: "Harness 读取状态，选择隐喻域和组件类型。" },
            { id: "feedback", label: "反馈", description: "用户交互结果回流，更新状态记忆。" },
          ],
        },
      };
    }

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
    pattern: "concept_memory",
    template: includesAny(input, ["配对", "匹配", "grid"]) ? "grid_match" : "term_cards",
    version: "2.0",
    payload: {
      title: "把概念翻成能玩的说法",
      cards: [
        { front: "抽象概念", back: "先找一个你熟悉的系统，再把概念映射成动作和反馈。" },
        { front: "理解路径", back: "少读解释，多做一次选择，然后看结果怎么变。" },
        { front: "记忆方式", back: "记住关键动作，而不是背定义。" },
      ],
    },
  };
}
