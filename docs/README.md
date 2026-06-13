# 趣灵 aha-flash 文档中心

趣灵当前以 V5 作品集模式对外展示：一个链接打开后，面试官能在 3 分钟内看到 3 个精选 topic、完整三关 Flow 和 Hub 完成记录。文档只保留核心事实，避免规划稿、产品说明和实现记录互相重复。

## 当前文档

| 文档 | 用途 |
|---|---|
| `PRODUCT.md` | 当前产品定位、作品集体验、功能边界、设计质量标准和 V1 路线 |
| `TECHNICAL.md` | 技术架构、V5 路由、Flow 数据模型、Schema 协议、验证规则 |
| `CHANGELOG.md` | 已完成任务、验收记录和重要修复 |
| `input-docs/README.md` | 后续增量规划文档的放置和处理规则 |

## 增量文档工作流

以后用户新增规划、想法或外部讨论稿时，统一放到 `docs/input-docs/`。处理规则：

1. 先读取 `docs/input-docs/` 根目录的新文档。
2. 判断内容是新增规划、旧内容重复，还是只适合归档的想法。
3. 将长期产品变化合并进 `PRODUCT.md`。
4. 将长期技术变化合并进 `TECHNICAL.md`。
5. 将已完成或已采纳的结果写进 `CHANGELOG.md`。
6. 开发前先完成文档整合，再按整合后的文档继续开发。
7. 已整合、重复或过期的输入文档直接删除；只有仍有独立追溯价值的材料才放入 `docs/input-docs/archive/`。

## 快速开始

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

当前公开体验路径：

| 路由 | 用途 |
|---|---|
| `/` | 默认跳转 `/explore` |
| `/explore` | 作品集首页，固定展示 3 个精选 topic 和 Hub 入口 |
| `/flow/[flowId]` | 全屏三关 Flow，当前展示 topic 为 `bayes-starter`、`industrial-revolution`、`inflation-deflation` |
| `/hub` | 轻量个人图鉴，展示本机完成记录和快速回顾 |
| `/studio` | 内部生成工作台 / 技术验证入口，不作为公开主体验 |
| `/sandbox` | 旧知识沙盒兼容入口，不在公开主导航强调 |

常用验证：

```bash
npm run typecheck
npm run build
npm run eval:score
npm run eval:flow
```

没有配置 `DEEPSEEK_API_KEY` 时，应用会使用 mock fallback，公开作品集三条 Flow 仍可完整走完。
<!-- DOCS_STATUS_START -->
## 当前状态速览（2026-06-13）

- V5 V1 作品集体验已完成：`/explore` 选起点，`/flow/[flowId]` 完成三关并选择下一步分支，`/hub` 查看走过的路径。
- 真实 AI 主链路已打通：`/studio` 调用 `/api/chat`，showcase Flow 调用 `/api/flow`。
- 稳定 mock 边界已明确：Explore 列表、follow-up 分支、非 showcase Flow、视觉资源和 Hub 本地记录仍以静态/本地数据保证演示稳定。
- 当前未完成项不属于 V5 V1：账号、多设备同步、生产数据库、真实社区发布、审核后台、真实埋点和 T38 API Key 额度方案。
- `docs/input-docs/input.md` 是用户指定的持续输入文档，保留；`docs/input-docs/SKILL.md` 是前端设计参考，保留。
<!-- DOCS_STATUS_END -->