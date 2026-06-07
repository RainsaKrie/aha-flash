# 趣灵 (aha-flash) — 产品设计规范

> 给 Codex。定义页面上每一块东西的"存在理由"和"怎么做"。不得自行添加本文未提及的元素。

---

## 一、页面信息架构

当前页面是聊天应用 + 交互组件两套 UI 拼在一起——侧边栏塞满调试信息、对话历史、状态摘要、两个设置按钮。用户不知道该看哪。

### 1.1 砍掉

| 删除 | 理由 |
|---|---|
| 当前状态面板（uuid/背景/输出/计数等 8 行） | 开发者调试面板。profile 在 /onboarding 改、在 /sandbox 看 |
| 状态摘要面板（最近主题/关键洞察/会话摘要） | 信息与上面重复，大段文字没人读 |
| 对话历史面板 | 交互结果在组件里，不在消息流里。这不是聊天应用 |
| 工作台标题 + 重复设置按钮 | 废话 + 重复 |
| body 网格线背景 | 太花，和组件争视觉 |

**改为前端不展示的字段：** `userId`、`output_pattern`、`output_template`、`total_interactions`、`last_session_summary`

### 1.2 新布局

```
┌──────────────────────────────────────────────────┐
│  趣灵                          [沙盒]  [设置]     │  ← 顶栏 48px
├──────────────────────────────────────────────────┤
│                                                  │
│              [交互组件区域，垂直居中]               │
│                                                  │
│         输入一个概念开始探索                        │
│                                                  │
├──────────────────────────────────────────────────┤
│  [输入框...................................]     │  ← 底部输入栏
│  next concepts / 深度引导（有内容时浮现）          │
└──────────────────────────────────────────────────┘
```

- **顶栏**：48px，左 Logo + 趣灵，右 沙盒｜设置。无侧边栏
- **主区域**：组件垂直居中。空态文字 "输入一个概念开始探索"
- **底部输入栏**：固定底部。placeholder "输入你想理解的概念，用你的方式讲给你听"

**CSS 骨架：**

```css
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }
.topbar { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.component-stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
.input-bar { padding: 16px 20px 24px; }
body { background: var(--background); }
```

---

## 二、组件视觉标准

### 2.1 配色

全组件共用一套暗色变量，但当前 `#07120f` / `#091611` / `#0c1915` 太接近，肉眼无法区分层次。改为至少 15% 亮度差。

每个 Pattern 有独立主色调（从注册表 `patternStyle` 注入）：

| Pattern | 主色 | 语义 |
|---|---|---|
| probability | `#F7C948` 金色 | 稀有/价值 |
| parameter_explore | `#36D399` 青色 | 可调节 |
| concept_memory | `#78A6FF` 蓝色 | 记忆/认知 |
| process_timeline | `#B392F0` 紫色 | 时间流动 |
| comparison | `#F4A261` 橙色 | 对比/差异 |
| knowledge_check | `#FF6B6B` 红色 | 正确/错误 |
| system_builder | `#35E69B` 绿色 | 连接/构建 |
| narrative_branch | `#E879BA` 品红 | 选择/分支 |
| classification_sort | `#4DD9C1` 青色 | 分类/归位 |
| simulation_play | `#FACC15` 黄色 | 模拟/推演 |

不得在组件文件中硬编码 hex。主色从 `shared.tsx` 的 `patternStyle()` 读取，衍生成 bg/border/text 三态。

### 2.2 字体层级

```
标题    text-2xl font-semibold     （概念名）
副标题  text-base font-medium      （步骤/阶段名）
正文    text-sm leading-relaxed    （解释文本）
辅助    text-xs text-[var(--muted)]（标签/提示）
数值    text-3xl font-bold         （关键数字）
```

禁用 text-lg 作为标题。禁用 text-xl 作为正文。

### 2.3 间距

```
组件内边距  p-5 (20px)
卡片间距    gap-4 (16px)
区块间距    gap-6 (24px)
行内间距    gap-2 (8px)
```

不得出现 gap-3 / gap-7 等非 4 的倍数。

### 2.4 圆角

```
卡片/面板     rounded-xl (12px)
按钮          rounded-lg (8px)
标签/badge    rounded-md (6px)
进度条        rounded-full
```

禁止 `rounded-[8px]` 硬编码。

---

## 三、组件交互标准

### 3.1 必须覆盖的状态

| 状态 | 视觉表现 |
|---|---|
| **entering** | 250ms fade-in + translateY(16px)→0 |
| **idle** | 主 CTA 呼吸脉冲 `ui-breathe`（opacity 0.9→1, 2s） |
| **interacting** | 按钮 disabled + spinner，操作区高亮边框 |
| **result** | 反馈区 `ui-result` + 关键数字 `animate-value-pop` |
| **empty** | EmptyState 从中心渐入 |
| **error** | ErrorBoundary 已有 |

### 3.2 微交互

