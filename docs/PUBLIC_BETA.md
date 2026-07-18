# 趣灵公开测试运行手册

日期：2026-07-18

这套公开测试层只负责控制访问、成本、缓存、匿名指标和反馈，不改变 V6 内容生成引擎，也不扩展 V7、RAG、Pattern、账号或社区。

## 1. 三种模式

| `PUBLIC_FLOW_MODE` | 体验 | 模型调用 |
|---|---|---|
| `static` | 五个精选主题可直接完整体验；自由输入禁用 | 0 |
| `invite` | 精选主题 + 有效邀请码动态生成 | 受配额与预算保护 |
| `open` | 精选主题 + 公开动态生成 | 受配额与预算保护 |

动态模式还必须同时满足：

- `DYNAMIC_GENERATION_ENABLED=1`
- 持久化存储可用
- 生产环境存储驱动为 `upstash`

任何条件缺失，服务端都会把有效模式降为 `static`。每日请求已经用完，或剩余 token 不足以完成下一次预留时，配置接口也会直接返回静态模式。前端展示的是服务端返回的有效模式，不信任浏览器开关。

## 2. 持久化与失败策略

本地开发可使用 `PUBLIC_BETA_STORAGE=local`，数据写入 `data/public-beta/store.json`。该目录已加入 `.gitignore`。

生产邀请/开放模式需要 Upstash Redis REST：

