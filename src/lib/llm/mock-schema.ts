import type { LearningDepth, UISchema } from "../../types/schema.ts";

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
      { name: "5 星结果", flavor_label: "限定角色", rarity: "5", probability: 0.016, value: 2000 },
      { name: "4 星结果", flavor_label: "强力角色", rarity: "4", probability: 0.13, value: 350 },
      { name: "3 星结果", flavor_label: "普通素材", rarity: "3", probability: 0.854, value: 40 },
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

function createBayesPayload(depth: LearningDepth) {
  if (depth === "scenario") {
    return {
      title: "贝叶斯 · 证据更新",
      cards: [
        {
          front: "先验判断",
          back: "看到新证据前，你先有一个初始概率，比如“这封邮件像诈骗”的直觉。",
        },
        {
          front: "证据强度",
          back: "新线索不是直接给答案，而是改变某个假设的可信度，比如链接异常会提高诈骗概率。",
        },
        {
          front: "后验判断",
          back: "把先验和证据合在一起，得到更新后的概率，再决定下一步行动。",
        },
      ],
      metaphor_trace: {
        concept_action: "更新判断",
        source_domain: "日常决策",
        candidate_mechanism: "根据新线索重估风险",
        mapping_checks: ["先验对应看到证据前的初始判断", "证据强度对应新线索对假设的支持程度"],
        chosen_terms: ["先验", "证据", "后验"],
      },
    };
  }

  if (depth === "mapping") {
    return {
      title: "贝叶斯 · 映射拆解",
      cards: [
        {
          front: "P(假设)",
          back: "先验概率：你在没有看到新证据前，对某个假设的初始相信程度。",
        },
        {
          front: "P(证据|假设)",
          back: "似然：如果假设是真的，看到这个证据的概率有多大。",
        },
        {
          front: "P(假设|证据)",
          back: "后验概率：看到证据之后，假设成立的概率被重新计算。",
        },
      ],
      metaphor_trace: {
        concept_action: "反向更新",
        source_domain: "概率判断",
        candidate_mechanism: "用证据重新分配相信程度",
        mapping_checks: ["公式左边是证据出现后的判断", "公式右边把先验和证据可信度合并"],
        chosen_terms: ["先验", "似然", "后验"],
      },
    };
  }

  return {
    title: "贝叶斯 · 三步更新",
    cards: [
      {
        front: "先有猜测",
        back: "贝叶斯定理不是凭空算答案，而是先承认你已经有一个初始判断。",
      },
      {
        front: "看新证据",
        back: "证据会提高或降低某个假设的可信度，关键是它在不同假设下有多常见。",
      },
      {
        front: "更新概率",
        back: "后验概率就是“看到证据之后，我现在该多相信这个假设”。",
      },
    ],
    metaphor_trace: {
      concept_action: "更新概率",
      source_domain: "判断修正",
      candidate_mechanism: "根据新证据调整相信程度",
      mapping_checks: ["先验对应初始猜测", "后验对应看完证据后的新判断"],
      chosen_terms: ["先验", "证据", "后验"],
    },
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

  if (includesAny(input, ["贝叶斯", "先验", "后验"]) || normalized.includes("bayes")) {
    return {
      pattern: "concept_memory",
      template: "term_cards",
      version: "2.0",
      depth,
      payload: createBayesPayload(depth),
      next_concepts: [
        { label: "条件概率", relation: "贝叶斯定理的基础语言" },
        { label: "似然", relation: "证据在某个假设下出现的概率" },
      ],
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
        outputs: includesAny(input, ["算法", "复杂度"])
          ? [
              { label: "线性成本", model: "linear", expression_label: "n", description: "每多一个输入，只多一份工作。" },
              { label: "平方成本", model: "quadratic", expression_label: "n²", description: "输入彼此配对比较，规模会快速放大。" },
            ]
          : [
              { label: "直接影响", model: "linear", expression_label: "x" },
              { label: "放大影响", model: "exponential", expression_label: "1.08^x" },
            ],
        insight_rules: [
          { when: "low", text: "低区间里，两种影响看起来差距不大。" },
          { when: "mid", text: "中间区间开始出现分叉，复杂系统会逐步拉开距离。" },
          { when: "high", text: "高区间里，非线性影响会突然变成主要负担。" },
        ],
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

    if (includesAny(input, ["股票", "期权"])) {
      return {
        pattern: "comparison",
        template: "split_panel",
        version: "2.0",
        payload: {
          title: "股票 vs. 期权 · 权利和风险边界",
          subject_a: "股票",
          subject_b: "期权",
          left: {
            label: "股票",
            content:
              "买股票是在直接拥有公司的一小份权益。收益跟股价上涨和分红相关。下跌时亏损会跟着股价走，理论上最多亏到本金。没有到期日，可以长期持有。",
          },
          right: {
            label: "期权",
            content:
              "买期权是在买一个未来按约定价格交易的权利。先付期权费，之后可以选择行权或放弃。买方最大损失通常锁定为期权费。期权有到期日，时间本身会消耗价值。",
          },
          dimensions: [
            {
              label: "你拥有什么",
              a: "公司的一小份权益",
              b: "未来按约定价格交易的选择权",
              insight: "股票是持有资产，期权是购买选择权。",
            },
            {
              label: "先付成本",
              a: "买入股票本金",
              b: "期权费",
              insight: "期权用较小前置成本换未来机会。",
            },
            {
              label: "亏损边界",
              a: "股价下跌会侵蚀本金",
              b: "买方通常最多亏掉期权费",
              insight: "期权把买方最大损失提前封顶。",
            },
            {
              label: "时间限制",
              a: "没有固定到期日，可以长期持有",
              b: "有到期日，时间会消耗价值",
              insight: "期权不仅看方向，也看时间。",
            },
          ],
          summary: "一句话：股票是拥有，期权是保留未来选择权。",
        },
        next_concepts: [
          { label: "期权费", relation: "理解期权成本和最大亏损边界" },
          { label: "行权价", relation: "理解期权是否值得执行的关键价格" },
        ],
      };
    }

    return {
      pattern: "comparison",
      template: "split_panel",
      version: "2.0",
      payload: {
        title: "左右对比 · 把差异拉开看",
        left: { label: "一边", content: "先看它提供什么权利或能力。再看你为它付出的成本。最后看风险边界在哪里。" },
        right: { label: "另一边", content: "再看它提供的权利或能力有什么不同。比较成本是否一次性、持续性或有时间限制。最后比较收益和亏损是否对称。" },
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
            { id: "input", label: "输入", role: "source", description: "用户提出问题或提供材料。" },
            { id: "rules", label: "规则", role: "transform", description: "Harness 读取状态，选择隐喻域和组件类型。" },
            { id: "feedback", label: "反馈", role: "loop", description: "用户交互结果回流，更新状态记忆。" },
          ],
          expected_sequence: ["input", "rules", "feedback"],
          connections: [
            { from: "input", to: "rules", label: "进入理解管道" },
            { from: "rules", to: "feedback", label: "生成并回收交互" },
          ],
          success_summary: "输入、规则、反馈连成闭环后，系统才能越用越贴合用户。",
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
          { id: "input", label: "输入", role: "source", description: "用户提出问题或提供材料。" },
          { id: "rules", label: "规则", role: "transform", description: "Harness 读取状态，选择隐喻域和组件类型。" },
          { id: "feedback", label: "反馈", role: "loop", description: "用户交互结果回流，更新状态记忆。" },
        ],
        required_module_ids: ["input", "rules", "feedback"],
        connections: [
          { from: "input", to: "rules", label: "进入理解管道" },
          { from: "rules", to: "feedback", label: "生成并回收交互" },
        ],
        success_summary: "输入、规则、反馈都在场时，系统闭环才成立。",
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
