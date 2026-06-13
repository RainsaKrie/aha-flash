import { createMockSchema } from "../llm/mock-schema.ts";
import type { PatternType, UISchema, VisualAssetHint } from "../../types/schema.ts";

export type TopicCategory = "科技" | "经济" | "哲学" | "心理" | "历史" | "数理";
export type TopicDifficulty = "轻松" | "进阶" | "烧脑一点";

export interface KnowledgePlay {
  id: string;
  title: string;
  concept: string;
  schema: UISchema;
  estimated_minutes: number;
  reward_copy: string;
}

export interface KnowledgeFlow {
  id: string;
  title: string;
  concept: string;
  hook: string;
  description: string;
  category: TopicCategory;
  topic_area: string;
  difficulty: TopicDifficulty;
  estimated_minutes: number;
  summary: string;
  concepts: string[];
  plays: KnowledgePlay[];
  follow_ups?: FollowUpTopic[];
  source?: "curated" | "generated";
}

function withAsset(schema: UISchema, visual_asset: VisualAssetHint): UISchema {
  return { ...schema, visual_asset };
}

function makePlay(
  id: string,
  title: string,
  concept: string,
  prompt: string,
  estimated_minutes: number,
  reward_copy: string,
  visual_asset: VisualAssetHint,
): KnowledgePlay {
  return {
    id,
    title,
    concept,
    schema: withAsset(createMockSchema(prompt, "rapid"), visual_asset),
    estimated_minutes,
    reward_copy,
  };
}

function makeQuiz(
  id: string,
  title: string,
  concept: string,
  question: string,
  correct: string,
  distractors: string[],
  explanation: string,
  visual_asset: VisualAssetHint,
): KnowledgePlay {
  return {
    id,
    title,
    concept,
    schema: withAsset(
      {
        pattern: "knowledge_check",
        template: "single_question",
        version: "2.0",
        depth: "rapid",
        payload: {
          title,
          question,
          options: [
            { label: correct, correct: true, explanation },
            ...distractors.map((label) => ({
              label,
              correct: false,
              explanation: "这个说法容易抓住表面词，但没有抓到概念真正的动作。",
            })),
          ],
        },
        next_concepts: [],
      },
      visual_asset,
    ),
    estimated_minutes: 1,
    reward_copy: explanation,
  };
}

