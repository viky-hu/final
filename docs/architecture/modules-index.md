# 模块职责总索引（modules-index）

> 目的：让任何人能快速知道“每个功能由哪些文件负责”。

## 1. 联邦问答后端（Python）

### 1.1 中心聚合服务
- 主责文件：`central_server.py`
- 职责：接收问题、加密转发、并发聚合节点结果、返回最终答案与节点明细；透传 `request-id`，提供 `GET /health` 节点健康聚合。

### 1.2 节点检索服务
- 主责文件：`node_server.py`
- 职责：解密查询、执行单节点检索、加密返回候选答案；按请求头记录 `request-id`，通过环境变量加载 SM4 密钥。

## 2. 前端 Window 4（交互对话）

- 主容器：`apps/main-platform/app/windows/main/MainWindow.tsx`
- 对话交互：`apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`
- 溯源窗口：`apps/main-platform/app/windows/main/components/TraceWindow.tsx`
- 知识图谱：`apps/main-platform/app/windows/main/components/TraceKnowledgeGraph.tsx`
- 画布/装饰：
  - `apps/main-platform/app/windows/main/components/ChatCanvasLines.tsx`
  - `apps/main-platform/app/windows/main/components/ModelConfigCanvasLines.tsx`
  - `apps/main-platform/app/windows/main/components/DotGrid.tsx`

## 3. 前端 Window 3（数据库）

- 主容器：`apps/main-platform/app/windows/database/DatabaseWindow.tsx`
- 聚类详情：`apps/main-platform/app/windows/database/components/ClusterDetailWindow.tsx`
- 文件预览：`apps/main-platform/app/windows/database/components/FilePreviewModal.tsx`

## 4. 前端 Window 2（宏观可视化）

- 主容器：`apps/main-platform/app/windows/macro/MacroWindow.tsx`
- D1 时间线：`apps/main-platform/app/windows/macro/components/D1Timeline.tsx`
- D2 视图：`apps/main-platform/app/windows/macro/components/D2Visualization.tsx`
- D3 沙盘：`apps/main-platform/app/windows/macro/components/D3SandboxThreeMvp.tsx`
- D4 曲线：`apps/main-platform/app/windows/macro/components/D4Visualization.tsx`
- D5 词云：`apps/main-platform/app/windows/macro/components/D5WordCloud.tsx`

## 5. 前端 Window 1（登录）

- 介绍窗口：`apps/main-platform/app/windows/login/LoginIntroWindow.tsx`
- 登录表单：`apps/main-platform/app/windows/login/LoginForm.tsx`
- 登录工具：`apps/main-platform/app/windows/login/utils.ts`

## 6. 跨窗口共享能力

- 顶部导航：`apps/main-platform/app/windows/shared/GlobalTopNav.tsx`
- 个人信息弹层：`apps/main-platform/app/windows/shared/ProfileModalLong.tsx`
- 共享动画工具：`apps/main-platform/app/windows/shared/animation.ts`
- 共享坐标工具：`apps/main-platform/app/windows/shared/coords.ts`

## 7. Next.js API（BFF / 内部接口）

### 7.1 数据库相关接口
- `apps/main-platform/app/api/database/clusters/route.ts`
- `apps/main-platform/app/api/database/clusters/[clusterId]/route.ts`
- `apps/main-platform/app/api/database/clusters/[clusterId]/files/route.ts`
- `apps/main-platform/app/api/database/clusters/[clusterId]/files/[fileId]/route.ts`
- `apps/main-platform/app/api/database/clusters/restore/route.ts`
- `apps/main-platform/app/api/database/metrics/route.ts`
- `apps/main-platform/app/api/database/updates/route.ts`

### 7.2 模型配置相关接口
- `apps/main-platform/app/api/model-config/connect/route.ts`

### 7.3 联邦聊天 BFF 接口
- `apps/main-platform/app/api/federation/ask/route.ts`
- `apps/main-platform/app/api/federation/health/route.ts`

## 8. 联邦服务层与前端调用封装

### 8.1 服务层（Server）
- 主责目录：`apps/main-platform/app/lib/server/federation/`
- 主责文件：
  - `apps/main-platform/app/lib/server/federation/central-client.ts`（中心服务调用、超时控制、响应归一化）
  - `apps/main-platform/app/lib/server/federation/schemas.ts`（联邦接口 schema/类型）
  - `apps/main-platform/app/lib/server/federation/errors.ts`（错误归一化）

### 8.2 Window 4 前端调用
- 主责文件：`apps/main-platform/app/windows/main/services/federation-chat-api.ts`
- 协同文件：`apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx`
- 职责：仅在 `global` 模式调用 `/api/federation/ask`；`local` 模式保留本地 mock 回复链路。

---

## 维护规则

1. 新增功能时，必须在本文件追加“主责文件 + 协同文件”。
2. 若模块重命名或职责迁移，必须同步改本索引。
3. 任何“找不到功能归属文件”的改动，视为不合规改动。
