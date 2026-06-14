# 趣灵 aha-flash 文档中心

趣灵当前以 V5 自由生成 Flow 模式对外展示：一个链接打开后，用户可以输入任意知识点，选择 AI 推荐或指定 Pattern，生成三关互动 Flow；三条精选 topic 保留为稳定示例入口。文档只保留核心事实，避免规划稿、产品说明和实现记录互相重复。

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
| `/explore` | 自由生成主入口：输入任意 topic、选择 AI 推荐或 10 类 Pattern；三条精选 topic 作为示例起点 |
| `/flow/[flowId]` | 全屏三关精选 Flow，当前稳定示例为 `bayes-starter`、`industrial-revolution`、`inflation-deflation` |
| `/flow/custom` | 播放 sessionStorage 中的动态生成 Flow，缺失草稿时引导回 `/explore` 重新生成 |
| `/hub` | 轻量个人图鉴，展示本机完成记录和快速回顾 |
| `/studio` | 内部生成工作台 / 技术验证入口，不作为公开主体验 |
| `/sandbox` | 旧知识沙盒兼容入口，不在公开主导航强调 |

常用验证：

```bash
npm run typecheck
npm run build
npm run eval:score
npm run eval:flow
npm run eval:flow-dynamic
```

没有配置 `DEEPSEEK_API_KEY` 时，应用会使用 mock fallback：动态输入会生成按用户 topic 包装的通用三关 Flow，三条精选示例也仍可完整走完。
<!-- DOCS_STATUS_START -->
## 当前状态速览（2026-06-13）
- V5 主入口已从“3 个固定 topic 作品集”升级为“首页自由输入任意知识 -> AI 生成三关 Flow -> 完成后继续选择分支”。
- `/explore` 现在提供自由输入框和 Pattern 选择器：默认 `AI 推荐`，也可手选 10 类 Pattern；三张精选卡片保留为示例起点。
- 真实 AI 主链路已打通：`/studio` 调用 `/api/chat` 生成单组件；`/api/flow` 的 `GET` 支持三条 showcase Flow，`POST` 支持任意 topic 动态 Flow。
- 动态 Flow 只保存在当前浏览器会话：Explore 写入 sessionStorage，`/flow/custom?draftId=...` 播放；完成记录继续写入 Hub localStorage。
- mock 边界已调整：无 API key 或 LLM 失败时，动态 Flow 回退为“按用户 topic 包装的通用 fallback Flow”，不再固定退回贝叶斯/工业革命/通胀。
- 当前未做：账号、数据库、跨设备同步、真实社区发布、审核后台、真实埋点和生产级持久化。
- `npm run eval:flow-dynamic` 覆盖无 API key 时的动态 fallback：任意 topic 仍生成 `custom-*` 三关 Flow，手选 Pattern 必须进入关卡链。
<!-- DOCS_STATUS_END -->
