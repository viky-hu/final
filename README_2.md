# 1. final 项目第二阶段 README（后端对接）

## 1.1 文档目的

本文件用于定义本项目第二阶段（后端联调阶段）的统一目标、接口边界、目录规范与实施顺序。

第二阶段开始后，所有“聊天回答生成”能力默认以多节点协同链路为主线推进。

---

## 1.2 项目主旨

本项目核心是：**多节点协同检索 + 聚合裁决回答**。

- 不是把所有节点原始数据直接汇总到单机；
- 而是在查询时由各节点独立检索后返回结果；
- 再由中心聚合层统一裁决，输出交互界面的最终答案。

简化链路：

```text
前端聊天提问
   -> Next.js BFF API
      -> central_server.py (/ask)
         -> 多个 node_server.py (/query)
            -> 各节点返回候选答案
         -> 中心聚合裁决（confidence / 后续可升级为 Judge LLM）
      -> 前端渲染最终回答 + 节点明细
```

---

## 1.3 第一阶段前端成果回顾（详细）

> 本章专门记录第一阶段已完成/已定型的前端资产，作为第二阶段联调基线。

### 1.3.1 总体完成内容

- 已形成多窗口产品形态（登录 / 产品介绍 / 主交互 / 数据库 / 宏观可视化）；
- 已建立前端统一视觉基调与核心交互路径；
- 已具备较完整的本地 mock 交互能力（含聊天、数据库、图谱与宏观联动的展示流）；
- 前端中已有 `app/api/**/route.ts` 模式实践，可直接承接第二阶段 BFF 对接。

### 1.3.2 分窗口前端能力（阶段一）

#### Window 1（登录与注册）

- 完成开场动效与阶段化转场（介绍态 -> 登录态）；
- 已支持登录 / 注册切换流程（含“返回登录”“申请中”状态文案）；
- 已形成阶段化视觉节奏，具备进入主系统的稳定入口。

#### Window 2（宏观可视化）

- 已形成 D1~D5 视图与联动框架；
- 已具备节点选择、板块切换、图表/词云展示等前端展示能力；
- 可作为第二阶段“多节点返回结果可视化”承载层继续扩展。

#### Window 3（数据库）

- 已形成聚类列表 -> 聚类详情 -> 文件管理的完整闭环；
- 已有增删改查 API 调用链（`/api/database/**`）；
- 具备后续接入真实后端存储与权限规则的前端基础。

#### Window 4 （交互对话）

- 完成对话面板主流程（提问、回答、状态切换）；
- 已有模型配置交互入口与相关 API 调用模式；
- 已有“溯源/知识图谱”二级展示路径，为后端真实数据接入预留位。

### 1.3.3 第一阶段沉淀价值（对第二阶段的意义）

- 已具备成熟 UI 容器与交互通路，第二阶段可聚焦后端联调而非重做前端骨架；
- 已有 API 路由与调用习惯，可低成本切到统一 BFF 策略；
- 前端状态管理与窗口流转已可支撑真实后端分步接入与灰度验证。

---

## 1.4 第二阶段目标（后端对接）

### 1.4.1 目标定义

- 将聊天回答从“前端 mock / 本地模拟”切换为“中心 + 节点协同真实链路”；
- 保证回答返回包含主答案与节点明细，支持可解释展示；
- 完成基础健壮性：超时、异常节点降级、错误提示、限流与安全校验。

### 1.4.2 当前后端基线

- `central_server.py`：中心聚合服务，`POST /ask`；
- `node_server.py`：节点服务，`POST /query`，`GET /health`；
- 节点通信采用 SM4 加密字段传输（`encrypted_query` / `encrypted_result`）。

---

## 1.5 Next.js 与 Vercel 官方最佳实践

### 1.5.1 接口文件放置

- 推荐使用 App Router 的 Route Handlers：`app/**/route.ts`；
- 前端统一调用同域 API（`/api/...`），避免前端直接暴露外部后端地址与密钥。

