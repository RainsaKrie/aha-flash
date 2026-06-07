# 趣灵 (aha-flash) — 组件质量规范

> 给 Codex：逐组件对照执行。每条都有明确的"当前状态"和"目标状态"。

---

## 一、现状诊断

抽样 5 个组件（gacha-simulator / narrative-branch / slider-explorer / quiz-battle / shared.tsx），共性问题：

| 维度 | 当前状态 | 核心问题 |
|---|---|---|
| 视觉效果 | 暗色主题 + CSS 变量统一色板 | 太平——所有组件看起来一样，没有个性。除了 gacha 卡牌有一点阴影，其余组件全是边框+背景色块堆叠 |
| 交互反馈 | 只有 `transition` on hover + `animate-pulse` on loading | 按钮按下无缩放/回弹，状态切换是瞬间跳变，成功/失败无庆祝/震动反馈 |
| 状态覆盖 | idle → result 两态，部分有 loading 中间态 | 没有骨架屏/入场动画。组件出现是整块弹出，不是逐步构建 |
| 深度切换 | 标题旁有深度 badge，组件内无切换入口 | 用户不能自己切换深度，只能看 LLM 给什么算什么 |
| 内容质量 | Prompt 模板很详细（正例+反例+视觉指导） | 缺少 payload 字段的最少内容量约束（如"insight 必须 ≥15 字"） |

---

## 二、视觉标准

### 2.1 配色系统

当前状态：全组件共用一套暗色变量（`var(--accent)`, `var(--line)`, `#07120f` ...），缺乏层次。

**目标：定义三层色彩**

| 层级 | 用途 | 示例 |
|---|---|---|
| 表面色 | 组件最底层背景 | `#0a1a14`（最深） |
| 容器色 | 卡片/面板 | `#07120f` |
| 抬高色 | 悬浮卡片/弹窗 | `#0c1f19`（稍亮） |

当前 `#07120f` / `#091611` / `#0c1915` 三个值太接近，肉眼无法区分层级。改为至少 15% 亮度差。

**每个 Pattern 的主色调**

当前全组件共用 `var(--accent)`（绿色）。10 个 Pattern 应该有区分：

| Pattern | 主色 | 语义 |
|---|---|---|
| probability | 金色 `#F7C948` | 稀有/价值 |
| parameter_explore | 青色 `#36D399` | 可调节 |
| concept_memory | 蓝色 `#78A6FF` | 记忆/认知 |
| process_timeline | 紫色 `#B392F0` | 时间流动 |
| comparison | 橙色 `#F4A261` | 对比/差异 |
| knowledge_check | 红色 `#FF6B6B` | 正确/错误 |
| system_builder | 绿色 `#35E69B` | 连接/构建 |
| narrative_branch | 品红 `#E879BA` | 选择/分支 |
| classification_sort | 青色 `#4DD9C1` | 分类/归位 |
| simulation_play | 黄色 `#FACC15` | 模拟/推演 |

**要求**：每个组件从 Pattern 色衍生出 bg / border / text 三态。不在组件中硬编码 hex，统一用 CSS 变量或 Tailwind 类。

### 2.2 字体层级

当前状态：用 Tailwind 默认尺寸（text-xs / text-sm / text-2xl），缺乏中间档。

```
标题    text-2xl font-semibold    （概念名）
副标题  text-base font-medium     （当前步骤/阶段名）
正文    text-sm                   （解释文本，line-height 1.6）
辅助    text-xs text-[var(--muted)]（标签/提示）
数值    text-3xl font-bold         （关键数字：分数/余额/百分比）
```

**不要用** text-lg 作为标题（在 2xl 和 base 之间制造混乱）。

### 2.3 间距规则

当前状态：到处 `gap-5 p-5`，没有韵律。

```
组件内边距  p-5（20px）
卡片间距    gap-4（16px）
区块间距    gap-6（24px）
行内间距    gap-2（8px，标签/图标之间）
```

不得出现 gap-3 / gap-7 等非 4 的倍数。

### 2.4 圆角统一

当前状态：`rounded-[8px]` 在大部分地方，但部分按钮没有。

```
卡片/面板     rounded-xl（12px）
按钮          rounded-lg（8px）
标签/badge    rounded-md（6px）
进度条        rounded-full
```

禁止 `rounded-[8px]` 硬编码，全部替换为标准 Tailwind 圆角类。

---

## 三、交互标准

### 3.1 必须覆盖的状态

每个组件必须实现以下状态，缺一不可：

