export interface MetaphorDomain {
  domain: string;
  tags: string[];
}

export const HOBBY_TO_METAPHOR_DOMAIN: Record<string, MetaphorDomain> = {
  原神: { domain: "gacha_mechanics", tags: ["抽卡", "概率", "角色养成", "保底"] },
  "崩坏：星穹铁道": { domain: "gacha_mechanics", tags: ["回合制", "光锥", "模拟宇宙"] },
  王者荣耀: { domain: "moba_tactics", tags: ["团战", "经济", "装备"] },
  LOL: { domain: "moba_tactics", tags: ["团战", "补刀", "符文"] },
  F1赛车: { domain: "racing_strategy", tags: ["进站策略", "轮胎管理", "DRS"] },
  篮球: { domain: "basketball_tactics", tags: ["挡拆", "快攻", "绝杀"] },
  足球: { domain: "football_tactics", tags: ["传控", "反击", "越位"] },
  音乐: { domain: "music_theory", tags: ["和弦", "节奏", "主歌副歌"] },
  绘画: { domain: "visual_art", tags: ["构图", "色彩", "透视"] },
  烹饪: { domain: "cooking", tags: ["食材配比", "火候", "调味"] },
  旅行: { domain: "travel", tags: ["路线规划", "签证", "时差"] },
  摄影: { domain: "photography", tags: ["曝光", "焦距", "构图"] },
  电影: { domain: "filmmaking", tags: ["分镜", "剪辑", "叙事节奏"] },
  剪辑: { domain: "video_editing", tags: ["时间线", "转场", "素材管理"] },
  写作: { domain: "writing", tags: ["大纲", "伏笔", "修改"] },
  小说: { domain: "storytelling", tags: ["人物动机", "情节推进", "冲突"] },
  编程: { domain: "software_engineering", tags: ["函数", "模块", "调试"] },
  代码: { domain: "software_engineering", tags: ["抽象", "依赖", "测试"] },
  产品: { domain: "product_design", tags: ["需求", "原型", "迭代"] },
  设计: { domain: "design_system", tags: ["层级", "组件", "约束"] },
  运营: { domain: "growth_ops", tags: ["漏斗", "转化", "复盘"] },
  投资: { domain: "investing", tags: ["仓位", "风险收益", "复利"] },
  股票: { domain: "investing", tags: ["仓位", "估值", "波动"] },
  基金: { domain: "portfolio", tags: ["分散", "定投", "再平衡"] },
  心理学: { domain: "psychology", tags: ["动机", "偏差", "反馈"] },
  医学: { domain: "medicine", tags: ["诊断", "症状", "干预"] },
  法律: { domain: "law", tags: ["证据", "责任", "边界"] },
  教育: { domain: "teaching", tags: ["脚手架", "练习", "反馈"] },
  考研: { domain: "exam_prep", tags: ["知识点", "错题", "复盘"] },
  英语: { domain: "language_learning", tags: ["语法", "语境", "表达"] },
  健身: { domain: "fitness", tags: ["训练量", "恢复", "渐进超负荷"] },
  跑步: { domain: "running", tags: ["配速", "心率", "补给"] },
  露营: { domain: "camping", tags: ["装备", "路线", "风险预案"] },
  桌游: { domain: "board_games", tags: ["回合", "资源", "胜利条件"] },
  棋牌: { domain: "strategy_games", tags: ["先手", "局势", "弃子"] },
  RTS: { domain: "strategy_games", tags: ["侦查", "科技树", "资源调度"] },
  Minecraft: { domain: "sandbox_game", tags: ["合成", "资源采集", "建造"] },
  塞尔达: { domain: "adventure_game", tags: ["解谜", "探索", "道具组合"] },
  宝可梦: { domain: "collection_battle", tags: ["属性克制", "队伍搭配", "培养"] },
  明日方舟: { domain: "tower_defense", tags: ["部署费用", "站位", "技能时机"] },
};

export const DEFAULT_METAPHOR_DOMAIN: MetaphorDomain = {
  domain: "daily_life",
  tags: ["日常类比", "低门槛解释"],
};

export function selectMetaphorDomain(hobbies: string[] = []) {
  for (const hobby of hobbies) {
    const exact = HOBBY_TO_METAPHOR_DOMAIN[hobby];
    if (exact) return exact;

    const fuzzy = Object.entries(HOBBY_TO_METAPHOR_DOMAIN).find(([key]) => hobby.includes(key));
    if (fuzzy) return fuzzy[1];
  }

  return DEFAULT_METAPHOR_DOMAIN;
}
