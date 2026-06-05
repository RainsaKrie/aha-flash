import type { UISchema } from "@/types/schema";

function includesAny(input: string, words: string[]) {
  return words.some((word) => input.includes(word));
}

export function createMockSchema(input: string): UISchema {
  const normalized = input.toLowerCase();

  const asksComparison = includesAny(input, ["比较", "区别", "对比", "A/B", "优缺点"]);
  const asksQuiz = includesAny(input, ["测试", "测验", "quiz", "检查", "问答", "连答", "连击"]);

  if ((includesAny(input, ["期权", "保险", "抽卡"]) || normalized.includes("option")) && !asksComparison && !asksQuiz) {
    if (includesAny(input, ["转盘", "spin"])) {
      return {
        pattern: "probability",
        template: "spin_wheel",
        version: "2.0",
        payload: {
          title: "期权 · 转盘锁价版",
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
            win: "转到高价值结果 {{market_price}}，但你仍按锁定价 {{strike_price}} 行动。",
            lose: "没转到高价值结果，你最多只损失 {{option_cost}}。",
          },
        },
      };
    }

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
      payload: {
        title: "沉没成本 · 分支故事",
        opening: "你排队 40 分钟买限定甜品，快到你时发现评价很普通。已经花掉的 40 分钟不能退回，现在真正的问题是：下一分钟还值不值得继续投进去？",
        branches: [
          {
            choice_label: "继续排队",
            outcome_description: "你买到了甜品，但发现味道一般。之前的等待没有变成收益，新的等待反而继续增加成本。",
            insight: "沉没成本不能决定下一步，下一步只该看未来收益和未来成本。",
          },
          {
            choice_label: "立刻离开",
            outcome_description: "你损失了已经等待的时间，但把接下来的时间拿去做更有价值的事。",
            insight: "及时止损不是否定过去，而是保护还没花出去的资源。",
          },
          {
            choice_label: "换一个目标",
            outcome_description: "你用剩下的时间买了附近更确定好吃的东西，体验反而更稳。",
            insight: "决策的核心是机会成本：同一段未来时间还能换来什么。",
          },
        ],
      },
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
