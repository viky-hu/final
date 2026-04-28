# final 项目第二阶段 README（后端对接）

## 一、文档目的

本文件用于定义本项目第二阶段（后端联调阶段）的统一目标、接口边界、目录规范与实施顺序。

第二阶段开始后，所有“聊天回答生成”能力默认以多节点协同链路为主线推进。

---

## 二、项目主旨

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

## 三、第一阶段前端成果回顾（详细）

> 本章专门记录第一阶段已完成/已定型的前端资产，作为第二阶段联调基线。

### 3.1 总体完成内容

- 已形成多窗口产品形态（登录 / 产品介绍 / 主交互 / 数据库 / 宏观可视化）；
- 已建立前端统一视觉基调与核心交互路径；
- 已具备较完整的本地 mock 交互能力（含聊天、数据库、图谱与宏观联动的展示流）；
- 前端中已有 `app/api/**/route.ts` 模式实践，可直接承接第二阶段 BFF 对接。

### 3.2 分窗口前端能力（阶段一）

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

### 3.3 第一阶段沉淀价值（对第二阶段的意义）

- 已具备成熟 UI 容器与交互通路，第二阶段可聚焦后端联调而非重做前端骨架；
- 已有 API 路由与调用习惯，可低成本切到统一 BFF 策略；
- 前端状态管理与窗口流转已可支撑真实后端分步接入与灰度验证。

---

## 四、第二阶段目标（后端对接）

### 4.1 目标定义

- 将聊天回答从“前端 mock / 本地模拟”切换为“中心 + 节点协同真实链路”；
- 保证回答返回包含主答案与节点明细，支持可解释展示；
- 完成基础健壮性：超时、异常节点降级、错误提示、限流与安全校验。

### 4.2 当前后端基线

- `central_server.py`：中心聚合服务，`POST /ask`；
- `node_server.py`：节点服务，`POST /query`，`GET /health`；
- 节点通信采用 SM4 加密字段传输（`encrypted_query` / `encrypted_result`）。

---

## 五、Next.js 与 Vercel 官方最佳实践（对接落地）

### 5.1 接口文件放置

- 推荐使用 App Router 的 Route Handlers：`app/**/route.ts`；
- 前端统一调用同域 API（`/api/...`），避免前端直接暴露外部后端地址与密钥。

### 5.2 BFF（Backend for Frontend）模式

- 对“前端调用外部后端”场景，采用 BFF 最稳妥；
- 在 Route Handler 中进行：参数校验、鉴权、限流、日志、错误归一化，再转发到中心服务；
- 前端仅关注业务字段，不直接承受多后端差异。

### 5.3 `proxy.ts` 的使用边界

- `proxy.ts` 更适合全局边界能力：安全头、请求打标、重定向；
- 不建议承载慢查询或复杂业务数据聚合逻辑；
- 业务聚合仍应在 `app/api/**/route.ts` 内实现。

### 5.4 安全与配置建议（Vercel）

- API 至少具备：鉴权、输入校验、授权、限流、错误处理；
- 任何密钥不得使用 `NEXT_PUBLIC_*`；
- 可结合 Vercel WAF 或 `@vercel/firewall` 实施路径级/代码级限流。

### 5.5 部署架构建议

- Next.js（前端 + BFF）与 Python 多节点服务分离部署；
- 不建议把三台 `uvicorn` 常驻节点直接塞进 Next.js 运行时；
- 推荐独立部署中心与节点（容器/VM/独立服务），Next BFF 通过内网或受控地址访问。

---

## 六、建议目录规范（第二阶段）

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

## 七、联调执行顺序（建议）

1. 打通 `BFF /api/federation/ask` 到 `central_server.py /ask`；
2. 在 Window 3 聊天面板切换到新接口；
3. 增加超时、失败节点降级与前端错误态；
4. 增加请求日志与 request-id（便于跨服务排障）；
5. 补充限流与安全检查，再做阶段验收。

---

## 八、第二阶段验收标准（初版）

- 能稳定返回“聚合答案 + 节点明细”；
- 任一节点故障时，系统仍可部分可用并给出可理解反馈；
- 前端不暴露后端密钥与内网地址；
- Window 3 主流程在真实后端下可完成端到端问答。

---

## 九、参考（官方文档）

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