# 趣灵 aha-flash — 迭代归档

> 文档定位：归档已经完成的开发任务、验收记录和重要修复。新的待办不写在这里，写入 `BACKLOG.md`。

---

## 2026-06-06

### Phase 5 — 外部集成

完成 T13-T14：联网搜索 Tool 与 source-router 调整。

新增：
- `web_search` tool
- Tavily Search API 集成
- `TAVILY_API_KEY` 环境变量
- 纯文本外部信息请求的搜索触发规则
- 聊天消息来源展示支持“搜索”

行为：
- 输入包含 URL 时，继续走 `web_content_extract` 或 `youtube_transcript_fetch`。
- 输入不含 URL、但包含“最新/最近/当前/新闻/看法/观点/价格/政策/巴菲特”等外部信息信号时，触发 `web_search`。
- 搜索结果只作为 Prompt 上下文注入，不写入长期状态，不保存全文。
- 未配置 `TAVILY_API_KEY` 时返回可控失败，并在聊天来源中显示“读取失败 · 搜索”。

验收：
- `/api/tools` 调用 `web_search` 在无 key 时返回 `TAVILY_API_KEY is not configured`，不报 500。
- `/api/chat` 输入“巴菲特对期权的最新看法”会返回 `sources[0].type = "search"`。
- `/api/chat` 输入 URL 时返回 `type = "web"`，不误触发 search。
- 页面提交搜索类问题后，聊天消息展示“读取失败 · 搜索 · 巴菲特对期权的最新看法”。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测
- Playwright 生产服务页面快照验收

### Phase 4 — 知识沙盒体系

完成 T09：知识资产存储。

新增：
- `UserState.knowledge_assets`
- `KnowledgeAsset` 类型
- `stateStore.addKnowledgeAsset()`
- `/api/chat` 在知识类对话生成后写入概念资产
- System Prompt 注入最近知识资产
- 首页侧栏展示已学概念数量和最近概念

验收：
- 输入“期权是什么？用我能听懂的方式讲。”后，状态写入 `concept: "期权"`。
- 重复学习同一概念时，`knowledge_assets` 数量保持 1，旧资产被覆盖。
- 页面侧栏从“已学 0”更新为“已学 1”，并展示“期权”。
- 泛化表达“我能听懂的方式”不再被写入 `metaphor_preferences`。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测和 Playwright 页面快照验收

完成 T10：知识链推荐。

新增：
- Schema 支持可选 `next_concepts`
- Zod 校验支持 V1/V2 推荐链字段
- Prompt 输出规范要求知识讲解类请求给出 1-2 个后续概念
- 期权 mock 示例推荐“期货”和“保险”
- 首页工作台在组件下方展示“下一步”推荐卡片
- 点击推荐卡片会带着关系说明触发下一轮学习

验收：
- 输入“期权是什么？用我能听懂的方式讲。”后，工作台底部显示“期货”“保险”。
- 点击“期货”后触发下一轮学习，对话中出现“期货是什么？它和刚才的关系是...”。
- 用户状态中已学概念从“期权”更新为“期货、期权”。

验证：
- `npm run typecheck`
- `npm run build`
- API 复测
- Playwright 生产服务页面快照验收

完成 T12：`/sandbox` 知识沙盒页面。

新增：
- `src/app/sandbox/page.tsx`
- 首页状态面板新增“知识沙盒”入口
- 沙盒页读取当前匿名用户状态
- 已学概念按 `topic_area` 分组展示
- 概念卡片展示 concept、pattern、template、理解深度和学习时间
- 沙盒页统计已学概念数、覆盖的交互模式数和深入理解数量

验收：
- 通过 `/api/chat` 生成“期权”“算法复杂度”“沉没成本”三个知识资产。
- 进入 `/sandbox` 后可看到 3 张概念卡片。
- 卡片展示 pattern、template、理解深度。
- 页面按“金融”“认知”等主题分组展示。
- 首页状态面板可看到并进入“知识沙盒”入口。

验证：
- `npm run typecheck`
- `npm run build`
- Playwright 生产服务页面快照验收

完成 T11：深度分级。

新增：
- Schema 支持顶层 `depth: rapid | scenario | mapping`
- `/api/chat` 接收 `depth`，并注入 Prompt 的 `<target_depth>`
- 首页输入区新增“快懂 / 场景 / 映射”三段深度切换
- 首页状态面板展示当前输出深度
- `probability` 期权示例按三档生成不同标题、说明、交互目标和反馈文案
- `narrative_branch` 沉没成本示例按三档生成不同开场、分支目标和洞察文案
- 知识资产理解深度按 `rapid -> shallow`、`scenario -> moderate`、`mapping -> deep` 写入

