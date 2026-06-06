# 趣灵 aha-flash — 迭代归档

> 文档定位：归档已经完成的开发任务、验收记录和重要修复。新的待办不写在这里，写入 `BACKLOG.md`。

---

## 2026-06-06

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