export const MOCK_KNOWLEDGE_FLOWS: KnowledgeFlow[] = [
  {
    id: "bayes-starter",
    title: "贝叶斯入门",
    concept: "贝叶斯定理",
    hook: "新证据会怎样改判断？",
    description: "用三关把先验、证据和后验连成一条判断更新链。",
    category: "数理",
    topic_area: "数理",
    difficulty: "轻松",
    estimated_minutes: 4,
    summary: "贝叶斯不是背公式，而是用新证据修正旧判断。",
    concepts: ["先验", "证据强度", "后验"],
    plays: [
      {
        id: "bayes-guess",
        title: "先盲猜",
        concept: "先验",
        schema: withAsset(
          {
            pattern: "knowledge_check",
            template: "single_question",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "看到新证据时，你会怎么改判断？",
              question: "你本来觉得明天大概率不下雨，突然看到雷达上一大片雨云，最合理的做法是：",
              options: [
                { label: "完全不管旧判断，只信雨云", correct: false, explanation: "新证据重要，但旧判断也不能直接清零。" },
                { label: "把旧判断和新证据一起更新", correct: true, explanation: "这就是贝叶斯直觉：旧判断加新证据，得到新判断。" },
                { label: "坚持原判断，因为一开始更可靠", correct: false, explanation: "如果新证据足够强，判断就应该移动。" },
              ],
            },
            next_concepts: [],
          },
          { tag: "check-spark", mood: "idle" },
        ),
        estimated_minutes: 1,
        reward_copy: "你发现判断不是从空白开始。",
      },
      {
        id: "bayes-terms",
        title: "翻三张卡",
        concept: "先验 / 证据 / 后验",
        schema: withAsset(
          {
            pattern: "concept_memory",
            template: "term_cards",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "三张卡记住贝叶斯的动作",
              cards: [
                { front: "先验", back: "看到新证据前，你已经有的初始判断。" },
                { front: "证据强度", back: "新线索有多可靠、多能推动你改变看法。" },
                { front: "后验", back: "把先验和证据合起来后，更新出来的新判断。" },
              ],
            },
            next_concepts: [],
          },
          { tag: "memory-terms", mood: "idle" },
        ),
        estimated_minutes: 1,
        reward_copy: "你把三个关键词放到同一条链上了。",
      },
      {
        id: "bayes-slider",
        title: "调证据",
        concept: "后验变化",
        schema: withAsset(
          {
            pattern: "parameter_explore",
            template: "single_slider",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "拖动证据强度，看判断怎么移动",
              variable_label: "证据强度",
              min: 0,
              max: 100,
              default_value: 50,
              unit: "%",
              explanation_template: "证据越强，更新后的判断越明显；证据越弱，判断越接近原来的先验。",
              scenarios: [
                { label: "弱证据", value: 20 },
                { label: "中等证据", value: 50 },
                { label: "强证据", value: 85 },
              ],
              outputs: [
                { label: "后验相信度", model: "linear", min: 30, max: 95, default: 60 },
                { label: "判断移动幅度", model: "logarithmic", min: 0, max: 40, default: 12 },
              ],
              insight_rules: [
                { when: "low", text: "证据很弱时，你大多还相信原来的判断。" },
                { when: "mid", text: "中等证据会让判断开始移动，但还保留先验的影子。" },
                { when: "high", text: "强证据会大幅拉动后验，让新判断更靠近证据指向。" },
              ],
            },
            next_concepts: [],
          },
          { tag: "parameter-knob", mood: "reward" },
        ),
        estimated_minutes: 2,
        reward_copy: "你看见证据如何改变判断了。",
      },
    ],
  },
  {
    id: "compound-interest",
    title: "复利滚雪球",
    concept: "复利",
    hook: "为什么一点点增长，时间长了会突然变大？",
    description: "拖动变量，跑一次复利模拟，看增长如何从平平无奇变成加速。",
    category: "经济",
    topic_area: "经济",
    difficulty: "轻松",
    estimated_minutes: 5,
    summary: "复利的关键是每一步都把上一轮结果当成新起点。",
    concepts: ["增长率", "本金", "时间"],
    plays: [
      makePlay("compound-sim", "先跑一轮", "复利", "复利 模拟 推演", 2, "你看见增长会把自己继续喂大。", { tag: "simulation-loop", mood: "idle" }),
      makePlay("compound-param", "调一个变量", "增长率", "利率 参数 变量", 2, "你发现小变量在长时间里会被放大。", { tag: "parameter-knob", mood: "idle" }),
      makeQuiz("compound-check", "最后确认", "复利机制", "复利真正厉害的地方是什么？", "结果会继续参与下一轮增长", ["每次增长都完全一样", "只要本金大就一定快"], "复利是反馈循环，不只是单次加法。", { tag: "check-spark", mood: "reward" }),
    ],
  },
  {
    id: "marginal-effect",
    title: "边际效应",
    concept: "边际效应",
    hook: "为什么第一杯奶茶很快乐，第三杯就一般？",
    description: "用选择和滑块理解“再多一个”带来的变化。",
    category: "经济",
    topic_area: "经济",
    difficulty: "轻松",
    estimated_minutes: 4,
    summary: "边际效应看的是下一单位新增收益，而不是总量。",
    concepts: ["新增收益", "边际成本", "机会成本"],
    plays: [
      makePlay("marginal-choice", "下一杯还值吗", "边际选择", "沉没成本 选择 案例", 1, "你开始只看下一步是否值得。", { tag: "branch-choice", mood: "idle" }),
      makePlay("marginal-param", "调到转折点", "边际变化", "边际效用 参数", 2, "你看见新增收益会逐步变小。", { tag: "parameter-knob", mood: "idle" }),
      makeQuiz("marginal-check", "抓住一句话", "边际效应", "边际效应问的是什么？", "再增加一个单位会带来什么变化", ["过去已经花了多少", "总共拥有多少东西"], "边际判断只看下一单位带来的新增变化。", { tag: "check-spark", mood: "reward" }),
    ],
  },
  {
    id: "dns-router",
    title: "DNS 解析",
    concept: "DNS",
    hook: "输入网址后，浏览器怎么找到真正的服务器？",
    description: "把域名解析拆成几个模块，像问路一样理解网络寻址。",
    category: "科技",
    topic_area: "科技",
    difficulty: "进阶",
    estimated_minutes: 5,
    summary: "DNS 是把人能读的名字翻译成机器能找的地址。",
    concepts: ["域名", "递归查询", "IP 地址"],
    plays: [
      makePlay("dns-system", "先拼模块", "DNS 系统", "DNS 系统 架构 模块", 2, "你把名字、查询和地址放进了同一个系统。", { tag: "system-blocks", mood: "idle" }),
      makePlay("dns-flow", "连一次路", "解析流程", "DNS 流程 连线", 2, "你顺着查询路径走到了最终地址。", { tag: "system-blocks", mood: "reward" }),
      makeQuiz("dns-check", "防止误会", "DNS 作用", "DNS 最核心的动作是什么？", "把域名解析成可访问的地址", ["让网页变好看", "直接存储所有网页内容"], "DNS 负责寻址，不负责承载网页内容。", { tag: "check-spark", mood: "reward" }),
    ],
  },
  {
    id: "ockham-razor",
    title: "奥卡姆剃刀",
    concept: "奥卡姆剃刀",
    hook: "解释越复杂就越真实吗？不一定。",
    description: "在多个解释里做取舍，理解“少加假设”的判断习惯。",
    category: "哲学",
    topic_area: "哲学",
    difficulty: "轻松",
    estimated_minutes: 4,
    summary: "奥卡姆剃刀不是选最简单答案，而是少引入没必要的假设。",
    concepts: ["假设", "解释力", "简洁性"],
    plays: [
      makePlay("ockham-sort", "分出好解释", "解释分类", "分类 归因 怎么分", 2, "你开始区分解释力和多余假设。", { tag: "classification-buckets", mood: "idle" }),
      makePlay("ockham-compare", "左右对比", "简洁解释", "奥卡姆剃刀 对比 区别", 1, "你看见少假设并不等于少思考。", { tag: "compare-lens", mood: "idle" }),
      makeQuiz("ockham-check", "一句话判断", "奥卡姆剃刀", "奥卡姆剃刀更像哪条规则？", "在解释力相近时，优先少加假设", ["永远相信最简单答案", "复杂解释一定是错的"], "它反对无必要的假设，不反对必要的复杂性。", { tag: "check-spark", mood: "reward" }),
    ],
  },
  {
    id: "prisoners-dilemma",
    title: "囚徒困境",
    concept: "囚徒困境",
    hook: "为什么两个理性的人，可能一起做出更坏选择？",
    description: "走一次分支选择，看个人最优如何撞上整体更差。",
    category: "心理",
    topic_area: "心理",
    difficulty: "进阶",
    estimated_minutes: 5,
    summary: "囚徒困境揭示了个体激励和整体结果之间的错位。",
    concepts: ["个体理性", "集体结果", "信任"],
    plays: [
      makePlay("prisoner-branch", "先做选择", "策略选择", "囚徒困境 分支 选择 案例", 2, "你亲手走了一次个体最优的诱惑。", { tag: "branch-choice", mood: "idle" }),
      makePlay("prisoner-compare", "对比结果", "合作与背叛", "囚徒困境 对比 区别", 2, "你看到个人收益表会改变群体结局。", { tag: "compare-lens", mood: "idle" }),
      makeQuiz("prisoner-check", "机制确认", "博弈结构", "囚徒困境最刺眼的地方是什么？", "个人看似理性的选择会让整体变差", ["所有人都会随机行动", "合作永远没有好处"], "它说明激励结构会塑造选择，不是说人都坏。", { tag: "check-spark", mood: "reward" }),
    ],
  },
  {
    id: "industrial-revolution",
    title: "工业革命",
    concept: "工业革命",
    hook: "机器怎样改写社会节奏？",
    description: "沿着时间线看能源、工厂和城市如何互相推着走。",
    category: "历史",
    topic_area: "历史",
    difficulty: "进阶",
    estimated_minutes: 5,
    summary: "工业革命是能源、机器、组织方式一起改变的连锁反应。",
    concepts: ["能源", "工厂制", "城市化"],
    plays: [
      {
        id: "industrial-guess",
        title: "先猜推力",
        concept: "机制连锁",
        schema: withAsset(
          {
            pattern: "knowledge_check",
            template: "single_question",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "工业革命到底由什么推起来？",
              question: "工业革命更像下面哪一种变化？",
              options: [
                { label: "某台机器突然改变世界", correct: false, explanation: "单台机器重要，但不是完整机制。" },
                { label: "能源、机器、工厂和城市互相推动", correct: true, explanation: "真正的变化来自一组机制连锁放大。" },
                { label: "某一年突然发生的大事件", correct: false, explanation: "工业革命是持续几十年的系统变化。" },
              ],
            },
            next_concepts: [],
          },
          { tag: "check-spark", mood: "idle" },
        ),
        estimated_minutes: 1,
        reward_copy: "你抓住了它不是单点发明。",
      },
      {
        id: "industrial-time",
        title: "沿时间走",
        concept: "工业革命阶段",
        schema: withAsset(
          {
            pattern: "process_timeline",
            template: "horizontal_timeline",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "沿着连锁反应走一遍",
              events: [
                { label: "煤炭扩张", description: "煤炭提供更稳定的能源，使机器可以摆脱人力和水流限制。" },
                { label: "机器普及", description: "更强能源推动机器持续运转，于是生产速度被明显放大。" },
                { label: "工厂集中", description: "机器昂贵又庞大，促使工人集中到厂房，形成新的组织方式。" },
                { label: "城市膨胀", description: "工厂吸引劳动力聚集，带来城市扩张和新的消费市场。" },
                { label: "市场反推", description: "更大的市场反过来推动更多机器、能源和运输投入。" },
              ],
            },
            next_concepts: [],
          },
          { tag: "timeline-path", mood: "idle" },
        ),
        estimated_minutes: 2,
        reward_copy: "你看见每一步都推着下一步走。",
      },
      {
        id: "industrial-terms",
        title: "翻三张卡",
        concept: "能源 / 工厂 / 城市",
        schema: withAsset(
          {
            pattern: "concept_memory",
            template: "term_cards",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "三张卡记住工业革命的齿轮",
              cards: [
                { front: "能源", back: "煤炭和蒸汽让机器可以持续工作，突破人力上限。" },
                { front: "工厂制", back: "机器把工人集中到同一空间，分工和节奏被重新组织。" },
                { front: "城市化", back: "工厂吸引人口，城市扩大后又反过来制造更大的市场需求。" },
              ],
            },
            next_concepts: [],
          },
          { tag: "memory-terms", mood: "reward" },
        ),
        estimated_minutes: 1,
        reward_copy: "这一步把能源、工厂和城市连起来了。",
      },
    ],
  },
  {
    id: "inflation-deflation",
    title: "通胀 vs 通缩",
    concept: "通货膨胀与通货紧缩",
    hook: "价格变动，怎样影响选择？",
    description: "用对比维度看价格、现金、债务和消费决策如何一起变化。",
    category: "经济",
    topic_area: "经济",
    difficulty: "轻松",
    estimated_minutes: 4,
    summary: "它们会改变购买力和消费节奏。",
    concepts: ["价格水平", "购买力", "债务压力"],
    plays: [
      makeQuiz(
        "inflation-guess",
        "先猜影响",
        "购买力",
        "如果所有商品价格普遍上涨，你手里的现金会怎样？",
        "同样的钱能买到的东西变少",
        ["现金自动变多", "债务一定立刻消失"],
        "通胀首先改变的是钱的购买力，而不是纸币数量。",
        { tag: "check-spark", mood: "idle" },
      ),
      {
        id: "inflation-compare",
        title: "左右对比",
        concept: "通胀与通缩",
        schema: withAsset(
          {
            pattern: "comparison",
            template: "split_panel",
            version: "2.0",
            depth: "rapid",
            payload: {
              title: "切换维度，看通胀和通缩如何改变选择",
              subject_a: "通货膨胀",
              subject_b: "通货紧缩",
              left: { label: "通货膨胀", content: "整体价格持续上涨；现金购买力下降；固定债务相对变轻；人们更可能提前消费。" },
              right: { label: "通货紧缩", content: "整体价格持续下跌；现金购买力上升；固定债务相对变重；人们更可能推迟消费。" },
              dimensions: [
                { label: "价格方向", a: "普遍上涨", b: "普遍下跌", insight: "关键不是某个商品涨跌，而是整体价格水平的方向。" },
                { label: "现金购买力", a: "同样现金买得更少", b: "同样现金买得更多", insight: "购买力变化会改变人们持有现金的感受。" },
                { label: "债务压力", a: "固定债务相对变轻", b: "固定债务相对变重", insight: "借款人的体感会随价格水平变化。" },
                { label: "行为倾向", a: "更愿意提前消费", b: "更容易等待降价", insight: "预期会反过来影响真实消费和投资。" },
              ],
              summary: "通缩不是简单的便宜，通胀也不是所有人同样受损；重点是价格预期如何改变行为。",
            },
            next_concepts: [],
          },
          { tag: "compare-lens", mood: "idle" },
        ),
        estimated_minutes: 2,
        reward_copy: "你把两个方向的影响拆开看了。",
      },
      makeQuiz(
        "inflation-check",
        "拆掉误区",
        "通缩风险",
        "为什么通缩不一定是好事？",
        "大家可能推迟消费，债务压力也会变重",
        ["因为商品会变贵", "因为现金购买力一定下降"],
        "通缩的问题常在行为预期和债务压力，而不只是价格变低。",
        { tag: "check-spark", mood: "reward" },
      ),
    ],
  },
  {
    id: "supply-demand",
    title: "供需曲线",
    concept: "供需",
    hook: "价格为什么会像温度计一样反映稀缺？",
    description: "用模拟和对比看需求、供给、价格如何互相牵动。",
    category: "经济",
    topic_area: "经济",
    difficulty: "轻松",
    estimated_minutes: 5,
    summary: "供需曲线让价格变成协调稀缺和意愿的信号。",
    concepts: ["需求", "供给", "均衡价格"],
    plays: [
      makePlay("supply-sim", "先跑市场", "供需模拟", "供需 曲线 模拟 推演", 2, "你看到供需变化会推着价格移动。", { tag: "simulation-loop", mood: "idle" }),
      makePlay("supply-param", "调一个变量", "价格变量", "价格 参数 变量", 2, "你看见单个变量会牵动市场结果。", { tag: "parameter-knob", mood: "idle" }),
      makePlay("supply-compare", "左右看清", "供给和需求", "供需 对比 区别", 1, "你把买方意愿和卖方供给拆开看了。", { tag: "compare-lens", mood: "reward" }),
    ],
  },
];