| 状态 | 何时出现 | 视觉表现 |
|---|---|---|
| **entering** | 组件首次渲染 | 250ms fade-in + 从下方 16px 滑入（单个组件，非列表项） |
| **idle** | 等待用户操作 | 正常渲染，主 CTA 有呼吸脉冲（opacity 0.9→1，周期 2s） |
| **interacting** | 用户正在操作 | 按钮 disabled + spinner，操作区域高亮边框 |
| **result** | 操作完成 | 反馈区 fade-in + 关键数字 scale-up 弹入 |
| **empty** | payload 数据为空 | EmptyState 组件（已有），但需要改成从组件中心渐入 |
| **error** | 渲染异常 | ErrorBoundary（已有） |

### 3.2 微交互

| 交互 | 动画 | 参数 |
|---|---|---|
| 按钮按下 | scale(0.96) → scale(1) | 150ms, ease-out |
| 卡片选中 | border-color 变化 + 轻微放大 scale(1.02) | 200ms |
| 数值变化 | 数字 scale(1.3) → scale(1) 弹入 | 300ms，spring |
| 结果揭示 | opacity 0→1 + translateY(8px)→0 | 400ms, ease-out |
| 状态切换 | 旧内容 fade-out 150ms → 新内容 fade-in 150ms | 总 300ms |
| 成功反馈 | 绿色边框闪烁 + 正确的卡片轻微发光 | 一次，400ms |
| 失败反馈 | 红色边框抖动（translateX ±4px，2 次） | 300ms |

**不使用** `animate-pulse`（太通用，没有语义）。

### 3.3 可及性底线

- 所有可点击元素 `min-h-11`（44px）
- 所有按钮有 `cursor-pointer`
- 所有图标按钮有 `aria-label`
- 滑块有 `aria-label`
- 色板对比度 ≥ 4.5:1（浅色文本在深色背景上）

---

## 四、内容质量标准（Prompt 侧 / 组件侧）

### 4.1 Payload 字段最少内容量

当前 Prompt 没有"最少写多少"的约束，导致 LLM 输出过短或太空。

| 字段类型 | 最少要求 |
|---|---|
| title | 2-8 字，必须是概念简称 |
| description / quote | ≥ 10 字，包含一个具体场景 |
| insight | ≥ 15 字，包含一个"因为...所以..."因果链 |
| explanation | ≥ 20 字，说明错在哪里 + 正确是什么 |
| 数组字段（cards/events/branches/items） | ≥ 3 项 |
| outcome_description | ≥ 15 字，描述选择后的具体后果 |

### 4.2 反例补充

当前 Prompt 每个 Pattern 只有 1 条"不要这样"。改为至少 2 条——一条针对结构（字段缺失/类型错误），一条针对内容（太空泛/无因果）。

---

## 五、深度切换

当前状态：深度由 LLM 决定并写入 Schema，组件展示 badge 但用户无法切换。

**目标**：每个组件顶部放深度切换条——三个按钮（快懂 / 场景 / 映射），点击触发 `onInteraction` 事件。前端将新 depth + 原 concept 作为新请求发回 API，LLM 重新生成该深度下的 Schema。

不要求组件内部直接切换内容——走完整 API 重新生成，保持 Schema 一致性。

---

## 六、执行优先级

按影响从大到小排列：

| 优先级 | 改什么 | 影响范围 |
|---|---|---|
| **P0** | 3.1 六态覆盖 + 3.2 微交互 | 全部 19 个组件 |
| **P1** | 2.1 Pattern 主色调 + 2.4 圆角统一 | 全部 19 个组件 |
| **P2** | 4.1 Payload 最少内容量约束 | prompt-templates.ts |
| **P3** | 5 深度切换条 | 全部 19 个组件 + page.tsx |
| **P4** | 2.2 字体层级 + 2.3 间距统一 | 全部 19 个组件 |

P0 和 P1 一起做——改色彩和改动画可以同一轮。P2 是 Prompt 工程，可以独立。

---

## 七、给 Codex 的执行指令

1. 先读完本文件和 `src/components/generative-ui/shared.tsx`
2. 在 `shared.tsx` 中加入以下共享模块：
   - `patternColors` 常量（Pattern → 主色映射）
   - `StateTransition` 动画包装组件（处理 entering/exiting 动画）
   - `DepthSwitcher` 深度切换条组件
3. 逐个改造 19 个组件，每完成一个就跑 `npm run build` 验证
4. 全部完成后跑 `npm run typecheck && npm run build`

不要一次改完所有组件再验证——改一个验一个。