验收：
- 同一“期权”输入在三档下返回不同标题和不同交互目标。
- 同一“沉没成本”输入在三档下返回不同开场长度、分支洞察和理解深度。
- 页面切到“映射”后生成期权，工作台显示“期权 · 隐喻映射版”和“目标：把抽卡动作逐项对应到期权原理。”
- 状态摘要和知识资产深度与当前 depth 保持一致。

验证：
- `npm run typecheck`
- `npm run build`
- API 三档复测
- Playwright 生产服务页面快照验收

### Phase 6 — 质量体系

完成 T15-T17：测试用例集、Schema 评分脚本、Prompt 对比工具。

新增：
- `tests/fixtures/test-cases.json`
- `tests/eval/lib.ts`
- `tests/eval/score.ts`
- `tests/eval/compare.ts`
- `npm run eval:score`
- `npm run eval:compare`

覆盖：
- 14 条固定 case
- 全部 10 个 Pattern
- `rapid/scenario/mapping` 三档深度
- `knowledge/preference/casual` 三类意图

评分维度：
- JSON 合法率
- Pattern 准确率
- Template 准确率
- Depth 准确率
- Route 准确率
- 隐喻关键词贴合度
- Payload 完整度

验收：
- `npm run eval:score` 默认输出摘要，mock 基线总分为 1。
- `npm run eval:score -- --json` 可输出完整逐 case JSON。
- `npm run eval:compare -- <baseline.json> <candidate.json>` 可比较两个预测文件。
- compare 工具兼容 Windows UTF-8 BOM 临时文件。

验证：
- `npm run eval:score`
- `npm run eval:compare -- <temp-baseline.json> <temp-candidate.json>`
- `npm run typecheck`
- `npm run build`

---

## 2026-06-05

### 项目命名与仓库

- 中文名确定为“趣灵”。
- 英文名和仓库名确定为 `aha-flash`。
- 初始化 Git 仓库并推送到 GitHub：`https://github.com/RainsaKrie/aha-flash.git`。

### Phase 1 — Stateful Memory

完成：
- T01 LLM 语义意图分类
- T02 `update_user_state` Tool
- T03 回合制状态提炼

验收：
- “期权是什么”归类为 `knowledge`。
- “我是会计，爱钓鱼，之后用钓鱼讲金融概念”归类为 `preference`。
- 用户状态可写入背景、爱好、知识盲区和隐喻偏好。

### Phase 2 — Schema 协议重构

完成：
- T04 Schema 三层类型定义
- T05 Prompt 模板重写
- T06 组件注册表升级

结果：
- 新协议为 `pattern + template + payload`。
- V1 flat schema 仍兼容。
- 注册表支持二维查找。

验收：
- “算法复杂度是什么？用滑块让我感受一下。”返回 `parameter_explore/single_slider`。
- 页面侧栏显示 `parameter_explore/single_slider`，工作台渲染滑块组件。

### Phase 3 — 交互模式扩展

完成 T07：新增 3 种交互模式。

新增：
- `narrative_branch/branch_story`
- `classification_sort/category_buckets`
- `simulation_play/parameter_simulation`

验收：
- “沉没成本是什么意思？用一个分支故事讲。”返回 `narrative_branch/branch_story`。
- “价值投资和成长投资怎么分？让我做分类。”返回 `classification_sort/category_buckets`。
- “复利怎么滚起来的？做一个模拟推演。”返回 `simulation_play/parameter_simulation`。
- 页面点击“复利”可渲染滚雪球模拟组件。

完成 T08：既有 7 种模式各新增 1 个骨架变体。

新增：
- `probability/spin_wheel`
- `parameter_explore/dual_slider`
- `concept_memory/grid_match`
- `process_timeline/vertical_scroll`
- `comparison/overlay_fade`
- `knowledge_check/combo_chain`
- `system_builder/flow_connect`

验收：
- 七个变体输入均能通过 `/api/chat` 返回预期 template。
- 页面输入“股票和期权有什么区别？用叠加淡入对比。”可渲染 `comparison/overlay_fade`。

### 部署修复

问题：
- Vercel 部署页打开后显示“状态初始化失败”。

原因：
- 早期状态存储写入 `process.cwd()/data/states`。
- Vercel Serverless 运行时不能写项目目录。

修复：
- 本地开发继续写 `data/states`。
- Vercel demo 写 `/tmp/aha-flash/states`。
- 新增 `AHA_FLASH_STATE_DIR` 覆盖入口。

注意：
- `/tmp` 不提供长期持久化。
- 生产记忆应迁移到 Vercel KV、Postgres、Redis 或其他数据库。