```env
PUBLIC_BETA_STORAGE=upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

项目没有把 Vercel `/tmp` 当作生产持久化。外部存储不可用时动态生成 fail closed，精选主题继续可玩；匿名事件和反馈会返回 `accepted:false`，不伪装已保存，也不阻断体验。

## 3. 配额、预算与缓存

- 每日动态请求：`DYNAMIC_DAILY_REQUEST_LIMIT`
- 单匿名客户端窗口额度：`DYNAMIC_CLIENT_WINDOW_LIMIT` / `DYNAMIC_CLIENT_WINDOW_MS`
- 每日 token 预算：`DYNAMIC_DAILY_TOKEN_LIMIT`
- 每次模型调用预留：`DYNAMIC_MODEL_TOKEN_RESERVATION`
- 成功 Flow 缓存：`DYNAMIC_CACHE_TTL_SECONDS`
- 缓存版本：`DYNAMIC_GENERATION_VERSION`

缓存键只保存规范化输入的哈希，不把原始 topic 写入键名。只有无失败且通过 QualityGate 的 Flow 才进入缓存；Prompt、模型原文和调试输出不缓存。

每一次初次调用、重试和修复都会独立预留 token，结束后按 AI SDK 返回的真实用量结算。后台记录调用类型、成功、重试/修复、延迟、token 和估算成本，不保存 Prompt 或模型回答。

预算预检同时用于公开配置接口和两个模型入口。达到全局每日请求上限，或剩余 token 小于单次预留量时，新页面会直接关闭自由输入并保留五条精选路径；并发请求仍会在原子预留处再检查一次。

## 4. 邀请码

```bash
npm run public-beta:admin -- create-invite --label=friend --max-uses=20 --days=14
npm run public-beta:admin -- list-invites
npm run public-beta:admin -- revoke-invite --code=aha_xxx
```

邀请码只保存带 `INVITE_CODE_PEPPER` 的 SHA-256 哈希。明文只在创建时显示一次。过期、撤销或用尽的邀请码会在模型调用前被拒绝。

## 5. 匿名事件与反馈

事件白名单：

```text
page_view, showcase_topic_selected,
dynamic_generation_started/succeeded/failed/blocked,
rate_limited, budget_exhausted, cache_hit,
flow_started, step_interacted, step_completed, flow_completed,
next_topic_clicked, second_flow_started, hub_opened,
feedback_submitted, flow_exited
```

公共事件只接受严格 Schema 字段。禁止发送 topic、自由输入、Prompt、模型输出、API Key、邀请码和反馈正文。反馈正文单独存储，最多 240 字；反馈提交失败不影响 Flow 完成。

`flow_completed` 按匿名用户、会话和 Flow 去重，避免重复渲染或刷新放大完成数。

## 6. 指标访问

`GET /api/admin/metrics` 只接受服务端 Secret：

```bash
curl -H "Authorization: Bearer $ADMIN_METRICS_SECRET" http://localhost:3000/api/admin/metrics
```

端点返回漏斗、逐 Flow 完成、反馈分布、当日模型请求、token、估算成本、延迟、重试、修复、缓存、兜底、限流和预算耗尽。Secret 不允许放入 URL 或前端代码。

## 7. 上线与回滚

上线前：

1. 运行 `npm run test:public-beta`、`npm run typecheck`、`npm run build` 和原有 Eval。
2. 先部署 `static`，确认五条精选路径与事件写入。
3. 配置外部持久化和 Secret。
4. 切换 `invite`，用低额度邀请码做真实模型小流量验证。
5. 只有预算、失败率、P95 和反馈可接受时才考虑 `open`。

紧急回滚只需设置：

```env
PUBLIC_FLOW_MODE=static
DYNAMIC_GENERATION_ENABLED=0
```

本次实现没有修改线上环境变量，也没有部署或发布。

## 8. 环境变量完整清单

所有示例值都在 .env.local.example，不要把真实 Key、邀请码或管理员 Secret 提交到仓库。

| 变量 | 默认/示例 | 作用 |
|---|---|---|
| PUBLIC_FLOW_MODE | static | static / invite / open 三档公开模式 |
| DYNAMIC_GENERATION_ENABLED | 0 | 动态总开关；只有 1 才可能调用模型 |
| PUBLIC_BETA_STORAGE | 本地为 local | local / upstash；生产动态只接受 upstash |
| PUBLIC_BETA_NAMESPACE | aha-flash:public-beta | 持久化键前缀，隔离环境 |
| PUBLIC_BETA_LOCAL_FILE | data/public-beta/store.json | 仅开发环境的本地存储文件 |
| UPSTASH_REDIS_REST_URL | 空 | 生产持久化 REST 地址 |
| UPSTASH_REDIS_REST_TOKEN | 空 | 生产持久化服务端 Token |
| DYNAMIC_DAILY_REQUEST_LIMIT | 20 | UTC 自然日动态生成请求上限 |
| DYNAMIC_DAILY_TOKEN_LIMIT | 200000 | UTC 自然日模型总 token 上限 |
| DYNAMIC_CLIENT_WINDOW_LIMIT | 3 | 单匿名客户端窗口内生成上限 |
| DYNAMIC_CLIENT_WINDOW_MS | 3600000 | 客户端额度窗口毫秒数 |
| DYNAMIC_MODEL_TOKEN_RESERVATION | 10000 | 每次模型调用前预留 token |
| DYNAMIC_CACHE_TTL_SECONDS | 86400 | 成功 Flow 缓存 TTL |
| DYNAMIC_GENERATION_VERSION | v6-public-beta-1 | 缓存版本；生成约束变化时递增 |
| ANALYTICS_CLIENT_WINDOW_LIMIT | 120 | 单客户端事件窗口额度 |
| ANALYTICS_CLIENT_WINDOW_MS | 60000 | 事件额度窗口毫秒数 |
| FEEDBACK_CLIENT_WINDOW_LIMIT | 10 | 单客户端反馈窗口额度 |
| FEEDBACK_CLIENT_WINDOW_MS | 60000 | 反馈额度窗口毫秒数 |
| INVITE_CODE_PEPPER | 空 | 邀请码哈希的服务端 pepper |
| ADMIN_METRICS_SECRET | 空 | 只读指标接口的服务端 Secret |
| MODEL_INPUT_USD_PER_MILLION | 0 | 每百万输入 token 估算单价 |
| MODEL_OUTPUT_USD_PER_MILLION | 0 | 每百万输出 token 估算单价 |
| DEEPSEEK_API_KEY | 空 | 动态模式的模型凭据；静态模式不需要 |
| DEEPSEEK_BASE_URL | https://api.deepseek.com | DeepSeek 兼容端点 |

价格变量只用于估算，不是账单，也没有在代码中写死某家模型价格。

## 9. 启动静态模式

最安全的本地和生产起点都是：

~~~env
PUBLIC_FLOW_MODE=static
DYNAMIC_GENERATION_ENABLED=0
~~~

~~~bash
npm install
npm run dev
~~~

打开 http://localhost:3000/explore。五个精选主题无需 Key；即使环境里意外存在模型 Key，精选 GET 路径和静态自由输入也不会获得模型授权。

## 10. 数据位置与隐私边界

- 浏览器在 localStorage 生成随机 anonymous_user_id，在 sessionStorage 生成随机 session_id；不做账号、跨设备识别或指纹追踪。
- 本地开发数据位于 data/public-beta/store.json。
- 生产动态模式的数据位于配置的 Upstash Redis 命名空间。
- 产品事件最多保留 5000 条；反馈、模型调用和生成运行各最多保留 2000 条；持久化记录 TTL 当前为 90 天。
- 成功动态 Flow 按独立缓存 TTL 保存；失败结果不进入成功缓存。
- 服务端可以用 IP 或 User-Agent 的不可逆哈希做滥用窗口键，但不会把完整 IP 写入事件、反馈或指标。
- Analytics 不记录自由 topic 原文、Prompt、模型原文、邀请码、Key 或 Secret。
- 反馈正文独立保存，最多 240 字，不会自动拼入后续模型提示。

清理当前命名空间的邀请、额度、缓存、事件、反馈和模型记录：

~~~bash
npm run public-beta:admin -- clear --confirm=yes
~~~

本地也可以在服务停止后删除 data/public-beta/store.json。生产清理命令必须使用目标环境的 Upstash 与 namespace 配置，执行前先确认环境。

## 11. 指标定义

第一轮只用 20-30 次有效会话建立基线，不预设行业标准：

1. 开始率 = flow_started 独立用户 / page_view 独立用户。
2. 完成率 = flow_completed 独立用户 / flow_started 独立用户。
3. 连续探索率 = second_flow_started 独立用户 / 首条 flow_completed 独立用户。

报告还提供每关退出计数与退出率、下一话题点击率、Hub 打开率、三档理解反馈、逐 Flow 完成率与平均时长，以及当日模型 token、估算成本、成功/重试/修复/兜底/缓存、平均和 P95 延迟、限流与预算耗尽次数。

## 12. 公开发布前检查

- [ ] PUBLIC_FLOW_MODE=static 且 DYNAMIC_GENERATION_ENABLED=0。
- [ ] 五个精选 Flow 在桌面和手机视口可完成，模型调用为 0。
- [ ] 自由输入在静态模式提前说明不可用，不是提交后才报错。
- [ ] Analytics 与反馈写入目标存储，管理员接口无 Secret 返回 404。
- [ ] npm run typecheck、npm run build、npm run test:public-beta 和全部指定 Eval 通过。
- [ ] 邀请模式前已配置 Upstash、pepper、管理员 Secret、低请求上限与低 token 上限。
- [ ] 创建一个低次数短期邀请码，验证无效、过期、耗尽和预算耗尽都回到静态体验。
- [ ] 检查指标中没有 topic 原文、Prompt、模型原文、完整 IP 或凭据。
- [ ] 记录上线前 namespace；需要回滚时能明确清理对应环境。

## 13. 当前未解决问题

1. 尚未连接真实 Upstash 环境，外部存储的网络、权限和原子脚本需要在预览环境小流量验证。
2. 尚未用邀请模式执行真实 DeepSeek 成本采样；价格变量当前默认 0，报告成本也会是 0。
3. 本轮没有修改线上环境、没有部署，因此线上 Demo 不代表此公开测试分支。
4. 匿名漏斗是轻量基线，不处理跨设备、同一会话重复玩同一 Flow 的复杂归因，也不应被解读为长期留存分析。