### 1.5.2 BFF（Backend for Frontend）模式

- 对“前端调用外部后端”场景，采用 BFF 最稳妥；
- 在 Route Handler 中进行：参数校验、鉴权、限流、日志、错误归一化，再转发到中心服务；
- 前端仅关注业务字段，不直接承受多后端差异。

### 1.5.3 `proxy.ts` 的使用边界

- `proxy.ts` 更适合全局边界能力：安全头、请求打标、重定向；
- 不建议承载慢查询或复杂业务数据聚合逻辑；
- 业务聚合仍应在 `app/api/**/route.ts` 内实现。

### 1.5.4 安全与配置建议（Vercel）

- API 至少具备：鉴权、输入校验、授权、限流、错误处理；
- 任何密钥不得使用 `NEXT_PUBLIC_*`；
- 可结合 Vercel WAF 或 `@vercel/firewall` 实施路径级/代码级限流。

### 1.5.5 部署架构建议

- Next.js（前端 + BFF）与 Python 多节点服务分离部署；
- 不建议把三台 `uvicorn` 常驻节点直接塞进 Next.js 运行时；
- 推荐独立部署中心与节点（容器/VM/独立服务），Next BFF 通过内网或受控地址访问。

---

## 1.6 建议目录规范（第二阶段）

```text
apps/main-platform/
  app/
    api/
      federation/
        ask/
          route.ts        # 前端统一调用入口（BFF）
        health/
          route.ts        # 联调健康检查（可选）
  lib/
    server/
      federation/
        central-client.ts # 调用 central_server.py
        schemas.ts        # zod/类型校验
        errors.ts         # 错误归一化
  app/windows/main/
    services/
      federation-chat-api.ts # 前端调用封装
```

---

## 1.7 联调执行顺序（建议）

1. 打通 `BFF /api/federation/ask` 到 `central_server.py /ask`；
2. 在 Window 3 聊天面板切换到新接口；
3. 增加超时、失败节点降级与前端错误态；
4. 增加请求日志与 request-id（便于跨服务排障）；
5. 补充限流与安全检查，再做阶段验收。

---

## 1.8 第二阶段验收标准（初版）

- 能稳定返回“聚合答案 + 节点明细”；
- 任一节点故障时，系统仍可部分可用并给出可理解反馈；
- 前端不暴露后端密钥与内网地址；
- Window 3 主流程在真实后端下可完成端到端问答。

---

## 1.9 参考（官方文档）

- Next.js Route Handlers：
  - https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js Backend for Frontend Guide：
  - https://nextjs.org/docs/app/guides/backend-for-frontend
- Next.js Proxy（`proxy.ts`）说明：
  - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Vercel Next.js 与安全实践：
  - https://vercel.com/docs/frameworks/full-stack/nextjs
  - https://vercel.com/academy/nextjs-foundations/security-review-apis-and-config
  - https://vercel.com/kb/guide/add-rate-limiting-vercel

# 2. 节点通信

## 2.1 本次会话代码操作总览

本节按**实际执行顺序**完整记录本次聊天中所有代码相关操作（含检索/读取、文件新增、文件修改、验证命令、临时产物清理）。

---

## 2.2 规划阶段操作（未改业务代码）

### 2.2.1 代码检索与上下文读取（只读）

1. 全局检索前端聊天链路、`central_server.py`、`node_server.py` 现状与调用关系。
2. 检索并读取规则文件（`AGENTS.md`）：
   - 仓库根 `AGENTS.md`
   - `apps/main-platform/AGENTS.md`
   - `apps/main-platform/app/api/AGENTS.md`
   - `apps/main-platform/app/windows/main/AGENTS.md`
3. 读取架构文档现状：
   - `docs/architecture/modules-index.md`
   - `docs/architecture/extension-review-checklist.md`