export const SHOWCASE_FLOW_IDS = ["bayes-starter", "industrial-revolution", "inflation-deflation"] as const;

export function isShowcaseFlowId(id: string) {
  return SHOWCASE_FLOW_IDS.includes(id as (typeof SHOWCASE_FLOW_IDS)[number]);
}

export function getShowcaseFlows() {
  return SHOWCASE_FLOW_IDS.map((id) => findFlowById(id)).filter((flow): flow is KnowledgeFlow => Boolean(flow));
}

export function getFlowById(id: string) {
  return MOCK_KNOWLEDGE_FLOWS.find((flow) => flow.id === id) || MOCK_KNOWLEDGE_FLOWS[0];
}

export function findFlowById(id: string) {
  return MOCK_KNOWLEDGE_FLOWS.find((flow) => flow.id === id);
}

export interface FollowUpTopic {
  id: string;
  title: string;
  concept: string;
  hook: string;
  relation: string;
  kind: "curated" | "ai_seed";
  target_flow_id?: string;
  suggestedPattern?: PatternType | "auto";
}

const FLOW_FOLLOW_UPS: Record<string, FollowUpTopic[]> = {
  "bayes-starter": [
    {
      id: "bayes-to-compound",
      title: "去看复利",
      concept: "复利",
      hook: "同样是累积更新，只是变量换成时间。",
      relation: "从判断更新走向增长反馈",
      kind: "curated",
      target_flow_id: "compound-interest",
    },
    {
      id: "bayes-to-supply",
      title: "试试供需",
      concept: "供需曲线",
      hook: "把证据强弱换成市场信号。",
      relation: "从概率证据走向价格信号",
      kind: "ai_seed",
      target_flow_id: "supply-demand",
    },
    {
      id: "bayes-to-inflation",
      title: "连接通胀",
      concept: "通胀 vs 通缩",
      hook: "判断会变，人的选择也会变。",
      relation: "从个人判断走向群体预期",
      kind: "curated",
      target_flow_id: "inflation-deflation",
    },
  ],
  "industrial-revolution": [
    {
      id: "industrial-to-dns",
      title: "拆一个系统",
      concept: "DNS 解析",
      hook: "从工厂系统换到网络系统。",
      relation: "从历史连锁走向系统协作",
      kind: "ai_seed",
      target_flow_id: "dns-router",
    },
    {
      id: "industrial-to-supply",
      title: "看供需变化",
      concept: "供需曲线",
      hook: "机器改变供给，价格跟着移动。",
      relation: "从生产方式走向市场信号",
      kind: "curated",
      target_flow_id: "supply-demand",
    },
    {
      id: "industrial-to-inflation",
      title: "接到经济波动",
      concept: "通胀 vs 通缩",
      hook: "产能、价格和消费互相推着走。",
      relation: "从社会节奏走向价格预期",
      kind: "curated",
      target_flow_id: "inflation-deflation",
    },
  ],
  "inflation-deflation": [
    {
      id: "inflation-to-supply",
      title: "追到供需",
      concept: "供需曲线",
      hook: "价格为什么动，先看两股力量。",
      relation: "从价格结果走向市场机制",
      kind: "curated",
      target_flow_id: "supply-demand",
    },
    {
      id: "inflation-to-bayes",
      title: "回到判断",
      concept: "贝叶斯定理",
      hook: "新数据会改写你的预期。",
      relation: "从经济预期走向判断更新",
      kind: "curated",
      target_flow_id: "bayes-starter",
    },
    {
      id: "inflation-to-marginal",
      title: "看边际选择",
      concept: "边际效应",
      hook: "价格变了，下一步值不值得也变了。",
      relation: "从宏观价格走向个人选择",
      kind: "ai_seed",
      target_flow_id: "marginal-effect",
    },
  ],
  "compound-interest": [
    {
      id: "compound-to-bayes",
      title: "回到更新",
      concept: "贝叶斯定理",
      hook: "增长会累积，判断也会更新。",
      relation: "从时间反馈走向证据反馈",
      kind: "curated",
      target_flow_id: "bayes-starter",
    },
    {
      id: "compound-to-marginal",
      title: "看下一步值不值",
      concept: "边际效应",
      hook: "不是总量，而是下一步变化。",
      relation: "从累积增长走向边际判断",
      kind: "curated",
      target_flow_id: "marginal-effect",
    },
  ],
  "supply-demand": [
    {
      id: "supply-to-inflation",
      title: "接到通胀",
      concept: "通胀 vs 通缩",
      hook: "价格水平移动后，选择会变化。",
      relation: "从局部市场走向整体价格",
      kind: "curated",
      target_flow_id: "inflation-deflation",
    },
    {
      id: "supply-to-marginal",
      title: "拆到个人选择",
      concept: "边际效应",
      hook: "市场变化最终落到下一次选择。",
      relation: "从市场均衡走向个体决策",
      kind: "ai_seed",
      target_flow_id: "marginal-effect",
    },
  ],
};

const DEFAULT_FOLLOW_UPS = FLOW_FOLLOW_UPS["bayes-starter"];

export function getFlowFollowUps(flowId: string) {
  return FLOW_FOLLOW_UPS[flowId] || DEFAULT_FOLLOW_UPS;
}

export function getAllFlows() {
  return MOCK_KNOWLEDGE_FLOWS;
}