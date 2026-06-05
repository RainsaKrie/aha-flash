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
