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

### 2026-05-10 - Window 4 画布竖线统一右移 +100（历史记录栏扩展预备）
- 主责文件：
  - `apps/main-platform/app/windows/shared/coords.ts`（新增 `CANVAS_X_SHIFT=100`，应用于 MAIN_CANVAS/MC_CANVAS 全部三态 x1/x2）
  - `apps/main-platform/app/styles/window-3-main.css`（CSS 变量 fallback 更新为 32%/18%；`.mc-panel-layer` 从 `inset:0` 改为 `--w4-canvas-left/right` 约束，修正模型配置面板内容未跟随右移的结构性问题）
- 协同文件：
  - `apps/main-platform/app/windows/main/components/ChatCanvasLines.tsx`（消费坐标常量，无需改动）
  - `apps/main-platform/app/windows/main/components/ModelConfigCanvasLines.tsx`（消费坐标常量，无需改动）
  - `apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`（`svgToCssPx`/`svgShiftPx` 自动推导，无需改动）
- 关键扩展性结论：
  - `CANVAS_X_SHIFT` 作为统一右移 token，后续再次调整只改一个常量，六组坐标状态与 HTML 覆盖层自动同步。
  - 修正了 `.mc-panel-layer` 原始设计缺陷：以 `inset:0` 独立于坐标系统定位，导致坐标变化时模型配置内容不跟随。改为与 `.chat-interaction-panel` 同样的 `--w4-canvas-left/right` 约束，使两层画布内容完全一致地响应坐标偏移。
  - GSAP 菜单位移 `svgShiftPx(EXPANDED → MENU_OPEN)` 计算逻辑保持不变，因为两个常量均已应用 `CANVAS_X_SHIFT`，差值结论不变。
- 重构动作：
  - `.mc-panel-layer` 定位机制纳入坐标驱动体系，消除与信息流层的结构性分叉。
- 风险与后续：
  - CSS 变量 fallback（32%/18%）为 SSR 安全兜底，JS 初始化后立即由 ResizeObserver 精确值覆盖，无视觉跳变。
  - 历史记录栏接入时只需调整 `CANVAS_X_SHIFT`（或直接修改各状态坐标），两层画布及其内容均自动跟随，不需要再次散改 CSS。
  - 需在部署环境补齐 `FEDERATION_SM4_KEY`、`FEDERATION_CENTRAL_BASE_URL` 等变量，否则服务会快速失败并返回配置错误。
  - 建议后续补充联邦链路限流/鉴权（当前重点为链路打通与错误可观测性）。

### 2026-05-10 - Window 4 实时坐标驱动布局重构（预备历史记录栏扩展底座）
- 主责文件：
  - `apps/main-platform/app/windows/shared/coords.ts`（新增 `svgToCssPx`、`svgShiftPx` 纯函数）
  - `apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`（新增 layerRef + ResizeObserver + CSS 变量写入，替换 -15vw 魔法值）
  - `apps/main-platform/app/styles/window-3-main.css`（`.chat-interaction-panel` left/right 改 CSS 变量，`.mc-canvas-close-anchor` right 改 CSS 变量）
- 协同文件：
  - `apps/main-platform/app/windows/main/components/ChatCanvasLines.tsx`（共享同一 coords 常量，无需改动）
  - `apps/main-platform/app/windows/main/components/ModelConfigCanvasLines.tsx`（共享同一 coords 常量，无需改动）
- 关键扩展性结论：
  - `svgToCssPx`/`svgShiftPx` 为纯函数，坐标来源唯一（`coords.ts`），后续修改 `MAIN_CANVAS_EXPANDED` 等常量可自动传播到 HTML 层。
  - CSS 变量以 `--w4-canvas-*` 命名前缀隔离，不污染其他窗口，新增历史记录栏只需更改坐标常量即可驱动位置。
  - `preserveAspectRatio="xMidYMid slice"` 映射已统一到 `svgToCssPx`，支持任意缩放级别（已对 125% 缩放验证数学等价性）。
  - 菜单联动 GSAP 位移改为 `svgShiftPx` 计算，消除 `-15vw` 硬编码，后续平移量可直接通过修改坐标常量自动推导。
- 重构动作：
  - 将 SVG→CSS 坐标换算逻辑收归到 `shared/coords.ts`，避免各消费方重复实现。
  - CSS 变量 fallback 保留为 `25%`，确保 SSR 首帧无视觉跳变。
  - 小屏响应式断点保留原始 `left: 8%; right: 8%` 覆盖，不影响窄屏行为。
- 风险与后续：
  - `menuOpen` 当前在 `MainWindow.tsx` 中始终为 `false`（菜单功能未开放），坐标驱动位移逻辑已就绪但暂未实际触发，待菜单开放时需端到端回归验收。
  - 历史记录栏接入时，只需修改 `MAIN_CANVAS_EXPANDED.x1/x2` 等坐标常量，HTML 层定位将自动跟随，不需要再次散改 CSS 百分比。
