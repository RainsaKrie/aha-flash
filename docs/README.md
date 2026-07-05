# 趣灵文档中心

当前展示版本：V6 MVP。

趣灵的主线已经收束为 AI 知识轻消费产品：用户输入或选择一个概念，系统生成 3-5 分钟的互动知识挑战；五个精选 topic 只作为稳定示例入口。V7 只作为后续质量护栏，不是近期完整开发主线。

## 必读文档

| 文档 | 用途 |
|---|---|
| `MVP_SCOPE.md` | 当前 MVP 边界、四周收束计划、不做清单和验证概念 |
| `PRODUCT.md` | 产品定位、目标用户、体验闭环、页面结构和互动组件质量标准 |
| `TECHNICAL.md` | 技术架构、动态 Flow 链路、Structure Skill、QualityGate 和 Eval |
| `CHANGELOG.md` | 已完成任务、验证记录和关键修复 |
| `knowledge-skills/` | 8 类通用 Structure Skill 的教学合约与 Eval 资产 |
| `input-docs/PRODUCT_V7.md` | V7 质量护栏规划，暂不作为近期主开发线 |

## 当前口径

- 当前可展示版本：V6 MVP。
- 近期目标：趣灵 MVP 公开展示和作品集化。
- V7：质量护栏和后续增强，不作为四周主线。
- 主体验：Explore 自由输入 -> 生成阶段 -> 四步路径预览 -> Flow 闯关 -> 后续分支 -> Hub 回顾。
- 五个稳定示例：贝叶斯定理、DNS 解析、期权风险、工业革命、通胀与通缩。
- 动态测试重点：线性规划、复利效应、沉没成本、边际效用、缓存机制、监督学习 vs 无监督学习、操作系统进程、供需曲线、因果推断、资本主义 vs 社会主义。

## 增量文档工作流

后续新规划、想法或外部讨论稿先放入 `docs/input-docs/`。处理规则：

1. 先判断是否服务当前趣灵 MVP 闭环。
2. 能服务闭环的内容合并进 `PRODUCT.md`、`TECHNICAL.md`、`MVP_SCOPE.md` 或 `CHANGELOG.md`。
3. 长期有效但不属于近期开发的内容归为后续质量护栏或远期规划。
4. 已整合、重复或过期的输入文档直接删除；只有仍有独立追溯价值的材料才放入 archive。

## 快速开始

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

常用验证：

```bash
npm run lint
npm run typecheck
npm run build
npm run eval:score
npm run eval:flow
npm run eval:blueprint
npm run eval:skills
```

真实 LLM 链路验证：

```bash
npm run eval:flow-live -- --limit=8 --runs=3 --strict --threshold=1
```

## 四周不做

不做账号、数据库、多设备同步、社区、排行榜、UGC、创作者后台、长期知识图谱、Always-on RAG、内部 Wiki、大规模 EvidencePack、付费商业化，也不为每个具体概念创建专用 Skill。
