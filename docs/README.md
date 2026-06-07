# 趣灵 aha-flash 文档中心

趣灵是一款 AI 原生交互式知识学习引擎。文档现在只维护少数核心文件，避免产品、规划、设计规范和实现记录互相重复。

## 当前文档

| 文档 | 用途 |
|---|---|
| `PRODUCT.md` | 产品定位、核心体验、功能边界、设计质量标准、当前路线 |
| `TECHNICAL.md` | 技术架构、Schema 协议、状态与对话生命周期、开发验证规则 |
| `CHANGELOG.md` | 已完成任务、验收记录和重要修复 |
| `input-docs/` | 用户后续放入的增量规划文档入口 |

## 增量文档工作流

以后用户新增规划、想法或外部讨论稿时，统一放到 `docs/input-docs/`。

Codex 处理规则：

1. 先读取 `docs/input-docs/` 根目录的新文档。
2. 判断内容是新增规划、旧内容重复，还是只适合归档的想法。
3. 将长期产品变化合并进 `PRODUCT.md`。
4. 将长期技术变化合并进 `TECHNICAL.md`。
5. 将已完成或已采纳的结果写进 `CHANGELOG.md`。
6. 开发前先完成文档整合，再按整合后的文档继续开发。
7. 处理过的输入文档移入 `docs/input-docs/archive/`，根目录只保留待处理输入。

## 历史输入

当前 `docs/input-docs/archive/legacy-2026-06-07/` 中的文件是旧 Epiphany / Round2 / Design Spec 材料，已经按当前判断整合到核心文档。它们只作为历史参考，不再作为最新执行入口。

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
npm run typecheck
npm run build
npm run eval:score
```

没有配置 `DEEPSEEK_API_KEY` 时，应用会使用 mock schema fallback，方便本地演示和开发。
