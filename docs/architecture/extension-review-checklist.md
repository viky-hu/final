# 扩展性审查清单（extension-review-checklist）

> 用途：每次新增功能或改动行为后，进行“可扩展性与结构稳定性”审查。
> 说明：本清单不是报错检查，而是架构与长期维护检查。

## A. 必填元数据

- 功能名称：
- 需求来源：
- 变更日期：
- 主责文件：
- 协同文件：
- 是否更新 `modules-index.md`：是 / 否

## B. 变更边界

1. 本次功能属于哪个模块？边界是否清晰？
2. 是否跨窗口/跨服务修改？若是，边界如何隔离？
3. 是否引入新状态源？single source of truth 是否明确？

## C. 扩展性审查（必须逐项回答）

1. 新增第 N 个节点时，这套实现是否仍可复用？
2. 新增第 N 种模式（本地/全局/混合）时，是否会导致分支爆炸？
3. 新增字段是否向后兼容（默认值/可选策略）？
4. 是否存在硬编码扩散（常量散落、路径写死、文案写死）？
5. 是否存在重复逻辑，可否当次抽象？
6. 是否有潜在性能风险（全量重算、重复请求、无缓存、阻塞渲染）？
7. 失败与超时路径是否有明确降级与用户反馈？
8. 接口错误是否已做归一化处理（状态码 + 错误结构）？

## D. 必要重构记录

- 本次识别出的结构问题：
- 已实施的重构动作：
- 未处理项（必须说明原因与风险，不允许留空）：

## E. 审查结论

- 结论：通过 / 不通过
- 不通过原因：
- 下一步整改：
- 审查人（AI/人工）：

---

## 审查记录（追加区）

### [模板] YYYY-MM-DD - 功能名
- 主责文件：
- 协同文件：
- 关键扩展性结论：
- 重构动作：
- 风险与后续：

### 2026-04-28 - Window 4 global 联邦聊天链路正式接入
- 主责文件：
  - `apps/main-platform/app/api/federation/ask/route.ts`
  - `apps/main-platform/app/lib/server/federation/central-client.ts`
  - `apps/main-platform/app/windows/main/services/federation-chat-api.ts`
- 协同文件：
  - `apps/main-platform/app/api/federation/health/route.ts`
  - `apps/main-platform/app/lib/server/federation/schemas.ts`
  - `apps/main-platform/app/lib/server/federation/errors.ts`
  - `apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`
  - `central_server.py`
  - `node_server.py`
  - `docs/architecture/modules-index.md`
- 关键扩展性结论：
  - `local/global` 双模式边界保持清晰：仅 `global` 走联邦链路，`local` 保持本地 mock。
  - BFF/服务层/组件分层明确，避免 UI 承担聚合逻辑，后续新增节点或替换中心服务时改动集中在服务层。
  - 错误结构统一为 `code/message/requestId/details`，并在前端保留可解释错误文案，减少分支爆炸。
  - 健康检查新增聚合入口 `/api/federation/health`，支持后续接入更多节点健康探针。
- 重构动作：
  - 抽离重复接口契约到 `schemas.ts`，避免 ask 路由与 client 重复定义。
  - 抽离错误归一化到 `errors.ts`，避免 BFF 各路由重复拼装错误结构。
  - 将联邦调用从组件内联 `fetch` 收敛到 `services/federation-chat-api.ts`，避免组件边界污染。
  - 清理 Python 侧 SM4 硬编码，统一改为环境变量读取。
- 风险与后续：
  - 当前 `local` 仍为 mock 策略，若后续要接真实本地检索需新增独立服务契约，避免与 `global` 链路耦合。
  - 需在部署环境补齐 `FEDERATION_SM4_KEY`、`FEDERATION_CENTRAL_BASE_URL` 等变量，否则服务会快速失败并返回配置错误。
  - 建议后续补充联邦链路限流/鉴权（当前重点为链路打通与错误可观测性）。