4. 检索并确认联邦 BFF 目录尚未落地（`app/api/federation/**` 不存在）。
5. 读取核心业务文件确认接入点：
   - `apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`
   - `apps/main-platform/app/windows/main/MainWindow.tsx`
   - `apps/main-platform/app/api/model-config/connect/route.ts`
   - `README_2.md`、`README.md`

### 2.2.2 计划文件操作（规划产物）

6. 新建计划文件：
   - `c:\Users\Admin\.windsurf\plans\federation-chat-contract-freeze-plan-8907e4.md`
7. 根据用户 6 项确认决策，更新计划文件第 F 节（由“待确认”改为“已冻结决策”）。
8. 执行 `exitplanmode`，进入实施阶段。

---

## 2.3 实施阶段：新增文件

### 2.3.1 Next.js 服务层（federation）

1. 新增 `apps/main-platform/app/lib/server/federation/schemas.ts`
   - 定义联邦请求/响应 schema：`FederationAskRequestSchema`、`CentralAskResponseSchema`、`FederationAskResponseSchema`。
   - 定义节点明细类型与错误体结构。

2. 新增 `apps/main-platform/app/lib/server/federation/errors.ts`
   - 新增 `FederationHttpError`。
   - 提供 `toFederationErrorResponse()` 做错误归一化（`code/message/requestId/details`）。

3. 新增 `apps/main-platform/app/lib/server/federation/central-client.ts`
   - 实现 `askCentral()`：调用中心服务 `/ask`，处理超时、上游错误、响应校验。
   - 实现 `checkCentralHealth()`：调用中心服务 `/health`，返回规范健康结构。
   - 支持环境变量：`FEDERATION_CENTRAL_BASE_URL`、`FEDERATION_CENTRAL_TIMEOUT_MS`、`FEDERATION_CENTRAL_HEALTH_TIMEOUT_MS`。

### 2.3.2 Next.js BFF 路由

4. 新增 `apps/main-platform/app/api/federation/ask/route.ts`
   - 落地 `POST /api/federation/ask`。
   - 处理请求解析、schema 校验、`request-id` 透传、错误归一化、日志。

5. 新增 `apps/main-platform/app/api/federation/health/route.ts`
   - 落地 `GET /api/federation/health`。
   - 聚合中心健康 + 可选节点直连健康（`FEDERATION_NODE_HEALTH_URLS`）。

### 2.3.3 前端调用封装

6. 新增 `apps/main-platform/app/windows/main/services/federation-chat-api.ts`
   - 封装 `askFederationChat()`。
   - 定义 `FederationChatError`。
   - 统一解析成功/失败 payload，前端只消费稳定结构。

### 2.3.4 环境变量示例

7. 新增 `apps/main-platform/.env.example`
   - 给出联邦链路所需环境变量模板：
     - `FEDERATION_CENTRAL_BASE_URL`
     - `FEDERATION_CENTRAL_TIMEOUT_MS`
     - `FEDERATION_CENTRAL_HEALTH_TIMEOUT_MS`
     - `FEDERATION_NODE_HEALTH_URLS`（可选）
     - `FEDERATION_NODE_TIMEOUT_MS`
     - `FEDERATION_SM4_KEY`

---

## 2.4 实施阶段：修改文件

### 2.4.1 前端聊天主链路

1. 修改 `apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`
   - 新增 `askFederationChat`、`FederationChatError` 引入。
   - 新增 `buildFederationReplyText()`：格式化主答案、节点明细、请求 ID。
   - 新增 `buildFederationErrorReply()`：归一化联邦异常文案。
   - 改造 `handleSend()`：
     - `global` 模式走 `askFederationChat()`；
     - `local` 模式保留 `resolveMockReply()`；
     - 保留原有思考延迟 + 流式输出动画。

### 2.4.2 Python 中心服务

