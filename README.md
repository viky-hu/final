## Final

基于 **Monorepo** 架构的 Web 前端项目，通过「组件化拆分」先独立开发各功能窗口，再在主平台中整合。

---

## 🛠 技术栈

| 类别 | 技术选型 |
|------|----------|
| **管理工具** | pnpm workspaces + Turborepo |
| **框架** | Next.js 14+（App Router） |
| **开发库** | React + TypeScript |
| **样式方案** | Tailwind CSS |
| **基础组件** | shadcn/ui（Radix + Tailwind） |
| **动画引擎** | GSAP（窗口弹出、拖拽、视差滚动等） |
| **交互动效** | Rive（导航菜单、图标、品牌展示，参考 Dropbox Brand） |
| **组件规范** | Vercel 最佳实践（以 Server Components 为优先） |

### 为什么选择 GSAP

GSAP 是 Awwwards 获奖作品的常见选择。在本项目中：

- **窗口平滑弹出**：通过 GSAP 的 `scale`、`opacity` 与自定义缓动实现；
- **路径生长**：通过 GSAP `attr` 插件驱动 SVG `stroke-dashoffset`。

### Rive：设计师驱动的交互动效

[Rive](https://rive.app/) 由设计师在可视化编辑器中制作动画，导出 `.riv` 文件后在 React 中播放：

- **适用场景**：导航菜单、图标动画、品牌展示模块；
- **与 GSAP 分工**：Rive 负责设计感更强的交互模块；GSAP 负责窗口级、滚动驱动的动画。

---

## 🏗 目录结构

```bash
final/
├── apps/
│   └── main-platform/          # 核心承载平台
│       └── app/                # Next.js App Router 目录
├── packages/
│   ├── ui/                     # 基础 UI 组件
│   ├── ui-components/          # 业务窗口组件
│   └── tsconfig/               # 共享 TS 配置
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 💡 开发哲学与整体规划

- **窗口独立性**：每个窗口高内聚，不依赖其他窗口内部状态；
- **配置共享**：UI 风格通过 Tailwind 配置统一管理；
- **画布思维**：从路径绘制到坍缩，文字与线条通过统一坐标系统精确联动。

---

## 🎯 第一个窗口：登录界面（Login Window）

### 设计灵感

整体风格参考 **Dropbox Brand Guidelines**，采用「画布思维」：以 **SVG + GSAP** 实现几何动效，文字与线条严格绑定在同一坐标系统之上。

### 一、完整流程（必读）

```text
页面加载           ──▶  自动播放开场绘制动画  ──▶  阶段 1 结束：介绍界面
                                                            │
                                                   用户 scroll / click
                                                            │
单次交互：白蓝反转 + 线条坍缩 + 内容切换                   │
                                                            ▼
                                               阶段 2 结束：登录表单界面
```

#### 阶段 1：开场绘制（自动播放）

- **触发**：页面加载完成后立即自动播放；
- **内容**：四条主干线从画布边缘划入，Logo 轮廓线同步绘制；
- **结束状态**：白底、蓝线框架、蓝色介绍文案，**蓝色 Logo 固定在框架左下角**。

#### 阶段 2：白蓝反转 + 坍缩（交互触发）

- **内容**：在一次交互内，同时完成白蓝反转、线条坍缩和内容切换；
- **白蓝反转**：框架内部背景变为蓝色，文字与 Logo 反转为白色；
- **线条坍缩**：四条线以画面中心为不动点对称向中间收缩；
- **结果**：收束后进入蓝色登录表单区域。

### 二、核心坐标（Coordinate Reference）

以 1440 × 900 视口为基准：

| 变量 | 含义         | 初始位置（1440×900） | 坍缩后目标位置 |
|------|--------------|----------------------|----------------|
| `x1` | 左竖线位置   | `0.31 * VW`          | `0.37 * VW`    |
| `x2` | 右竖线位置   | `0.69 * VW`          | `0.63 * VW`    |
| `y1` | 上横线位置   | `0.17 * VH`          | `0.23 * VH`    |
| `y2` | 下横线位置   | `0.83 * VH`          | `0.83 * VH`    |

### 三、第一窗口动态背景融合方案（Three.js Beams）

> 目标：动态背景只服务于第一阶段氛围，不抢占主信息；进入第二阶段蓝色登录区后，背景必须快速退场并完全被内容覆盖。

#### 1）设计原则（不喧宾夺主）

- 背景层仅作为“氛围层”，不是“信息层”；
- 第一阶段允许适度动态纹理；第二阶段登录区必须成为视觉主角；
- 阶段切换时 Beams 快速淡出，避免与蓝色表单区叠加造成信息干扰。

#### 2）分阶段显示规则

- **Phase 1（开场介绍）**  
  - Beams 可见但强度受控（低对比、低饱和、低速度）；  
  - 推荐整体透明度区间：`0.06 ~ 0.14`。
- **Phase 2（白蓝反转 + 坍缩）**  
  - 在阶段 2 时间线起点后的 `0.12s ~ 0.20s` 内，将 Beams `opacity → 0`；  
  - 蓝色登录区（`panel-fill`）转为不透明后，完全覆盖背景层。
- **Phase 2 结束（登录态）**  
  - Beams 保持关闭，不再可见。

#### 3）视觉参数建议（白底场景）

- 背景主色：使用品牌蓝系的低饱和版本（避免纯白光束）；
- 建议滤镜：`saturate(0.7)`、`contrast(0.9)`、`brightness(1.02)`；
- 运动强度：
  - `speed: 0.45 ~ 0.9`
  - `noiseIntensity: 0.35 ~ 0.9`
  - `beamNumber: 6 ~ 10`
- 原则：宁可“几乎看不见”，也不要让用户注意力离开主框与文案。

#### 4）层级与遮挡规范（必须满足）

- DOM 层级：`Beams（底层） < SVG 主动画层 < 文本 / 表单交互层`；
- Beams 容器必须设置 `pointer-events: none`，避免影响按钮和输入框交互；
- 登录蓝区显现后，背景层不应在蓝区上方继续可见（禁止视觉穿透）。

#### 5）技术实现映射（对应现有动画结构）

- 在 `LoginIntroWindow` 中新增可控背景层（React Client Component）；
- 背景开关与 `introTl` / `stage2Tl` 同步：
  - `introTl`：保持低强度可见；
  - `stage2Tl`：起始段执行背景淡出；
- 保持现有几何主逻辑不变（四线绘制、白蓝反转、坍缩、内容切换），仅增加“背景礼貌退场”。

#### 6）验收标准

- 第一阶段：能感知空间氛围但不影响文案可读性；
- 第二阶段：用户视觉焦点稳定落在蓝色登录区与表单元素；
- 全流程：无层级穿透、无交互阻挡、无颜色冲突。

---

## 🚀 第二个窗口：产品介绍（三板块全屏滚动）

> 第二窗口由 3 个全屏 panel 组成，用户通过滚轮或点击按屏切换。  
> 各 panel 拥有各自时间轴、样式和坐标系统。

### 一、全局硬规则（必须满足）

- **一屏一板块**：任意时刻仅显示一个 panel；  
- **严格全屏**：每个 panel 必须始终撑满视口（`100vw × 100dvh`）；  
- **整屏步进**：切换按整屏跳转（index 步进），不可半屏停留；  
- **过渡锁定**：切换动画期间锁定输入，避免连续触发导致越级跳转；  
- **画布规范**：SVG 统一使用 `1920 × 1080` 坐标体系；panel 轨道位移为 `translateY(-index * window.innerHeight)`。

---

### （1）Panel 1：黑色动态主视觉（LightRAG）

**主题**：深色背景 + 几何网格 + 标题上升 + 色块流动 + 3D 返回按钮。

> 线条坐标、颜色和完整时间轴等细节全部集中在 `coords.ts`、`PanelBlack.tsx` 与 `globals.css` 中，这里只保留概要说明，避免 README 过长。

---

### （2）Panel 2：蓝色产品介绍主板块

**主题**：流光特效 + SVG 线条 + Shuffle 文案动效。承接 Panel 1，突出核心价值与能力摘要。

#### 层级结构（必须严格）

```text
z-index: 0  → 流光层（HyperspeedBackground，Three.js WebGL）
z-index: 1  → SVG 线条层（仅画线条，不画全屏 rect）
z-index: 2  → 文案层（ShuffleText：「各端口即时交流 时空链接」）
```

**红线**：SVG 线条层不得添加全屏不透明 `rect`，否则会盖住流光层。

#### 文案动效（ShuffleText）

- 文案：`各端口即时交流 时空链接`；  
- 字体：ZCOOL QingKe HuangYou（`@fontsource/zcool-qingke-huangyou`）；  
- 触发：Panel 2 激活时自动播放，每 1.5s 自动重播。

> Hyperspeed 相关参数与实现集中在 `HyperspeedBackground.tsx` 与 `hyperspeedPresets.ts` 中。

---

### （3）Panel 3：蓝色延展（Threads + Crosshair）

**主题**：下方 65% 区域 Threads 线束特效（`#C9BEFF / #8494FF / #6367FF` 渐变）+ 中上区域多条横线（与 Panel 1、2 的网格一脉相承），并加入十字准星 Crosshair 交互入口。

- Threads 细节见 `ThreadsEffect` 对应实现（WebGL / Canvas）；  
- 横线时间轴与渲染策略与 Panel 1 / 2 保持一致，坐标与缓动参数定义在 `coords.ts` 与 `animation.ts` 中；  
- Crosshair 交互通过 GSAP 与 `requestAnimationFrame` 结合，配合 SVG filter 实现「雪花化」效果。

---

### 二、交互定义（滚轮 / 点击）

- 鼠标滚轮向下：进入下一 panel；  
- 鼠标滚轮向上：返回上一 panel；  
- 点击空白区域：按产品节奏推进到下一 panel（可选，与滚轮逻辑保持一致）；  
- 到达首尾边界时不再继续跳转；  
- 每次切换仅允许移动一个 panel。

### 三、画布与容器规范

- 统一窗口舞台高度：`100dvh`，并设置 `overflow: hidden`；  
- Panel 轨道采用纵向排列，位移使用视口像素步进（`translateY(-index * window.innerHeight)`）；  
- 所有 SVG 继续使用 `1920 × 1080` 坐标体系，保证单屏裁切稳定；  
- 所有 panel 的交互元素不得突破本屏边界。

### 四、第二窗口代码结构

```bash
app/
├── login-window-demo.tsx           # 顶层编排入口（仅路由状态）
└── windows/
    ├── shared/
    │   ├── coords.ts              # 所有坐标 / 颜色常量（多个窗口共用）
    │   └── animation.ts           # GSAP 插件注册 + 自定义 easing
    ├── login/
    │   ├── LoginIntroWindow.tsx   # 第一窗口：介绍 + 白蓝反转 + 登录表单
    │   ├── LoginForm.tsx          # 登录表单子组件
    │   └── utils.ts               # SVG 布局辅助函数（updateLines 等）
    └── product/
        ├── ProductIntroWindow.tsx # 三板块容器：wheel 节流 + GSAP 整屏切换
        ├── HyperspeedBackground.tsx  # Panel 2：Three.js + postprocessing 背景
        ├── hyperspeedPresets.ts      # Hyperspeed 参数预设
        ├── overlays/
        │   └── ShuffleText.tsx       # Panel 2：Shuffle 文案动效组件
        └── panels/
            ├── PanelBlack.tsx        # Panel 1：黑色动效
            ├── PanelBlueMain.tsx     # Panel 2：蓝色主介绍（流光 + 线条 + 文案）
            └── PanelBlueExtend.tsx   # Panel 3：蓝色延展（Threads + Crosshair）
```

### 五、第二窗口验收标准

- 任意分辨率下，初始进入仅看到一个完整 panel；  
- 连续滚轮操作不会导致跳帧、越屏或叠屏显示；  
- panel 切换动画连贯，且可稳定落在离散索引位置（0 / 1 / 2）；  
- 未启用 panel 保持结构占位，不影响已完成 panel 的展示与交互。

---

## 第三个窗口：交互对话（Main Window）

第三窗口由第二窗口 Panel 3 中 **Shoot** 入口点击后进入，作为产品介绍流程的终点页。界面以「交互对话」为主题，由 **点阵背景**、**SVG 画布**、**聊天交互面板** 与 **侧滑菜单** 四层模块组成，形成完整的对话体验。

---

### 一、入口与触发

- **触发**：在 [`PanelBlueExtend`](apps/main-platform/app/windows/product/panels/PanelBlueExtend.tsx) 中点击 Aim/Shoot 文案或十字准星区域，执行 `onShoot` 回调；  
- **路由**：[`login-window-demo.tsx`](apps/main-platform/app/login-window-demo.tsx) 维护 `activeWindow`，当 `activeWindow === "main"` 时渲染 [`MainWindow`](apps/main-platform/app/windows/main/MainWindow.tsx)；  
- **返回**：第三窗口内菜单项「返回初始界面」点击后调用 `onBack`，切回第一窗口（登录介绍）。

---

### 二、技术栈与层级结构

#### 技术栈总览

| 类别 | 技术选型 |
|------|----------|
| **框架** | Next.js App Router + React + TypeScript |
| **组件** | 客户端组件（`"use client"`），满足 GSAP / Canvas / DOM 交互需求 |
| **动画** | GSAP + InertiaPlugin（点阵惯性）+ GSAP Flip（气泡布局补间） |
| **UI 组件库** | Radix UI（`@radix-ui/react-toggle-group`）——模式切换，WAI-ARIA 语义完整 |
| **绘制** | Canvas 2D + Path2D（点阵）；SVG + GSAP（画布线条）；CSS（气泡、输入框、按钮） |
| **字体** | ZCOOL QingKe HuangYou（与 Panel 2 保持一致） |

#### 层级结构与点击域规范（MVP 强制约束）

```
main-window-page
├── main-window-dotgrid-bg    (z-index: 0,  pointer-events: none 由 canvas 元素承载)
├── main-window-canvas-layer  (z-index: 5,  pointer-events: none)
├── chat-interaction-layer    (z-index: 6,  pointer-events: none ← 全屏占位，不拦截点击)
│   └── chat-interaction-panel (left: 25%, right: 25%, pointer-events: none)
│       ├── chat-mode-row      (pointer-events: auto)
│       ├── chat-messages-mask (pointer-events: auto)
│       └── chat-input-area    (pointer-events: auto)
└── main-window-menu-layer    (z-index: 10, pointer-events: none ← 全屏占位，不拦截点击)
    └── staggered-menu-wrapper (pointer-events: none)
        ├── staggered-menu-header (pointer-events: none)
        │   └── sm-toggle button  (pointer-events: auto ← 开/收按钮始终可点)
        ├── sm-prelayers          (pointer-events: none / auto when [data-open])
        └── staggered-menu-panel  (pointer-events: none / auto when [data-open])
```

**层级红线（必须满足）：**
- 任何全屏容器层自身不得设 `pointer-events: auto`，只有真正需要交互的叶子节点才设 auto；
- 菜单关闭时，信息流三个子区域（模式切换、消息流、输入区）必须可点，右上角菜单按钮必须可点；
- 菜单展开时，面板内所有元素可点，信息流未被面板覆盖的区域仍可点；
- 严禁通过 `pointer-events: auto` 的全屏容器覆盖对方功能区。

#### 宽度映射规范（信息流 = 画布）

| 状态 | 画布范围（coords.ts） | 信息流 CSS | GSAP 变换 |
|------|----------------------|-----------|-----------|
| 默认（菜单关闭） | `x1=25%, x2=75%` (EXPANDED) | `left: 25%; right: 25%` | `x: 0` |
| 菜单展开 | `x1=10%, x2=60%` (MENU_OPEN) | 同上 | `x: -15vw` (25%→10%, 75%→60%) |

信息流面板的定位百分比直接作用于视口（父容器 `chat-interaction-layer` 为全屏）。禁止在外层容器和内层面板上叠加相同的 `left/right` 收缩（避免二次收缩变窄）。

#### 信息流入场动效规范（canvasReady 后触发）

画布完成后（`onComplete` 回调触发 `canvasReady = true`），三个分区依序浮现：

| 段 | 触发时间点 | 动效 | ease |
|----|-----------|------|------|
| 1 模式切换行 | +0.12s | y: 16→0, opacity: 0→1, blur: 5px→0 | `power3.out` |
| 2 消息流区域 | +0.30s | y: 28→0, opacity: 0→1, blur: 3px→0 | `power3.out` |
| 3 输入发送区 | +0.50s | y: 38→0, opacity: 0→1, blur: 8px→0 | `back.out(1.4)` |

- 各区在动画前设 `visibility: hidden`，触发时立即设回 `visible` 再播 `fromTo`；
- 动画结束后 `clearProps: "filter"` 清除合成层占用；
- 禁止在整块 `chat-content-wrap` 上做单次整体淡入（破坏节奏感）。

### 三、模块一：DotGrid 点阵背景

- **静态**：全屏规则点阵，默认灰色（`#6b6b6b`），靠近变荧光绿（`#27FF64`）；  
- **交互**：鼠标快速移动或点击时，点受 GSAP Inertia 推动产生位移并弹性回弹；  
- **实现**：Canvas 2D + `requestAnimationFrame` + `InertiaPlugin`，`canvas` 设置 `pointer-events: none` 不挡菜单；  
- **代码**：[`DotGrid.tsx`](apps/main-platform/app/windows/main/components/DotGrid.tsx)。

---

### 四、模块二：ChatCanvasLines 画布层

- **流程**：画线（0.8s）→ 变色（白→荧光绿）→ 扩张并填充（0.5s）；  
- **画布**：四线围成区域填充 `#003049`，扩张后覆盖中央区域；  
- **菜单联动**：`menuOpen` 时画布向左平移 `-15vw`，与 StaggeredMenu 开合动画同步（`duration: 0.45s`、`ease: power3.inOut`）；  
- **代码**：[`ChatCanvasLines.tsx`](apps/main-platform/app/windows/main/components/ChatCanvasLines.tsx)。

---

### 五、模块三：ChatInteractionPanel 聊天交互（核心）

完整的聊天交互组件，承载「本地/全局」模式切换、消息流、输入与发送，是第三窗口的核心交互入口。

#### 5.1 技术栈与 UI 库

| 技术 | 用途 |
|------|------|
| **@radix-ui/react-toggle-group** | 本地/全局模式切换，Tab / 方向键 / Space 键盘完全可操作，WAI-ARIA 语义完整 |
| **GSAP** | 气泡入场、FLIP 布局补间、平滑滚动、面板与菜单联动 |
| **GSAP Flip** | 每次状态变更前 `captureFlip()`，`useLayoutEffect` 后 `Flip.from()` 平滑补间位移 |
| **Tailwind + globals.css** | 气泡样式、输入框、发送按钮、响应式适配 |

#### 5.2 已实现功能

**1）模式切换**：Radix UI `ToggleGroup.Root` 实现「本地 / 全局」单选切换，胶囊形态，选中态荧光绿；右侧显示「本地知识库检索」或「全局多终端检索」。

**2）消息状态机**：三阶段 `user` → `typing`（三点跳动）→ `bot`；发送后延迟 700ms 模拟思考，再展示「这是模拟回答，后续将接入实际代码。」。

**3）动效**：气泡入场 `elastic.out(1, 0.4)` Q 弹；FLIP 布局补间；`power3.out` 平滑滚动；`menuOpen` 时 `gsap.to(panel, { x: "-15vw" })` 与画布同步。

**4）输入区**：长条圆角胶囊，`textarea` 自动高度扩展（最大 120px）；Enter 发送；Shift+Enter 换行；发送按钮荧光绿球形，径向渐变高光，弹性 hover，发送中旋转 spinner。

**5）空状态**：中文占位「智能检索对话」「选择模式，输入问题开始提问」。

#### 5.3 样式与视觉（globals.css）

- **用户气泡**：`#FCF8F8` 凝胶质感，内阴影 + 投射阴影，`border-radius: 20px 2px 20px 20px`；  
- **Bot 气泡**：`rgba(228,255,48,0.05)` 背景 + 荧光边框 + 内外双层发光 + `backdrop-filter: blur(8px)`，`border-radius: 2px 20px 20px 20px`；  
- **信息流顶部**：`mask-image: linear-gradient` 渐隐遮罩；  
- **发送按钮**：荧光绿球形，`radial-gradient` 高光，hover 时 `translateY(-2px) scale(1.07)`；  
- **响应式**：1024px / 640px 断点。

#### 5.4 代码落点

- [`ChatInteractionPanel.tsx`](apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx)；  
- [`globals.css`](apps/main-platform/app/globals.css)：`chat-interaction-layer`、`chat-mode-toggle`、`chat-bubble`、`chat-input`、`chat-send-btn` 等 250+ 行样式。

---

### 六、模块四：StaggeredMenu 侧滑菜单

- **头部**：右上角「菜单 / 关闭」切换按钮 + 加号图标旋转；  
- **打开**：右侧滑入彩色条与毛玻璃面板，菜单项 stagger 入场，1～4 荧光绿编号渐显；  
- **菜单项**：四项中文——「返回初始界面」「交互对话」「数据库」「宏观平台」；「返回初始界面」执行 `onBack`；  
- **收起**：头部切换按钮或面板左上角收起图标均可关闭；

- **代码**：[`StaggeredMenu.tsx`](apps/main-platform/app/windows/main/components/StaggeredMenu.tsx)、`.sm-scope` 样式。

---

### 七、第三窗口文件结构

```bash
app/
├── login-window-demo.tsx           # 顶层编排，activeWindow === "main" 时渲染 MainWindow
└── windows/
    └── main/
        ├── MainWindow.tsx          # 第三窗口根：四层叠放
        └── components/
            ├── DotGrid.tsx         # 点阵背景（Canvas + GSAP Inertia）
            ├── ChatCanvasLines.tsx # SVG 画布（画线 + 扩张 + 菜单联动）
            ├── ChatInteractionPanel.tsx  # 聊天交互（Radix + GSAP）
            ├── TraceWindow.tsx     # 知识溯源全屏覆盖层（P1/P2/P3 + 线条 + 五区 + 知识图谱）
            └── StaggeredMenu.tsx   # 侧滑菜单（GSAP timeline）
```

全局样式：`main-window-page`、`main-window-dotgrid-bg`、`main-window-canvas-layer`、`main-window-menu-layer`、`chat-interaction-layer` 及 `.sm-scope`、`.chat-*` 均在 [`globals.css`](apps/main-platform/app/globals.css) 中维护。

---

### 八、第三窗口验收要求（MVP 基线）

**宽度**
- 信息流面板（`chat-interaction-panel`）在默认态（菜单关闭）下宽度与黑色画布区域一致（viewport 25%～75%）；
- 菜单展开后，信息流随 GSAP 同步左移，视觉宽度与 `MAIN_CANVAS_MENU_OPEN`（10%～60%）一致。

**交互点击**
- 菜单关闭时：模式切换按钮、消息流区、输入框、发送按钮均可点击；右上角「菜单」开启按钮可点击；
- 菜单展开时：面板内菜单项、收起按钮均可点击；「返回初始界面」可回到第一窗口；
- 任何情况下不得出现"整个页面只有右上角菜单按钮可点"的层级阻挡现象。

**动效**
- 在 Panel 3 点击 Shoot 稳定进入第三窗口；点阵靠近变绿、快速移动与点击有位移回弹；
- 画布入场后四条线扩张并填充；画布完成后三个信息流分区依序浮现，无整块瞬现；
- 菜单打开时画布与聊天面板同步左移；

**质量**
- 1024px / 640px 断点下布局正常；
- 无新增 lint 报错；
- 代码中无与 README 约束冲突的硬编码层级或百分比。


---

### 九、知识溯源功能（TraceWindow）

知识溯源为第三窗口的**覆盖式子模块**：用户点击回答气泡上的「溯源」按钮后，全屏展示可下拉的长画布，动态呈现该回答的原文来源、来源文件与知识图谱。

#### 9.1 功能概述

| 阶段 | 内容 |
|------|------|
| **入口** | 回答气泡 Hover 展开「溯源」按钮，点击后覆盖式打开 TraceWindow |
| **画布结构** | 下拉式长画布，分为 P1（介绍）、P2（线条框架 + 五区画布）、P3（知识图谱）三部分 |
| **数据流** | 原文 → 来源文件（五句原文对应五个文件）→ 知识图谱（球棍式 3D 节点与边） |

#### 9.2 回答气泡溯源按钮（BotBubble）

**视觉规范：**

- **左侧（气泡主体）**：荧光绿边框、大圆角、微弱外发光（`box-shadow`），内部文字为绿色模拟回答；
- **右侧（溯源按钮）**：初始宽度 0、`overflow: hidden`，实心荧光绿背景，从气泡右边界向右生长，形似半个胶囊；内部白底绿字「溯源」。

**交互与动画（GSAP Timeline）：**

| 阶段 | 触发 | 动效 |
|------|------|------|
| 1 发光增强 | `mouseenter` | 气泡 `box-shadow` 亮度/扩散范围增加 |
| 2 向右生长 | 紧接着 | 溯源按钮宽度 0 → 80px，缓动 `LINE_DRAW_EASE`（慢→快→慢） |
| 3 内容浮现 | 按钮展开约 80% 后 | 内部「溯源」文字 `opacity` 0 → 1 |
| 4 收回 | `mouseleave` | 按相反顺序执行 `timeline.reverse()` |

**技术约束**：左右连接处无缝；实现见 [`ChatInteractionPanel.tsx`](apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx) 中 `BotBubble` 组件。

#### 9.3 设计语言：Wireframe UI / Architectural Grid

- **原则**：使用全屏 SVG 的 `<line>` / `<path>` 绘制网格，**禁止**用多个 `<div>` 的 `border` 拼凑；
- **线条生长**：通过原生 `stroke-dasharray` + `stroke-dashoffset` 驱动，无需 GSAP DrawSVG 插件；
- **画布归属**：线条框架**印在长画布上**，随滚轮滚动上移，而非固定于视口的相框式装饰。

#### 9.4 线条坐标系与绘制顺序（TraceWindow 实现）

画布基准：`TVW = 1440`，`TVH = 900`。竖线 x 坐标：`VL = 384`，`VM = 888`，`VR = 1152`。线条 ID：`tl-H-Bound-T/B`（上下边界）、`tl-V-Main-L/R`（纵主干）、`tl-H-Main-T/B`（横主干）、`tl-H-Aux-1`、`tl-V-Aux-1`（辅线）、`tl-Deco-1`、`tl-Cross-1-H/V`（装饰）。**绘制节奏**：慢→快→慢（`LINE_DRAW_EASE`）。

#### 9.5 三阶段滚动逻辑（P1 / P2 / P3）

P1 介绍 → 滚轮绘制线条 → P2 框架固定、锁定 0.5s、五区画布浮现 → 解除锁定 → P3 知识图谱入场。五区画布由线条围成，展示 `REGIONS` 中 `label` 与 `title`（来源文件名称）。

#### 9.6 知识图谱与文件结构

- **KnowledgeGraph**：`KG_NODES` + `KG_EDGES`，`IntersectionObserver` 触发 GSAP 入场；
- **代码**：[`TraceWindow.tsx`](apps/main-platform/app/windows/main/components/TraceWindow.tsx)、[`ChatInteractionPanel.tsx`](apps/main-platform/app/windows/main/components/ChatInteractionPanel.tsx)。

---

### 十、大模型选取功能
新增一个button位于第三个窗口的信息流画布的最上层的模式切换按钮旁边
html：
<button class="animated-button">
  <svg viewBox="0 0 24 24" class="arr-2" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
    ></path>
  </svg>
  <span class="text">Modern Button</span>
  <span class="circle"></span>
  <svg viewBox="0 0 24 24" class="arr-1" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
    ></path>
  </svg>
</button>

css：
.animated-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 36px;
  border: 4px solid;
  border-color: transparent;
  font-size: 16px;
  background-color: inherit;
  border-radius: 100px;
  font-weight: 600;
  color: greenyellow;
  box-shadow: 0 0 0 2px greenyellow;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button svg {
  position: absolute;
  width: 24px;
  fill: greenyellow;
  z-index: 9;
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button .arr-1 {
  right: 16px;
}

.animated-button .arr-2 {
  left: -25%;
}

.animated-button .circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background-color: greenyellow;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button .text {
  position: relative;
  z-index: 1;
  transform: translateX(-12px);
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button:hover {
  box-shadow: 0 0 0 12px transparent;
  color: #212121;
  border-radius: 12px;
}

.animated-button:hover .arr-1 {
  right: -25%;
}

.animated-button:hover .arr-2 {
  left: 16px;
}

.animated-button:hover .text {
  transform: translateX(12px);
}

.animated-button:hover svg {
  fill: #212121;
}

.animated-button:active {
  scale: 0.95;
  box-shadow: 0 0 0 4px greenyellow;
}

.animated-button:hover .circle {
  width: 220px;
  height: 220px;
  opacity: 1;
}
请将按钮的颜色换成同样的荧光绿色，并且将按钮上的文字改成中文“模型配置”
按下按钮后，照搬第三个窗口的信息流四条线绘制方式和显现其中画布的成熟代码实现，也开一个画布出来盛放大模型选取功能框，各参数照搬即可，你无需擅自改动，但是展开的速度需要比其略快，并且画布改成FFF6F6颜色。另外还需要新增一个动画倒退的功能，因为在这个窗口操作完是肯定要关闭它的，所以需要内容动态淡出，如时间倒流般把之前线条和画布反过来退回去。
再说模型选取功能画布完全打开后的同时，才浮现模型选取的功能的一系列元素，具体如下：
可选择的三种模型服务商：OpenAI Ollama Local
分别可选用的模型是gpt qwen deepseek；lamma deepseek gemma qwen；Auto lamma gemma qwen
如果选用的是openai或者ollama，
接口地址 (Base URL)
输入框
API Key
输入框

如果选择的是local：
模型路径 (Model Path)
（此为输入框） 浏览（此为打开文件管理器的交互按钮）
请选择本地模型文件 (.gguf, .bin) 或项目环境路径（输入框下方小字）

服务端口 (Localhost URL)
（此为输入框）模拟默认内容（淡色）：http://localhost:8000/v1

统一的最下方按钮：
保存并连接
如果输入的无效或者有问题，显示红字：连接失败，请检查 API Key 和网络设置

希望你做按钮的时候不要做成AI千篇一律的button，完全可以学习我们web的整体线条简约高级风格，用线条来分割区域作为可交互的按钮，可以联网搜索可实现的技术栈或者高级的UI库，切勿盲目随意设计，元素确保切合我们主题


## 第四个窗口：数据库（Database Window）

第四窗口为**数据库聚类管理界面**，采用 Newsprint（报纸）设计风格。**菜单栏在第三、第四窗口中常驻**，仅返回登录页时隐藏。

### 一、入口与触发

- **触发**：第三窗口侧滑菜单点击「数据库」，`activeWindow` 切换为 `"database"`；
- **返回**：菜单项「返回初始界面」执行 `onBack`。

### 二、设计系统：Newsprint

零圆角、黑边框、`#F9F9F7` 背景、ZCOOL Xiaowei 字体。主标题：「你可以在此新增数据库聚类或向聚类中添加文件」。

### 三、页面布局

- **Hero 左栏**：主标题、装饰文案、「新建聚类」按钮；
- **创建聚类弹窗**：Newsprint 风格，输入框 +「确认创建」，调用 `POST /api/database/clusters`；
- **右侧栏**：已有聚类数量、总文件数量、最近添加文件日期（`GET /api/database/metrics`）；
- **聚类列表**：单列横条，`border-b` 分隔，每行显示名称、图标、文件数。

### 四、入场动效与特殊规范

- 窗口淡入后，0.8s GSAP 时间轴依次呈现各模块；线条绘制与第一、第二窗口一致；
- **菜单**：深红色主题，夹层颜色与字体深红一致；顶部有滚动细栏时，菜单按钮下移；
- **主标题**：字号适度缩小，字体 ZCOOL Xiaowei。

### 五、API 与文件结构

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/database/clusters` | 获取聚类列表 |
| POST | `/api/database/clusters` | 新建聚类 |
| GET | `/api/database/metrics` | 获取指标 |

文件：`api/database/clusters/route.ts`、`metrics/route.ts`、`lib/database-store.ts`、`windows/database/DatabaseWindow.tsx`。

### 六、单个聚类窗口

### 六、单个聚类窗口（Single Cluster Window）

#### 一、功能概述

本模块负责展示特定聚类的详细内容，提供文件管理、类型筛选上传及本地化预览能力。设计核心在于「前端交互先行、后端契约同步」，确保在当前内存态（Memory State）开发阶段完成后，可无缝对接持久化存储。

#### 二、核心特性

| 特性 | 说明 |
|------|------|
| **聚类详情视图** | 从数据库列表平滑切换至单个聚类详情，展示文件条块 |
| **气泡上传菜单** | 点击上传按钮弹出类型气泡（文档/图片/视频），关联系统文件选择 |
| **多模态预览** | 内置支持文本、图片、视频的即时预览弹窗 |
| **系统级交互** | 通过 `desktop-file-bridge` 逻辑，支持调用宿主系统（如 Electron）打开本地文件 |
| **分层架构** | UI 与数据流解耦，预埋 API 契约与服务层接口 |

#### 三、技术架构

**1. 数据流向**

```text
ClusterDetailWindow ──▶ clusterFileService ──┬──▶ memoryClusterFileRepo
                                              └──▶ clusterFilesApiClient ──▶ nextApiClusterFilesRoutes
ClusterDetailWindow ──▶ desktopFileBridge ──▶ electronIpcOpenPath
```

**2. 关键设计模式**

- **桥接模式（Bridge）**：前端通过 `desktop-file-bridge.ts` 抽象层调用系统能力，不直接耦合 Electron API；
- **仓储模式（Repository）**：当前阶段使用 `memoryClusterFileRepo` 维护状态，后续通过 `clusterFilesApiClient` 切换至远程请求。

#### 四、目录结构与文件职责

| 路径 | 职责 |
|------|------|
| `apps/main-platform/app/windows/database/components/ClusterDetailWindow.tsx` | 主组件：处理聚类详情布局、返回逻辑及文件列表渲染 |
| `apps/main-platform/app/windows/database/components/FilePreviewModal.tsx` | 预览组件：实现图片/视频/文本的 Canvas/DOM 渲染及「打开文件」入口 |
| `apps/main-platform/app/lib/database-store.ts` | 状态中心：扩展聚类文件相关的内存态管理逻辑 |
| `apps/main-platform/app/lib/desktop-file-bridge.ts` | 环境桥接：导出 `openFileWithSystem` 统一接口，处理环境检测 |
| `apps/main-platform/app/lib/cluster-files-contract.ts` | 契约定义：使用 Zod 定义文件元数据、上传 Payload 等共享类型 |
| `apps/main-platform/app/api/database/clusters/[id]/files/route.ts` | 后端骨架：定义 API 路由契约，当前返回 501 或 Mock 数据 |

#### 五、视觉与交互规范

**1. 动效节奏**

- **延续性**：复用 `DatabaseWindow.tsx` 的 `gsap.timeline` 配置；
- **缓动函数**：统一使用 `LINE_DRAW_EASE`；
- **逻辑流程**：线条绘制 → 模块显隐 → 内容滑入。

**2. UI 样式**

- **报纸风格**：严格遵循 `window-4-database.css` 的分割线体系（Border-box 与实线/虚线组合）；
- **气泡菜单**：复用 `db-modal` 的层级语义，确保 Esc 键可退出，焦点自动回收。

**3. 文件上传过滤**

| 类型 | 对应扩展名 |
|------|------------|
| 文档 | `.pdf`、`.txt`、`.doc`、`.docx`、`.md`、`.rtf` |
| 图片 | `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif` |
| 视频 | `.mp4`、`.webm`、`.mov` |

#### 六、实施计划（Checklist）

**第一阶段：UI 与交互**

- [ ] 在 `DatabaseWindow` 中增加 `selectedClusterId` 状态切换逻辑；
- [ ] 实现 `ClusterDetailWindow` 基础骨架与进入/返回动画；
- [ ] 构建「上传气泡菜单」并映射至隐藏的 `input[type=file]`。

**第二阶段：数据与存储**

- [ ] 在 `database-store` 中实现文件增删查改的内存态逻辑；
- [ ] 实现文件选中后生成 `URL.createObjectURL` 以支持本地即时预览；
- [ ] 编写 `cluster-files-contract.ts` 明确前后端字段契约。

**第三阶段：预览与桥接**

- [ ] 完成 `FilePreviewModal`，支持按 MIME Type 分支渲染；
- [ ] 实现 `desktop-file-bridge.ts`，加入 `window.desktopBridge` 的可用性降级提示；
- [ ] 预埋 `app/api/database/clusters/` 路由下的请求逻辑。

#### 七、验收标准

| 维度 | 标准 |
|------|------|
| **路径完整性** | 点击聚类行 → 进入详情 → 点击文件 → 弹出预览 → 成功关闭 |
| **环境兼容性** | 在非桌面壳环境点击「打开文件」时，UI 需弹出「当前环境不支持系统打开」的明确提示 |
| **视觉一致性** | 新增组件的线条粗细、颜色、字体间距需与现有数据库窗口完全一致 |
| **架构前瞻性** | 代码中不存在硬编码的 Electron API 调用，所有 API 请求均通过统一的 Service 层 |


## 第五个窗口：宏观平台
这个平台将会非常复杂，会融入非常多的元素，