| 交互 | 动画 | 参数 |
|---|---|---|
| 按钮按下 | scale(0.96)→1 | 150ms ease-out |
| 卡片选中 | border-color 变化 + scale(1.02) | 200ms |
| 数值变化 | scale(1.3)→1 | 300ms spring |
| 结果揭示 | opacity 0→1 + translateY(8px)→0 | 400ms ease-out |
| 状态切换 | 旧 fade-out 150ms → 新 fade-in 150ms | 总 300ms |
| 成功 | `animate-success-flash`（绿色边框闪烁+发光） | 一次 400ms |
| 失败 | `animate-error-shake`（±4px 抖动 2 次） | 300ms |

禁用 `animate-pulse`（语义不明确，已有 `ui-breathe` 替代）。

### 3.3 可及性

- 所有可点击元素 `min-h-11`（44px）
- 所有按钮 `cursor-pointer` + `aria-label`
- 色板对比度 ≥ 4.5:1
- 滑块有 `aria-label`

---

## 四、深度切换

> 深度不应该在上方展示三按钮让用户预选——用户连概念都不懂，没法选深度。

### 三档定义

| 档位 | 动作词 | 系统行为 |
|---|---|---|
| 第 1 档 | **看一眼** | 默认。一个交互看懂概念是什么 |
| 第 2 档 | **试一下** | 交互完成后引导。代入真实场景做决策 |
| 第 3 档 | **拆开看** | 场景完成后引导。原理怎么和你熟悉的事物对应 |

### 交互流程

```
输入概念 → 默认给 "看一眼" → 用户操作完 →
  底部浮现：「还不够清楚？[代入真实场景试试]」→ 点了 → 重新生成
  → 再操作完 →「[想不想拆开看看原理？]」→ 点了 → 重新生成
```

- 引导文案是内联文字，不是按钮组
- 出现在组件下方 / 输入框上方
- 不强制，用户可直接输入新概念
- 只看下一级（看了 2 就不再提示 1）
- 注册表已有的 `DepthSwitcher` 保留但改为底部内联引导触发，不渲染顶部三按钮

---

## 五、隐喻生成

### 5.1 核心原则

产品语言的全局规则：**通用语打底，领域语翻译。**

- 通用语：任何人都能看懂的平实中文，把概念是什么说清楚
- 领域语：用户熟悉领域的术语体系，把每个抽象概念对应到具体事物

```
通用语：花一笔小钱，锁定未来买入的权利
  ↓ 先说人话
领域语：好比你花 160 原石抽一次卡——
  可能出 N 卡（亏了石头），也可能出 SSR（赚翻了）。
  这里的"权利金"就是你的"原石"，"行权价"就是"保底线"。
```

不写教科书式的纯通用语，也不写全是黑话的纯领域语。先让任何人能懂，再让这个人能对应到自己熟悉的东西。

这适用于组件内所有文字：标题、解释、选项、结果、错误信息、引导文案。

### 5.2 隐喻推理流程

不给 LLM 固定术语表。改给推理步骤（写入 prompt-templates.ts 的 `OUTPUT_FORMAT_RULES`）：

```
1. 拆解概念的核心动作：这个概念在做什么？（1-2 个动词）
2. 在用户领域找行为最接近的机制（用户领域由 user_state 提供）
3. 逐一验证映射是否成立，选成立度最高的
4. 选定一个术语体系后全文统一，禁止混用
5. 每个抽象概念必须有具体对应物，禁止"像玩游戏一样"这种泛类比
```

推理结果写入 payload 的 `metaphor_trace` 字段（前端不渲染，仅调试用）。

---

## 六、内容质量标准

### 6.1 Payload 最少内容量

| 字段 | 底线 |
|---|---|
| title | 2–8 字，概念简称 |
| description / quote | ≥ 10 字，含具体场景 |
| insight | ≥ 15 字，含因果链 |
| explanation | ≥ 20 字，说清错在哪+正确是什么 |
| 数组字段（cards/events/branches） | ≥ 3 项 |
| outcome_description | ≥ 15 字，描述具体后果 |

### 6.2 反例

每个 Pattern 至少 2 条反例：1 条针对结构（字段缺失/类型错误），1 条针对内容（太空泛/无因果/术语混用）。

---

## 七、执行范围

按优先级：

| 优先级 | 做什么 | 涉及文件 |
|---|---|---|
| **P0（页面）** | 砍掉侧边栏面板+对话历史+网格背景，改为顶栏+组件+底部三行布局 | `page.tsx`, `globals.css` |
| **P1（组件视觉）** | Pattern 主色调 + 六态覆盖 + 微交互 + 圆角/间距统一 | 全部组件 + `shared.tsx` + `registry.tsx` |
| **P2（内容质量）** | Payload 最少内容量约束 + 反例补充 + 隐喻推理四步 | `prompt-templates.ts`, `schema.ts` |
| **P3（深度切换）** | 顶部三按钮 → 底部渐进式引导 + 全局语言改为通用语+领域语混合 | `page.tsx`, `registry.tsx`, 各组件 `footer` |
| **P4（评估）** | score.ts 新增隐喻一致性评分维度 | `tests/eval/score.ts` |

P0/P1 一起做，P2 独立，P3 在 P2 之后。

每完成一项跑 `npm run build` 验证。