2. 修改 `central_server.py`
   - 新增 `load_sm4_key()`：改为环境变量 `FEDERATION_SM4_KEY`。
   - 新增 `resolve_node_timeout_seconds()`：读取 `FEDERATION_NODE_TIMEOUT_MS`（默认 8000ms）。
   - `AskResponse` 增加字段：`status`、`request_id`。
   - 新增 `resolve_status()`：统一 `ok/partial/error` 语义。
   - 修改 `POST /ask`：
     - 接收并透传 `x-request-id`（无则生成 UUID）；
     - 向节点请求时附加 `x-request-id`；
     - 返回 `status + request_id`。
   - 新增 `GET /health`：并发探测各节点 `/health` 并返回聚合状态。

### 2.4.3 Python 节点服务

3. 修改 `node_server.py`
   - 新增 `load_sm4_key()`：改为环境变量 `FEDERATION_SM4_KEY`。
   - 新增 `normalize_node_id()`：统一 `node_a -> nodea`，避免知识表 key 不匹配。
   - 修改 `POST /query`：读取 `x-request-id` 并打印节点日志。

### 2.4.4 联邦服务层二次收敛（当次重构）

4. 二次修改 `apps/main-platform/app/lib/server/federation/central-client.ts`
   - 将 `askCentral()` 的 `requestId` 参数显式为 `string`，修复类型约束。
   - `checkCentralHealth()` 从中心 `/health` 读取状态。
   - 成功响应优先使用中心返回的 `request_id`。
   - 去掉 `z.treeifyError` 依赖，改为稳定 `result.error.issues`。

5. 二次修改 `apps/main-platform/app/api/federation/health/route.ts`
   - 新增 `extractCentralNodeResults()`。
   - 合并“中心返回节点健康”与“可选直连节点健康”，去重后统一输出。

### 2.4.5 架构文档同步（职责变化强制更新）

6. 修改 `docs/architecture/modules-index.md`
   - 补充联邦 BFF（`ask/health`）已落地。
   - 补充服务层 `federation` 目录职责。
   - 补充 Window4 前端调用封装职责（仅 `global` 走联邦）。

7. 修改 `docs/architecture/extension-review-checklist.md`
   - 追加 `2026-04-28 - Window 4 global 联邦聊天链路正式接入` 审查记录。
   - 记录主责/协同文件、扩展性结论、重构动作、风险与后续。

---

## 2.5 验证与质量检查操作

1. TypeScript 编译校验（多次执行）：
   - `pnpm --filter main-platform exec tsc --noEmit`
   - 结果：通过。

2. Python 语法校验（多次执行）：
   - `python -m py_compile central_server.py node_server.py`
   - 结果：通过。

3. 变更核对：
   - 执行 `git status --short` 检查最终变更集。

4. 临时产物清理：
   - 删除 `__pycache__/`。
   - 恢复 `apps/main-platform/tsconfig.tsbuildinfo`，避免将编译缓存纳入业务改动。

---

## 2.6 本次会话最终代码变更清单（落盘）

### 新增文件

- `apps/main-platform/.env.example`
- `apps/main-platform/app/api/federation/ask/route.ts`
- `apps/main-platform/app/api/federation/health/route.ts`
- `apps/main-platform/app/lib/server/federation/central-client.ts`
- `apps/main-platform/app/lib/server/federation/errors.ts`
- `apps/main-platform/app/lib/server/federation/schemas.ts`
- `apps/main-platform/app/windows/main/services/federation-chat-api.ts`

### 修改文件

- `apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`
- `central_server.py`
- `node_server.py`
- `docs/architecture/modules-index.md`
- `docs/architecture/extension-review-checklist.md`

### 规划阶段产物（非业务运行代码）

- `c:\Users\Admin\.windsurf\plans\federation-chat-contract-freeze-plan-8907e4.md`（创建 + 更新）

# 3. 历史记录

我们将要改变交互对话页面布局，新增查看历史会话记录功能

## 3.1 当前页面状态

整个交互对话页面目前大致看作三个部分
1、位于整个窗口顶部的长条导航栏
导航栏往下面：
2、点阵状背景，与鼠标位置有交互动画
3、由四条线条GSAP绘制，并动态展开扩大的SVG矩形画布
4、