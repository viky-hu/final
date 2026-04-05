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
- 字体：DingTalk JinBuTi（`cn-fontsource-ding-talk-jin-bu-ti-regular`）；
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
| **字体** | DingTalk JinBuTi（与 Panel 2 保持一致） |

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
这个平台将会非常复杂，会融入非常多的元素，仍然使用我们web频繁使用的SVG+GSAP技术栈
初始整个页面背景颜色1e1919
仍然与第三个、第四个窗口一致地，照搬菜单栏，第三个的菜单栏的色调是荧光绿，第四个的菜单栏是深红色，那么我们这个第五个窗口的菜单栏也可以用别的颜色。
首先仿照第一、第三窗口的时间轴绘制方案在屏幕左中右的两个三等分点位置画出两条竖线作为功能分隔线，记作p1，p2：p1从屏幕上边界画到下边界，p2从下边界画到上边界，可以构建一个与第一窗口readme类似的时间轴，两根线条在0.4秒内画完，
0.4秒时刻两根竖线恰好画完，开始画两根横线p3，p4:p3为左侧三分之一区域中轴横线，从p1的位置开始向左画线画到屏幕左边界；p4为右侧三分之一区域中轴横线，从p2的位置开始向右画线画到屏幕右边界，它们耗时0.4秒画完。
四条线都满足：速率为慢 -> 快 -> 慢，绘制时线条颜色为白色，绘制完后变为？？颜色（这里颜色待定，你可以先使用一个能够在黑白交界处不影响美观性的颜色，我暂时想不到什么颜色好）
以上内容在第一窗口和第三窗口都有成熟的代码实现，并且也考虑到了右侧菜单栏展开后整个窗口需要左移让位的情况，所以你可以照搬其中代码，尽量不要擅自做新的尝试，照搬已有实现方式即可
此时，整个屏幕被四根线条分成了五个区域，我们称左上为d1，左下为d2，中间一大片为d3，右上为d4，右下为d5
按照SVG画布逻辑和GSAP的动画技术栈，我需要将d1、2、4、5做成SVG画布，使用纯白色覆盖这四个区域，当然动态呈现方法也有所不同，时间轴0.8秒时（前文0.4秒+0.4秒）d1、d4的白色画布从屏幕最上侧分别向下覆盖到p3、p4；d2、d5的白色画布从屏幕最下侧分别向上覆盖到p3、p4，共用时0.4秒，至此整个页面花费1.2秒完全实现了四条线的显示、换色、分区的白色填充。最后再使用0.4秒同步显现以下的功能模块：

下面是我与gemini的交互对话和它给我的提示词：
我：
我将设计一个类似警务实战大数据平台的页面，功能上有所不同，它主要是检测各个服务器（派出所/分局）对数据库的更新上传新数据的情况的。整个页面主要分为三个部分，左中右三个栏目：左侧栏布置两个数据显示卡片，
1、一个是实时监测各个服务器（各个派出所）最新更新数据库的时间栏，具体样式如下：
由上到下从新到旧地显示各个时间点，哪个服务器更新数据库——
19：01 2026.3.19 text1更新了数据库
15：30 2026.3.19 text2更新了数据库
08：50 2026.3.18 text3更新了数据库       
19：30 2026.3.17 text1更新了数据库

我们相当于在这一块SVG画布上先在头顶写上这个功能名称，然后整个区域都做成一个时间轴，并且我们需要现在模拟足量的数据，这整个SVG画布上时间轴是可以直接上下滚动下拉查看的，无需在右侧边布置上下滚动条，直接靠近此画布来滚动即可看到。

并且，我们需要对接一个更新逻辑，我们的第四个窗口就是数据库窗口，按照web功能，每个账号就是一个节点，节点（终端）拥有自己的数据库，也就是存放在这个界面的文件聚类，所以当我们在第四个窗口新建了一个聚类或者在某个聚类里新建了文件，不仅要在第四个窗口的第一页右侧显示出来（当然这个我们已经做到了，现在就是这样），还当然要在这个d1区域同步实时显示出来，体现了一种前端不只是前端的效果，每个功能模块逻辑是真实联系在一起的，而并非毫无关联。

2、另一个是实时检测各个服务器使用对数据库进行检索功能的次数排行（在我的web中是一个交互对话窗口，用户可以从这个对话口询问某事件的具体信息，达到一中从数据库中检索知识的效果）
具体到某段时间的统计，卡片的上侧有一个 按钮，可以选择当天、本周，本月作为统计时间
终端名 | 数据检索频数
text1 | 30
yyy | 24
………………
这仅是左侧栏的上半部分的卡片，数据很多，若想浏览完整数据，可以点击卡片右下角的展开按钮，这个卡片就会向下展开至屏幕底部，有翻页button
——————
屏幕中央三分之一的大片区域，将会呈现一个模拟的科技风线条地图，我们将设计一些类似光柱的设计，如同地图上的锚点一样（这也与web设计理念相关，例如一片区域的每个节点每个拥有自己的一个服务器——这一个个终端将会在地图上一个个显现），光柱的位置是地图上服务器的实际位置，而自己终端所登录的服务器所对应的光柱将会高亮显现或换色显现。
——————
右侧栏将会设计成一个充斥着各种可视化形式的的一个个卡片从上到下排布：
第一个卡片是一个柱状图，柱状图呈现五个柱：显示某段时间各个服务器对整个数据库的贡献前五名，所以卡片的上侧有一个按钮，可以选择当天、本周，本月作为时间段，例如当天A派出所（服务器）上传了10份新文件到数据库中，B派出所（服务器）上传了8份新文件到数据库中…………它们在当天贡献比较大，那么就会在柱状图中呈现出来
第二个卡片是词汇云图，显示某段时间总数据库文献中语义或出现频率较高的若干个地点，如xx中学，xx美食街……
这是一个个警务大数据平台的页面设计方案：**“左-中-右”三栏布局**（通常在业内被称为“数据驾驶舱”或“大屏可视化展示”）是目前信息监控和态势感知系统中较为合理的结构

————————————————————————————————————————————————————————————————————————————————————————————————————————
gemini：
各模块总结：左侧看动态与使用率，中间看全局空间分布，右侧看核心业务成果与热点。

为了让你的设计在实际落地时视觉效果更震撼、用户体验更流畅，我为你梳理了各个模块的优化建议:

各模块 UI/UX 设计优化建议
1. 左侧栏：动态与高频监控
d1——最新更新时间栏（时间轴）：

视觉：建议采用“发光节点 + 渐变虚线”的时间轴样式。最新的数据节点用高亮的某种颜色闪烁表示。

d2——检索次数排行栏：

视觉优化： 在频数数字下方旁边加上微型趋势图（Sparkline），显示该终端近几小时的检索频率走势。

2. 中央区域：科技风地图与光柱（核心视觉区）

最难设计的其实是地图，我们需要先模拟出一个线条风地图出来，
CSS 3D 视角构造底盘 （The Floor）： 地图本质上是一个平面的 SVG。我们通过给父容器加上 （透视），并给 SVG 加上 ，就能把一个平面的线条强行“拍”在地板上，形成战术沙盘的 2.5D 视角。perspectivetransform: rotateX(60deg) rotateZ(-20deg)

SVG 线条风绘制 （Wireframe）：使用带有科技感的几何多边形（Polygon）或路径（Path）拼凑出虚拟的辖区轮廓。颜色采用无填充或极低透明度填充（例如 ），配合锐利的边框（）和  外发光。rgba(0, 210, 255, 0.05)stroke: #00d2ffdrop-shadow

垂直光柱与底座涟漪 （Glowing Pillars）： 由于 SVG 本身是平躺的，要在上面立起光柱，最简单的做法是在地图容器内部绝对定位（）一些 。利用从下到上的透明渐变（）模拟光柱（），光柱是倒锥形，上宽下窄，并在其底部加一个不断放大的圆形动画模拟扫描或涟漪扩散。position: absolutedivlinear-gradient

GSAP 进场联动： 沿用你之前的思路，先用 让地图的线条像激光一样“画”出来，然后再让光柱从地面“长”出来。stroke-dashoffset

在真实项目中的落地建议
真实经纬度映射：在实际开发中，节点所在IP的坐标是真实的经纬度（Lng/Lat）。你需要写一个简单的线性转换函数，将辖区的  映射到 SVG 画布的 ，这样服务器光柱的位置才能按真实比例落在地图上。[MinLng, MaxLng][0, svgWidth]

线条性能优化：如果你们有几百条街道的数据，直接渲染巨大且复杂的 SVG 会导致动画掉帧。建议只保留辖区边界和主干道作为带有 GSAP 动画的线条，其余细碎的支路作为静态背景图。

视觉层次（Z-index）：在这种透视布局中，确保光柱的 HTML 节点在 DOM 树中的顺序或层级正确，避免出现远处的底座遮挡近处光柱的穿模问题。


地图底座： 使用深色点阵或网格线（Wireframe）勾勒辖区轮廓，带一点透视效果（2.5D或3D视角），会比纯平面的地图更有“实战指挥”的科幻感。

把 2.5D 地图的“科幻感”和“实战感”拉满，需要你尽量将这个地图绘制地高级大气复杂一些，如果你认为必要的话，可以引入3D引擎。


3. 右侧栏：贡献度与热点分析
d4——贡献前五名柱状图：

视觉优化： 柱体不要用纯色实心，建议使用底部暗色到顶部亮色的渐变，并在柱子顶部加上发光边缘。

交互切换：“当天/本周/本月”的按钮建议做成胶囊型（Capsule）的 Toggle 切换开关，切换时柱状图的升降应带有平滑的弹簧过渡动画（Easing animation）。

d5——语义地点词汇云图（Word Cloud）：

视觉优化： 词云需要突出重点。出现频率最高的中心词汇（如“XX中学”）应该不仅字体最大，还可以使用特定的警报色（如红色/橙色）来标示高频风险区域，而比如普通的“XX美食街”用常规科技蓝色即可。可以给词云加一个缓慢的呼吸或自转动画，避免画面死板。

由于左右两侧最终定格为纯白色，你在实际开发时，可以给这四块白色区域的内部添加极浅的网格线（如 ），并在边界线条（p1/p2/p3/p4）下方添加一层淡淡的青色外发光（）。这样能让你的“宏观平台”看起来既有实战大屏的严谨感，又有一丝精致的悬浮层次感。rgba(0,0,0,0.03)drop-shadow

——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

上述gemini的答复仅供参考，你在实际过程中遇到必要时候还是要自己联网搜索而不是完全依赖这段回答，只要你明确相关技术栈或是引用新的技术栈制作得正确美观，我便放开手让你做。

### 防 FOUC 的通用提示词

**Role & Context:**
You are an expert Frontend Developer specializing in React and GSAP animations. 

**Task:**
When writing or refactoring GSAP animations in a React application, you must strictly follow the "CSS-First Initial State" pattern to prevent FOUC (Flash of Unstyled Content).

**Rules:**
1. **NO JS-DRIVEN INITIAL HIDING:** Never rely on `gsap.set()` or `gsap.from()` inside `useEffect` / `useGSAP` to establish the initial hidden state of an element. (React paints the DOM before these hooks run, causing a flash).
2. **CSS-FIRST:** Always define the initial hidden state (e.g., `opacity: 0`, `visibility: hidden`, `transform: translateY(20px)`) directly in the CSS/SCSS or inline styles.
3. **ANIMATE TO:** Because the element is hidden via CSS, use `gsap.to()` to animate the element into its final visible state (e.g., `opacity: 1`, `transform: none`).
4. **USE AUTOALPHA:** When fading elements, prefer setting `visibility: hidden; opacity: 0;` in CSS, and animate using `gsap.to(el, { autoAlpha: 1 })`. This ensures hidden elements do not block clicks or screen readers.
5. **USE @gsap/react:** Always use the `useGSAP()` hook instead of `useEffect()` for proper context management and memory cleanup in React strict mode.

### React + GSAP 动画最佳实践解析


除了上面的提示词，这里也为你梳理了业内公认的解决此类问题的标准实践方案：

1. 核心理念：CSS 负责“初始不可见”，GSAP 负责“显现”
不要让 JS 去追赶浏览器的渲染速度。确保在浏览器解析 DOM 的那一刻起，元素就是隐藏的。

2. 使用  替代单纯的autoAlphaopacity
单纯使用  时，元素虽然看不见，但仍然占据原本的位置，并且可以被点击（占据交互层），这可能会导致页面出现意想不到的 Bug 或是阻挡下方元素的交互。opacity: 0

最佳实践：在 CSS 中设置 。visibility: hidden; opacity: 0;

GSAP 侧：使用 。gsap.to(element, { autoAlpha: 1 })

原理：GSAP 的 是一个智能属性，它会自动处理 ，并在透明度变为大于 0 时将 设为 /，这在处理复杂的错开动画（Stagger）时极为优雅。autoAlphaopacityvisibilityinheritvisible

3. 放弃 ，拥抱  或者gsap.from()gsap.to()gsap.fromTo()
gsap.from()会以元素当前的 CSS 状态作为终点，这意味着你不能在 CSS 里把元素写死为隐藏状态（否则它会从你设定的初始值动画过渡到隐藏状态）。在 React 中，CSS 初始隐藏 + gsap.to（） 是最无脑且最安全的打法，完全避免了时序竞争。

4. 使用官方的 HookuseGSAP
在 React 18+ 的严格模式下， 会在开发环境中触发两次，导致 GSAP 动画时间轴被意外创建两次甚至发生闪烁。官方特别推出了 包中的 hook。useEffect@gsap/reactuseGSAP

优势：它自动处理了作用域（Scope）和组件卸载时的清理（Cleanup），再也不用手动去写 ，大大减少了动画带来的内存泄漏和错乱问题。ctx.revert()

第五窗口左上d1内容：
当前存在的问题是：由于我们仅是在前端预览测试这个web系统，由于内容的敏感性，不应该出现派出所、分局的字眼、请一律将节点名称直接换成text1、text2、text3、text4……
第五窗口左下d2内容：
首先我在根目录放置了一个截图“第五窗口当前状态.png”，图片中我们已经完成了左上区域的d1，你可以查看当前d2区域的尺寸
我们先要仿照d1区域的顶栏样式和尺寸，也做一个顶部标题介绍栏，告诉用户这个可视化板块是什么名字。
然后下面整个d2区域将会展示一个数据可视化的柱状图，是横柱，呈现的可视化数据是更新情况————某段时间内对数据库贡献前五名柱状图，即选择例如当日、本周、本月、本季、本年，然后展示对应时间段内对数据库贡献前五名的数据，每次切换时间段时，柱状图都需要重新有动画呈现一次，具体设计为从屏幕最左边界向右生长出一根根横柱，五根柱子的颜色从6367FF 8494FF C9BEFF一直过渡，中间再选取两种颜色，凑齐五种颜色。并在柱状图的右侧用文字标注此节点名称。我们一律用的都是前端的测试节点text……名称。
柱体将设计成右边界的圆角胶囊型，从左到右浮现使用丝滑瀑布流风 （Elegant Cascading）：
视觉特点： 最经典、最优雅的现代 UI 动画。柱体不仅从左向右平滑延伸。五根柱子像瀑布一样顺滑地依次出场。
技术思路： 使用 GSAP 修改元素的 （需要设置 保证从左向右变长），配合 这种先快后慢的缓动函数，让柱体停下时非常有呼吸感。
在时间轴设计上，你需要阅读readme中“### 防 FOUC 的通用提示词”和“### React + GSAP 动画最佳实践解析”来严格保证呈现效果，具体时间轴为：待到白色画布完全渲染出来后，照搬d1的顶部标题栏浮现实践，同时用0.4秒的时间，让五根柱子同步从左向右生长出来，生长结束后再动态浮现柱状图右侧的文字标注。


### 第五窗口右下角d5——词汇云图：


### 第五界面中间50%区域d3设计
盛放内容：
先照搬d1、d2的样式、动态设计等因素，也设计一个顶栏，写明此d3模块的名称
核心概念定义
设计定义词（关键词）：科技风地图与光柱（核心视觉区）

3D 地理空间服务器拓扑沙盒（3D 地理空间服务器拓扑沙盘）
要说3D，不如说是2.5D，地图本质上是一个平面的 SVG。我们通过给父容器加上 （透视），并给 SVG 加上 ，就能把一个平面的网格线条强行“拍”在地板上，形成战术沙盘的 2.5D 视角（我猜测是这样的，你根据联网搜索的最佳实践深度思考如何实现即可）
我们可以左右旋转这个网格地图，但始终保持地图面向用户的最佳角度。

我们现在需要你设计一个充满层次感的游戏地图风板块图样，要求可放置在web前端背景上，像是放在地板上的3D地图，无需复杂元素样式。

风格标签：极简高定 （Minimalist Premium）、深色科幻 （Dark Sci-Fi）、战术全息 （Tactical Hologram）、数据驱动 （Data-Driven）

技术栈与 UI 库深度解析
为了实现极致的美感、流畅的“节点依次显现”动画以及避免 DOM 穿模，果断放弃纯 SVG/CSS 3D，全面转向 WebGL （Three.js） 是唯一的最佳实践。

核心渲染引擎：R3F等，根据实际情况决定。你可以联网搜索优秀实践。

为什么选它： 它是 React 生态中最权威的 Three.js 声明式封装。你可以像写 React 组件一样写 3D 场景，完美融入现有的架构中。库提供了现成的极致网格 （）、发光效果 （） 和 HTML 混合遮罩 （）。drei<Grid><Bloom><Html>

动画引擎： GSAP

我们的web大量地使用了 GSAP 的时间轴控制，而GSAP 可以直接驱动 Three.js 中的 3D 属性，我们需要注意设计从打开整个界面到区域线条绘制到画布完全覆盖结束后的一刻，同步开始动态显示这幅美丽的科技风地图。所以你需要精心设计时间轴，确保它们在画布完全生成完成后再显现，动态设计时精准控制每一个光柱从 Y 轴升起 ()、透明度渐现 ()，实现“节点依次在地图上显现”的震撼开场。gsap.timeline()position.yopacity

后处理特效（后处理）：@react-three/后处理

你需要开启全局泛光 （Bloom Effect），但又要确保底部网格并非简单的设计，网格每根线条的粗细、整体的颜色色系可以精心设计。让光柱和雷达扫描扇面产生真实的光晕而并非单纯的透明色块叠加，这是 CSS 很难高性能模拟的。

核心视觉元素设计规范
极简高定网格 （Premium Grid Base）

抛弃传统的全白线框。使用明显的蓝色绘制主网格，网格的绘制也需要时间轴入场线条动画。无需做一个无限远的网格，只需一定范围即可。

中心雷达（Lighthouse Radar Sweep）

在坐标原点使用带有透明度渐变的材质，缓慢、匀速旋转，如同雷达扫过整个沙盘

倒圆锥数据锚点 （倒圆锥柱）

普通节点： 长的倒锥体 (顶部半径大一些，底部极尖锐甚至为0)。采用加法混合 () 材质，颜色为半透明且明亮的的蓝色 ()，底部触碰网格的点可以加一个静态的发光微粒。CylinderGeometryAdditiveBlending#00d2ff

当前终端 （Active Server）： 视觉焦点。这根光柱将被赋予高对比度的警戒色或能量色（例如明亮的金、红色等），并在其底部添加一个不断向外扩散并消失的波纹动画 ()，以彰显其“当前所在位置”的特殊层级。

视觉层次（Z-index）：在这种透视布局中，确保光柱的 HTML 节点在 DOM 树中的顺序或层级正确，避免出现远处的底座遮挡近处光柱的穿模问题。

gsap、时间轴的注意事项详见readme中“### 防 FOUC 的通用提示词”和“### React + GSAP 动画最佳实践解析”来严格保证呈现效果。

### 本次任务：
结论：
最优技术栈： Three.js + React Three Fiber (R3F) + Drei + @react-three/postprocessing + GSAP
UI 体系：2D 面板继续走现有 React UI 组件库，3D 场景内部用 Drei 组件，不要把 2D 图表库硬塞进 3D 场景中
不建议主路线：纯 SVG/CSS 做 2.5D（可做草图，不适合你这种动态光效和层级遮挡需求）
以上结论与我在 README.md:L914-963 的目标高度一致


请为我构思一个2.5D铺展于地面的效果的网格式地图，在我现有的一块SVG画布上放置一个能够左右旋转查看的方形网格状地图，地图上有几个格点上会向上显现一个倒锥形光柱，就像锚点、信标一样。这一部分的前端创作理念就是这是一个软件，登陆后你就是一个节点，与此同时你的附近还有几个人也在使用这个软件，就会有好几个节点显示在地图上，而现在我们是直接简化呈现逻辑，直接使用网格来代替需要复杂外观设计的地图，然后把这个网格做成铺在地面上一样，我们是一个略俯视的视角来查看这个网格地图，我所在的光标应该高亮显示，代表这是我的节点，其它节点的光柱统一成其它颜色。

配合SVG+GSAP如何实现网格地图从界面打开，到SVG画布呈现，再到网格线条逐条绘制，最后是棱锥光柱的显现————我们需要设计一个详细可行的时间轴，确保在SVG画布完全生成完成后，再开始绘制网格线条，同时也确保在网格线条绘制完成后，再开始显现棱锥光柱：
- Stage A（界面开场）：容器/分区线/白色 SVG 画布先完成（你已有全局时序）
- Stage B（画布确认）：仅当“画布完全覆盖”信号为 true 才进入网格绘制
- Stage C（网格绘制）：横纵线条按批次或逐条 stagger 绘制（先主网格后次网格）
- Stage D（雷达/底光）：网格结束后再开雷达扫面与地面微辉光
- Stage E（光柱显现）：普通节点倒锥光柱按序升起（ y + autoAlpha ）
- Stage F（当前节点高亮）：我的节点最后出现，附加底部扩散波纹循环
- Stage G（稳态）：仅保留低频循环（雷达旋转、轻微呼吸），避免高负载常驻动画

建议参数：
- A→B 门控延迟：0（靠状态门控，不靠硬编码等待）
- 网格绘制总时长：0.5~0.9s（规模越大越靠上限）
- 网格 stagger ：0.015~0.04
- 光柱单体升起：0.35~0.6s（ power2.out ）
- 光柱节点间 stagger ：0.08~0.15

工程实现要点：
- 不用 gsap.from() 做首帧隐藏，按你文档要求用 CSS 初始态 + gsap.to()
- 主时间轴用 label 串联： canvasReady -> gridDone -> beaconStart -> activePulse
- 所有子动画挂在一个 master timeline，卸载时统一清理（避免 React 严格模式双触发残留）
- 坚持 SVG 实现：做线条绘制和 2D 假透视

R3F/后处理官方实践（性能与时序管理）：
- R3F pitfalls: https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls
- R3F scaling: https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance
- Bloom: https://react-postprocessing.docs.pmnd.rs/effects/bloom

### 第五窗口右上角（d4）可视化

我将制作一个可以实时监测我个人节点的数据库再某时间段对于全局的价值高低：
所以，你需要仿照d1、d2的顶栏介绍栏设计，也为d4做一个顶栏，写明此d4模块的名称。
这个曲线图是呈现在我web的一个svg白色画布上的，它只需要有轴和曲线和标注内容即可，无需从背景开始全盘考虑——这个曲线图将显示最近某段时间内，我的节点的数据库对全局节点的输出结果有多大贡献。
实时识别当前系统时间点，如，当前为上午十一点半，则显示前五个整点小时内的数据
横轴：7：00、8：00、9：00、10：00、11：00
指的是在这段时间内，服务器所有节点向所有节点的总数据库的所有提问，大模型产出回答，考虑这段时间所有回答的溯源来源——来自我自己节点的较多，则曲线在某一时间段升高，若由我自己的数据库提取出的回答少，则此段下降，我们前端可以先模拟一下具体数据。（这一段你必须深刻理解，这涉及到具体功能层面）
而我们仍然遵循GSAP的时间轴设计，确保在d4白色画布完全渲染出来后，同步开始播放这段“显示曲线图”的时间轴，从左到右依次浮现坐标轴、标注内容。并且我们需要增加一些美观的元素：我建议将这个曲线图做成海浪般从下向上推动升起的完美设计，由于我们的曲线本就是完美的贝塞尔曲线，将其如海浪般从坐标轴横轴向上推升至停止，曲线的下端也拖曳出美丽的渐变光影，将这个曲线由线段变为有厚度的光带。曲线的颜色可以参考d1、d2的元素的颜色，但要有所区分。

### 第五窗口右下角（d5）词云
d5的标题栏仿照d1、2、4的样式和字体做

下面的云图内容可能需要运用svg+gsap动态呈现，从界面打开，到d5的纯白SVG画布呈现，这个时候才开始动态延迟呈现一个个词汇组成云图，极具美感和动态层次感，我希望你做到这一点，这个文件夹的其它模块应该有很成熟的gsap+时间轴实践逻辑，readme里和代码里都有成熟实践，你可以深度学习。
此外我需要你将d5和d3联动：
原因是d5的词云在功能性宗旨上是基于所在节点的相对于这一个节点自己的数据库，基于这个数据库生成的词云（默认状态下显示我本人的节点）——而我想实现的是可以轻点d3的其它光柱（根据readme所言，网格代表地图，光柱就代表节点、不同的服务器），是可以切换成那个节点它自己的数据库生成的云图的，所以我们前端要做到以下两点：
1、新增d3地图上光棱柱节点可交互功能，默认打开页面时是默认选取我自己的节点，而如果我要点其它光柱切换成其它节点，则光柱轮廓微微变亮（带来一种被选取的状态的感觉），然后很自然地重新播放新的d5词云
需要提升状态（Lifting State Up），用一个变量来记录当前选中的节点 ID，并将其作为 props 分别传递给 D3 和 D5。
D3 （地图组件）：接收 和 回调。当用户点击地图上的某个光柱时，触发回调更新顶层状态。同时，根据当前的 ，使用 React Three Fiber （R3F） 或 GSAP 让对应的光柱材质亮度提升（例如增加 emissive 强度、泛光 bloom 阈值或改变轮廓线颜色），产生一种自然且高级的“被选取”视觉反馈。selectedNodeIdonNodeSelectselectedNodeId
D5 （词云组件）：接收 。当这个属性发生变化时，D5 会获取对应节点数据库的词频数据，清理旧画布，并触发 GSAP 动画重新绘制 SVG 词云。selectedNodeId

2、我们要确保每次点不同节点会按照svg+gsap+时间轴动态美观呈现新的词云。对于d5词云，我建议你使用我通篇使用的google中文字体，深度学习网上优秀美观的词云的代码实现方式，给我设计一个足够美观大气的词云。


### 第五窗口（d3）地图重新设计：

完全颠覆掉目前的d3内容，删干净，我们重新来过，构筑一个更高级的可交互式地图
我现在手头有一个svg黑色画布，我将在这一片区域上设计五个立体浮雕风板块式地图区块，它们轮廓真实，边缘像中国地图的行政区划一样参差不齐，这样看上去很真实。

你的任务是重写当前的 D3 窗口地图组件，为我打造一个充满科幻感和动态交互感的 2.5D 板块地图沙盘。

#### 【核心视觉画面描述（仔细阅读以理解意图）】
请想象一张真实的国家行政区划地图（包含南京五区：浦口、雨花台、建邺、鼓楼、秦淮）。这些板块绝不是规则的矩形，而是具有参差不齐、复杂且真实边缘的“拼图”。
它们紧紧拼接在一起，放置在一个纯黑色的 <svg> 画布中。通过 2.5D 等距视角，这些拼图看起来就像是被放置在“地面”上一样，并且它们是有实体厚度的。
当鼠标按下某个板块时，该板块会如同演唱会舞台的某个区域被机械臂独立抬升起来一样。同时，因为板块有厚度，在它被拔高时，它露出的侧面截面会瞬间亮起高亮的霓虹灯效，以此极其耀眼地宣告它被选中了。

#### 【技术红线 (Strict Constraints)】

数据源：项目本地已有提取好的真实边界数据：./core_five_districts.json。

严禁造假：严禁使用任何 Mock 数据或简单的正方形/多边形代替！必须使用 d3.geoMercator().fitSize() 和 d3.geoPath() 将这 5 个区的真实 GeoJSON 轮廓精准渲染为原生的 SVG <path> 字符串。

DOM 隔离：使用 React 渲染所有 SVG 元素，D3 仅作数学计算。

#### 【2.5D 视角与厚度伪造算法 (Architecture & Extrusion)】

上帝视角：通过对包裹 <svg> 的外层 <div> 容器应用 CSS transform: perspective(1000px) rotateX(60deg) rotateZ(-30deg) 来实现等距上帝视角。绝不要对 SVG 内部的 <g> 或 <path> 标签使用 3D Transform，这会导致 SVG 渲染错乱。

分层伪造厚度（极度重要）：遍历 JSON 数据时，对于每一个区，必须在一个代表该区的 <g> 分组内，渲染多层 <path> 堆叠以伪造出视觉上的物理厚度。

Bottom Layer (底座): 颜色最暗，在 Y 轴固定向下偏移（如 transform="translate(0, 15)"），永远固定在地面。

Middle Layers (侧面墙体/截面): 渲染 3-5 层中间路径（或者用 SVG <polygon> 缝合边缘），填补顶盖和底座之间的缝隙。默认状态下颜色较暗、无发光。

Top Layer (顶盖): 真正的地图表面，带有半透明的科技青色填充（如 rgba(0, 255, 255, 0.1)）和明亮的青色轮廓描边。

#### 【GSAP 动态编排 (The Stage Lift & Neon Glow)】
组件需要接收并响应父组件的 selectedNodeId 和 onNodeSelect props。

演唱会舞台抬升：当用户点击某个区（触发 onNodeSelect 并更新状态）时，使用 gsap.to() 获取该区块的 Top Layer (顶盖) 和 Middle Layers (侧面墙体)。将顶盖沿 Y 轴向上移动（例如 y: -30，具体值通过变量控制），侧面墙体也跟随拉伸以维持厚度连续性。使用 power3.out 或带有轻微弹性的缓动函数，呈现机械感。

截面高亮觉醒：在抬升的同时，GSAP 必须接管 Middle Layers (侧面墙体) 的样式属性，将其从暗淡的颜色瞬间补间（Tween）为高亮的荧光青色/赛博蓝色（或者通过 GSAP 动态改变不透明度/叠加滤镜），完美呈现“纵截面高亮特效”。

状态互斥与降落：当点击新的区域时，之前被选中的区域必须通过 GSAP 平滑降落回原位，顶盖回到 y: 0，截面高亮平滑熄灭。

请输出高可读性、带有详细中文注释的 React 组件完整代码，包含所有相关的 D3 投影逻辑、SVG 结构和 GSAP Hook (useGSAP 或 useEffect) 动画逻辑。

#### 【GSAP 动效与技术栈细节补充指示】

我对你提出的基础架构没有异议，但你在 GSAP 的运用上缺乏具体的实现细节。我绝不允许使用简陋的动画，你必须严格遵循以下 GSAP 编排逻辑，展现出极致的科技感：

1. 核心技术栈明确：

状态管理：利用 React useState 或传入的 props 控制选中态。

动画引擎：必须使用 @gsap/react 提供的 useGSAP hook，配合 gsap.timeline() 进行多维度的复杂动画编排。绝对禁止使用 CSS transition 处理位置或颜色的变化。

2. 机械抬升剧本 (The Mechanical Lift)：

当触发选中时，不要仅仅是线性移动。请使用 gsap.to() 操作 Top Layer，将其 y 坐标上移（如 -40）。

关键点：必须使用 ease: "back.out(1.2)" 或 ease: "power3.out" 这样的缓动函数，使其在升到最高点时有一种干脆的、类似物理机械锁定的微小回弹感。

3. 侧壁拉伸剧本 (The Wall Stretch)：

在 Top Layer 抬升的同一时间，那 15 层用来伪造厚度的 Middle Layers 不能直接瞬移，也不能像一块铁板一样跟着顶层走。

关键点：你需要使用 GSAP 动态计算这 15 层路径的 y 坐标，使其在 y: 0 到 y: -40 之间均匀散开，形成连续拉伸的视觉错觉。

4. 霓虹觉醒特效 (The Neon Glow)：

同样在时间轴的并行阶段，使用 GSAP 修改这 15 层 Middle Layers 的 fill 属性。

它们需要从默认的暗沉色，平滑过渡（Tween）到高亮的赛博青色（例如 #00F2FE）。

如果性能允许，配合原生的 <feGaussianBlur> SVG 滤镜，并在 GSAP 中动态控制其 stdDeviation 属性，实现从无发光到刺眼发光的霓虹灯呼吸效果。

请在接下来的代码生成中，严格将上述 GSAP 时间轴逻辑体现在组件内部。

#### 【D3 渲染 GeoJSON 的核心法则（The Golden Rules of GeoJSON Rendering）】

1. 警惕“反向渲染”陷阱（The Winding Order Trap）
现象诊断： 以后只要你在使用 D3、Three.js （WebGL） 或任何图形引擎渲染 GeoJSON、SVG Path 或 3D 几何体时，发现原本该是不规则多边形的地方，变成了一个巨大的矩形块、全屏纯色、或者内部镂空的奇怪形状。

第一反应： 不要去检查 CSS 样式，也不要去怀疑投影放大的倍数。 立刻意识到：这 100% 是数据坐标点的缠绕方向（顺时针/逆时针）跟渲染引擎的“右手定则”打架了。 

2. 尺度决定投影策略：“降维打击”（比例决定投影）
你的 AI IDE 这次用的修复方法非常聪明，这就是我们要记住的第二条法则：

宏观尺度（国家/大洲/全球）： 必须使用球面投影（如 ），因为地球是个球体，大范围铺开有曲率变形。 但此时必须提前清洗数据，使用类似 这样的库，强行把 GeoJSON 里的所有坐标顺序纠正为 D3 能看懂的标准。d3.geoMercator@turf/rewind

微观尺度（市级/区级/街道）： 比如你的南京五区。 在这个极小的尺度下，地球的曲率几乎可以忽略不计。 果断放弃复杂的球面投影，直接“降维”将其视为普通的 2D 平面坐标！ 使用 （直接映射并翻转 Y 轴适应屏幕），不仅完美绕开了所有的缠绕顺序 Bug，还能省下大量的球面三角函数计算，极大地提升渲染和 GSAP 动画的性能。d3.geoIdentity().reflectY(true)

3. 不要盲目信任“野生” GIS 数据（Never Trust Raw Data）
无论是从阿里云 DataV、高德 API 还是开源仓库拿到的 GeoJSON，前端千万不要直接假设它是“即插即用”的完美数据。

不同的制图软件导出时的默认规范（RFC 7946 标准）执行力度不一。 在把数据喂给昂贵的动画组件（特别是你这种需要复制 15 层来做 2.5D 厚度的重型组件）之前，一定要先在一个最简陋的  里用单线条描边测试一下轮廓是否正常。<svg>

##### 重要对话

我们已经完成了 2.5D SVG 地图的基础架构（15层 堆叠伪造厚度 + GSAP 抬升动画）。但我对目前的视觉呈现（UI/Visuals）极其不满意。当前的板块看起来非常扁平、廉价、颜色脏且缺乏物理光影质感。描边生硬，填充死板。
保持现有的投影逻辑、DOM 深度排序逻辑以及 GSAP 动画逻辑绝对不变。你的唯一任务是：大幅重写 SVG 的渲染样式（填充、描边、滤镜、阴影），赋予其“3A级科幻大屏 / 全息作战沙盘”的极致视觉质感。
1、地图不能孤零零地飘在纯白背景上。请在最底层的 中定义一个 ，绘制一层极其微弱、带有透视感的深蓝色等距网格线 （Isometric Grid）（如 ），让板块有一种放置在“全息操作台”上的沉浸感。<svg><pattern>rgba(0, 255, 255, 0.05)
2、地图面向用户的透视角度不对，现在有点歪了。
3、顶盖材质：磨砂玻璃与全息渐变（全息表面）

废弃单调的纯色填充。在 中为顶盖 （Top Layer） 创建一个 。<defs><linearGradient>

渐变方向应带有一定角度。

颜色配置：从深邃的午夜蓝过渡到略带透明度的赛博青（例如： 到 ），模拟一种磨砂玻璃内部透光的质感。

3、侧壁光影：伪 3D 漫反射（挤出阴影）

现在的侧壁看起来像一坨糊掉的阴影。

优化方案：利用 React 的 遍历这 15 层时，动态计算每一层的颜色。最底层应极其暗沉，越往顶层越亮。这种由暗到亮的颜色递进
（确保不是光污染，要自然、高级、协调）

4、霓虹边缘与高级发光


在  中创建一个高级的 ，组合使用  和 ，让顶盖的描边不仅有一条实线（如 ，），还能向外溢散出一层柔和的青色光晕。<defs><filter id="neon-glow"><feGaussianBlur stdDeviation="3"><feMerge>#00F2FEstrokeWidth: 1.5


5、字体优化：所有出现的字体都必须换成我们第五界面其它模块一直惯用的钉钉中文字体。

6、仿照d1、d2、d4、d5部分的最上方的标题栏，为d3也制作一个同样式的标题栏，相关参数和动画逻辑直接照搬即可，无需擅自改动。

7、现在的d1、d2、d4、d5的svg画布背景颜色好像是白粉色，我觉得不是很好看，我们换成这样F5F5F5的米白色吧。

### 数据库窗口重构

目前的数据库窗口样式详见本README（## 第四个窗口：数据库（Database Window）P634-P762）
主要使用了报纸风和简约风的UI样式。
但是实际上，如果你认真深度阅读了本web的第一窗口（log in）、第三窗口（交互对话），你会发现，它们对新窗口的浮现并非像当前这个直接弹出，而是都使用了大量的SVG和GSAP动画，具体实现了四线绘制和画布浮现扩张效果，遵循严格的时间轴，并且代码部分已经非常成熟可行，我们完全可以照搬过来，无需擅自修改已有代码的成熟逻辑。
那么，具体哪个部分要照搬呢？其实是新建聚类按钮按下后跳出的聚类窗口（新建聚类 聚类名称 输入聚类名称… 取消 确认创建）

然后，我们将做一个更加艰难的决定：当前的数据库窗口是可下拉的长窗口，两个页面大小。而现在，我们将试图将两个页面融合成同一个页面，原因是当前的页面不够集约，好多模块比较分散，展示性过强而实用性不算太好。
具体规划如下：
仍然以SVG+GSAP的线条动画作为新窗口的浮现方式（MVP），保留第一屏形式，将第二屏的内容移植到第一屏中，具体这么做————删去第一屏右三分之一部分的一竖排（这里面本来内容是：已有聚类数量 总文件数量 最近添加文件日期）
然后新增一根gsap竖线大致位于中间偏左，然后右边一大片都存放原本第二屏的内容
也就是说整个页面是这样的，具体有两条主线条，一条是竖线，就是中间偏左从上往下画满屏幕，另一条是横线，其实就是原本第一屏的这根横线，但是右边不再是画到右三分之一那根竖线了，而是只画到中间偏左那根竖线的位置为止。
然后以这跟竖线为标的，左侧都不用变，就是原来的介绍文字加新建聚类按钮，各个元素都不用变。
右侧，大概是屏幕一半多一点，就是原本第二窗屏的聚类列表————本来第二屏聚类列表其实就有一条竖线：
核心知识库  | 文件数: 12
           | 2026-03-15
研究文献集  | 文件数: 7
           | 2026-03-16
实验数据集  | 文件数: 3
           | 2026-03-17
可以照搬过来，作为当前第一屏右侧聚类列表的一根竖的副线
另外，按下聚类列表中某个聚类后跳出的那个窗口无需改动，我认为现在的样式很好看很美观，所以不要动。
1、确保所有线条都使用gsap进行绘制，有各自严格的时间轴————有助于统一整个web的主题样式。
2、将整个第四窗口（数据库）出现的所有文字都换成google font的字体。
3、保证删除部分代码对全局代码逻辑没有影响，许多交互逻辑都不用变，说白了这一次仅仅是UI布局上的调整。
4、对文件夹的改动需要符合vercel给出的react最佳实践，确保代码结构清晰，易于维护。


#### 第五窗口d3区域
1、在按下“浦口区”板块时，居然同时升起了“浦口区”和"秦淮区两个板块，这是很不应该的，我们必须搞清楚每个板块的独立逻辑
2、d3区域的顶部介绍栏不应该使用灰色。还是应该换成白色底，黑色文字。其它元素的颜色你自己协调使用。
3、当前的每个板块上面的地区名称文案并没有使用我们第五窗口一直在用的tiktok字体，并且斜体不美观，请尝试修改字体或直接颠覆文本呈现样式。
4、我们已经完成了 2.5D SVG 地图的基础架构（15层 堆叠伪造厚度 + GSAP 抬升动画），目前d3区域内有五个伪3D的板块、每个板块上模拟了文字
现在我们在每个板块上添加一个光柱，具体样式如下：
光柱是一个倒置圆锥形，像锚点、信标一样。是较长的倒锥体 (顶部半径大一些，底部极尖锐甚至为0)。无需遵循整个板块的投影倾斜度逻辑，独立制作即可。采用加法混合 () 材质，颜色为半透明且明亮的的蓝色 ()，底部触碰网格的点可以加一个静态的发光微粒。d3地图上光棱柱节点可交互功能，默认打开页面时是默认选取我自己的节点，而如果我要点其它光柱切换成其它节点，则光柱轮廓微微变亮（带来一种被选取的状态的感觉），然后很自然地重新播放新的d5词云————这是一个d3、d5联动的效果。
光柱视觉层次（Z-index）：在这种透视布局中，确保光柱的 HTML 节点在 DOM 树中的顺序或层级正确，避免出现远处的底座遮挡近处光柱的穿模问题。
gsap、时间轴的注意事项详见readme中“### 防 FOUC 的通用提示词”和“### React + GSAP 动画最佳实践解析”来严格保证呈现效果。

所以，我具体描述如下动画样式：
打开页面时，默认初始抬升某一个板块，显示对应的词云（此处已经实现了对应板块的对应词云功能，无需改动）
同时，此板块的光柱高亮，表明此时此板块状态为已被选取。

现在我们知道，默认打开页面时某一个板块抬升，板块上方的光柱高亮。那么，如果我要点其它光柱、或是点其它板块，则此板块正常下降，光柱高亮状态消失，我选的那个另一个板块正常抬起，对应光柱正常变成高亮，然后很自然地重新播放新的d5词云。
光柱的svg层级应该完全在板块gsap+svg层级之上，因为每个光柱对应一个板块，所以要严格规范其位置参数，确保光柱倒锥形的尖端恰好指向板块内部，协调好每个光柱的位置，不要太靠近太重合，必要情况下你可以适当调整一下各个板块的大小，防止由于相邻板块都比较小而导致光标太过于接近。
光柱的倒锥形确保要做成非常高级美观的样式，可联网搜索相关实践或者选用最先进的UI库。
我曾经制作过类似的东西，这里有一套提示词提供给你，如下，你看看有没有值得学习运用的地方：
需要提升状态（Lifting State Up），用一个变量来记录当前选中的节点 ID，并将其作为 props 分别传递给 D3 和 D5。
D3 （地图组件）：接收 和 回调。当用户点击地图上的某个光柱时，触发回调更新顶层状态。同时，根据当前的 ，使用 React Three Fiber （R3F） 或 GSAP 让对应的光柱材质亮度提升（例如增加 emissive 强度、泛光 bloom 阈值或改变轮廓线颜色），产生一种自然且高级的“被选取”视觉反馈。selectedNodeIdonNodeSelectselectedNodeId
D5 （词云组件）：接收 。当这个属性发生变化时，D5 会获取对应节点数据库的词频数据，清理旧画布，并触发 GSAP 动画重新绘制 SVG 词云。selectedNodeId
5、请将xx区的字样全部换成text1、text2…………，具体涉及到d3各个板块上面的名字、d5的云图上面模拟的地点词汇，避免使用真实的地点，做到仅呈现模拟数据。

6、配合SVG+GSAP如何实现板块地图从界面显现，再到棱锥光柱的显现————我们需要设计一个详细可行的时间轴，当前状态是确实在线条绘制完成、SVG画布完全生成完成后，再显示，再开始显现棱锥光柱：
已有全局时序：
- Stage A（界面开场）：容器/分区线/白色 SVG 画布先完成你
- Stage B（画布确认）：仅当“画布完全覆盖”信号为 true 才进入板块显现
- Stage C

建议参数：
- A→B 门控延迟：0（靠状态门控，不靠硬编码等待）
- 网格绘制总时长：0.5~0.9s（规模越大越靠上限）
- 网格 stagger ：0.015~0.04
- 光柱单体升起：0.35~0.6s（ power2.out ）
- 光柱节点间 stagger ：0.08~0.15

工程实现要点：
- 不用 gsap.from() 做首帧隐藏，按你文档要求用 CSS 初始态 + gsap.to()
- 主时间轴用 label 串联： canvasReady -> gridDone -> beaconStart -> activePulse
- 所有子动画挂在一个 master timeline，卸载时统一清理（避免 React 严格模式双触发残留）
- 坚持 SVG 实现：做线条绘制和 2D 假透视

R3F/后处理官方实践（性能与时序管理）：
- R3F pitfalls: https://docs.pmnd.rs/react-three-fiber/advanced/pitfalls
- R3F scaling: https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance
- Bloom: https://react-postprocessing.docs.pmnd.rs/effects/bloom

7、现在的板块颜色是黑色到深蓝色的渐变，这与我们整个宏观平台的白色主题界面不搭配，请更换成较浅的蓝色系渐变；svg画布模拟的厚度阴影选用了现在的黑色，也与浅色主题风格不搭，尝试更换成另一种适合做板块侧面的这种浅蓝色渐变。

8、对第五界面（宏观平台）的d3此时我们已经实现了板块+光标呈现选取的状态，但是我们还需要制作类似弹窗的东西，使每个板块选取后跳出对应的弹窗，并显示一些此板块对应的信息。目前有五个模拟板块，请为我硬编码5个板块的弹窗（指的是每个弹窗的位置并不一样，你可以对每个板块选取后的弹窗显示位置在d3做一个规划，使其不仅靠近那个板块，而且确保呈现在d3空白区域，不遮挡整个大板块地图），并添加一些模拟的数据。
弹窗的样式可以采用svg+gsap，线条+画布+时间轴的逻辑————这个逻辑在我的项目的第一窗口（登录）和第三窗口（交互对话、模型配置）都有很成熟的实践，你可以设置线条框架绘制的时间轴，然后待到弹窗框架的四条线绘制完毕后按照我们曾经的成熟代码逻辑动态填充出一个svg画布，画布颜色可以使用F5F5F5，仍然跟readme中对第一窗口、第三窗口曾经的注意点保持一致————即确保svg+gsap的规范使用、明确画布并非div卡片，而是严格按照四条线的矩形为扩张边界，到时候弹窗内的所有内容都放置在这个svg画布中。

五个光标对应五个板块，点击任一板块弹出对应弹窗，对话框需清晰展示对应实体信息。第一个光标弹窗展示实体为故意杀人案，类型为事件，描述为 2020 年 8 月 3 日秭归县发生的故意杀人案；第二个光标弹窗展示实体为郭某某，类型为人物，描述为秭归县 54 岁男性受害者，因纠纷谈判时被唐某杀害；第三个光标弹窗展示实体为谋杀案，类型为事件，描述为镇江持刀伤人案及 2020 年 8 月 27 日上午在三茅宫新村某室内发生的谋杀案。……按照这样的形式你再设计两个，凑齐五个。弹窗需简洁明了、交互流畅。

上面是我们已经完成的，
接下来我要给你派的任务是：

现在每个弹窗的空间坐标布局我已经精心修改过，不要再改了。

现在我需要你将弹窗重构成一个新的卡片，我有一个卡片样式模板，你可以直接照搬（尽量照搬，不要擅自改动）：
html：
 <div class="card">
      <p class="card-title">Product Name</p>
      <p class="small-desc">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quaerat
        veritatis nobis saepe itaque rerum nostrum aliquid obcaecati odio
        officia deleniti. Expedita iste et illum, quaerat pariatur consequatur
        eum nihil itaque!
      </p>
      <div class="go-corner">
        <div class="go-arrow">→</div>
      </div>
    </div>
css：
.card-title {
  color: #262626;
  font-size: 1.5em;
  line-height: normal;
  font-weight: 700;
  margin-bottom: 0.5em;
}

.small-desc {
  font-size: 1em;
  font-weight: 400;
  line-height: 1.5em;
  color: #452c2c;
}

.small-desc {
  font-size: 1em;
}

.go-corner {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  width: 2em;
  height: 2em;
  overflow: hidden;
  top: 0;
  right: 0;
  background: linear-gradient(135deg, #6293c8, #384c6c);
  border-radius: 0 4px 0 32px;
}

.go-arrow {
  margin-top: -4px;
  margin-right: -4px;
  color: white;
  font-family: courier, sans;
}

.card {
  display: block;
  position: relative;
  max-width: 300px;
  max-height: 320px;
  background-color: #f2f8f9;
  border-radius: 10px;
  padding: 2em 1.2em;
  margin: 12px;
  text-decoration: none;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(to bottom, #c3e6ec, #a7d1d9);
  font-family: Arial, Helvetica, sans-serif;
}

.card:before {
  content: '';
  position: absolute;
  z-index: -1;
  top: -16px;
  right: -16px;
  background: linear-gradient(135deg, #364a60, #384c6c);
  height: 32px;
  width: 32px;
  border-radius: 32px;
  transform: scale(1);
  transform-origin: 50% 50%;
  transition: transform 0.35s ease-out;
}

.card:hover:before {
  transform: scale(28);
}

.card:hover .small-desc {
  transition: all 0.5s ease-out;
  color: rgba(255, 255, 255, 0.8);
}

.card:hover .card-title {
  transition: all 0.5s ease-out;
  color: #ffffff;
}


#### SVG 天生的缺陷：它没有真正的深度缓冲区（Depth Buffer）。

这里面的技术痛点非常残酷：

画家算法（Painter's Algorithm）的诅咒：SVG 没有真实的Z轴坐标。谁显示在最上面，完全取决于它在 HTML/DOM 结构里排在第几行（越靠后的节点，渲染层级越高）。

牵一发而动全身的 DOM 顺序： 当你使用 15 层 来模拟伪 3D 厚度时，为了让“板块 1”在点击时看起来比“板块 2”高，并且正确遮挡“板块 2”的侧面，你甚至可能需要在动画执行时动态去改变它们在 DOM 树里的排列顺序。<path>

贴图的毁灭：一旦你在某个板块的顶层（或者 SVG 的某个特定层级）插入了自定义的贴图（比如 或 ），只要发生交互（升降、缩放），相邻板块的那些“假侧壁”就会因为 DOM 层级的瞬间重排，直接把你的贴图无情覆盖。 由于涉及的节点太多、形状太不规则，你根本无法写出一个完美的算法去实时动态修正这种 DOM 层级关系，所以遮挡一旦发生，看起来就是“不可逆”的系统性崩溃。<image><pattern>

这也是为什么你决定彻底转向 Three.js（WebGL）是绝对正确的选择。

在 Three.js 的真 3D 渲染管线中，这个问题直接降维消失了：

真正的 Z-Buffer：WebGL 拥有原生的深度缓冲。 不管你的代码里先写了哪个板块，GPU 在渲染每个像素时，都会自动计算它离相机的真实物理距离。 谁在前面，谁就能被看到。

材质与几何体绑定： 在 Three.js 中，贴图（Texture）是作为材质（Material）的一部分，像皮肤一样死死“贴”在挤压出来的 3D 几何体（ExtrudeGeometry）表面的。 板块升起、下降、旋转，贴图都会完美跟着模型走，绝对不会发生“图层打架”互相乱穿插遮挡的问题。

以上内容向你表明，此次我们将要将“第五窗口（宏观平台）的d3 sandbox”彻底进行重构。

我现在在根目录上上传了一个SVG框架————C:\Users\Admin\final\JSPI.svg，
这个svg框架展示了2D的五个封闭线框，这就是我想制作的五个板块的2D形状。当然我需要你将其渲染为3D立体厚度板块。
拿出这份线条框架将其进行3D渲染操作，具体方式如下：
每个不规则形状的封闭svg框架都会作为我们3D渲染后的一个板块，五个区域按照2D大致布局3D化，做成五个有间距的板块。

板块样式与GSAP动画形态————
布置一个可交互的功能：选取某个板块可使其加厚，上平面太高。因为GSAP+SVG的板快是有实体厚度的，当鼠标按下某个板块时，该板块会如同演唱会舞台的某个区域被机械臂独立抬升起来一样，抬升并非简单的gsap板块向上平移，而是下底不变，上底变高，侧边拉长————严谨地向上伸长侧截面。
你需要：在侧截面厚度部分设计一些竖线，这样更能体现变厚的过程，更具科技感。同时，当板块被拔高时，它露出的侧面截面会亮起赛博线条风的霓虹特效，极其耀眼地宣告它被选中了。
你还需要：精心设计板块厚度部分的的透明度，使其更自然美观，更具科技感。

readme里有着我们上一版d3的叙述性文本，你可以汲取一些可取之处————
1、例如目前的透视俯角比较优秀，可以不改
2、厚度阴影并非倾斜而是向下布置，可以效仿
3、五板块整体虽然是按照2D的svg框架渲染出的3D的效果，但又并非是绝对的正交视图（主视、俯视），引入了偏航角（Yaw，左右旋转）和俯仰角（Pitch，上下倾斜），俯角不大，但能明显看到厚度。
我也在readme里提供了【GSAP 动态编排 (The Stage Lift & Neon Glow)】【GSAP 动效与技术栈细节补充指示】【D3 渲染 GeoJSON 的核心法则（The Golden Rules of GeoJSON Rendering）】，虽然前一版是伪3D的svg硬堆积设计，但当然还是有许多可取之处的，可以从中学习。

最后，因为本d3模块的当前状态不仅有板块，还有光标、弹窗，而且我们这两天还花了大量时间来设计弹窗的坐标位置、校准光标和弹窗的画布层级来防止被板块画布层级遮挡（当然我觉得如果我们重构成真正的3d模块，说不定就不会有这种问题了），我认为我们可以暂时先隐藏掉那个光标和弹窗的代码，先实现我们上文说的一个纯粹的3d板块抬升效果，后续再慢慢添加。

#### 光标贴图引入

接下来我们将为宏观平台的d3界面增设更多元素——下面我们增设光标，我们将光标布置在地图板块上，称之为节点。

我希望使用GSAP的优秀逻辑，达成如下动画效果：
我给你提供一个光标贴图@icon.svg （MVP）C:\Users\Admin\final\icon.svg
这个svg光标贴图有左右两个光标，左边那个红色光标代表我自己的节点，右边那个蓝色光标是其它的节点，我们只布置一个自己的节点，其它的节点都是右边那个蓝色svg贴图的样式。

我们现在d3有五个立体板块，当我点击某个板块，板块抬升后，会动态冒出这个板块拥有的1~2个节点光标，（也就是说初始状态下如果该板块没有被选中，那么对应的那些节点就不会显示出来！）
每个板块布置1~2个蓝色节点，然后在右上角的那个板块中多布置一个红色节点（我自己的节点），至于具体哪个板块布置多少，第1405-1410行会详细说明！

#### 选取与画布

板块抬升后出现的光标默认都是未被选中的，如果鼠标点击选中某一个光标，该光标会轻微抬起并边缘高亮（代表自身被选中了）；此时宏观平台d3区域的标题栏和板块之间的留白区域将会动态拉一个横屏画布（整个d3窗口，除了标题栏占据的宽度外，这个横屏大约占据上四分之一宽度，动态呈现的方式是我们这个项目惯用的技术栈svg+gsap生成画布）

画布的样式可精心设计，字体使用本窗口惯用的钉钉进步体；画布背景为白色，内容字体为黑色

画布内将会逐行展示文本，呈现关于此节点的一些内容

如红色光标（我自己的节点），就可以显示如下内容：
你的节点：
节点名称：安保处
核心数据：xx份文件（与第四窗口“数据库”中文件总量计算代码相对接）
今日更新：xx份文档
调用次数：xx次

（MVP）其它蓝色节点的节点名称可以模拟为：
左上板块设置上下两个蓝色光标，名称分别为“锦程大厦” “模拟街区”
左下角板块设置一个蓝色光标，名称为“警体馆”
最下面的板块设置左右两个蓝色光标，名称分别为“行政楼” “教务处”
中间的那个板块设置左中右三个蓝色光标，名称分别为“教学楼” “图书馆” “现教楼”
右上角设置左右两个一蓝一红光标，蓝色名称为“老山园” ，红色是“安保处”（红色光标节点名称就是“安保处”）

默认状态下，需要增设一个逻辑，即默认先升起右上角那个包含了我红色节点的那个板块，那个板块在打开界面显示出所有板块后即播放升起动画（被选取），并且显现出对应节点，并且，自动使我自己的红色节点被选取，升起并高亮。此时由于节点被选取，那么横屏就会因gsap逻辑被动态拉出来，并动态显示文字内容。

当我选取同一个板块中的其它节点光标时，不必使svg画布消失，可以淡出原内容后直接逐行显现新的关于这个节点的内容。
若轻点空白部分使节点光标退出选取状态，则画布消失，待下一次选取某个节点光标时再拉出svg画布。

补充：如若当前状态是光标已经被选中————呈现出画布了，那么此时轻点第一次空白部分应当是取消“节点选中+上方画布被拉出或淡出”；轻点第一次空白部分，才会使板块取消被选取状态，下降。

前端对于画布的内容，我们模拟一些差异化数据即可。

#### 补充说明

1、对于“选取高亮”，你需要联网搜索优秀的UI样式，使用先进的UI库来呈现高亮特效。
2、对于“svg+gsap的动态设计”readme中有两份文字：@README.md#L862-911 你可以阅读这段内容兴许会对你有帮助。
3、（MVP）请一定确保所有光标的图层在最上方，千万不要使光标图层被板块地图的图层掩盖隐藏了！

### （第三窗口）交互对话页面重构

#### 项目功能叙述论文
以下为论文的功能叙述：
由于部分节点未配置法官聚合模型，不具有成为中心服务器的能力，项目组针对性提供两套问答模式，分别对应节点内检索和联邦聚合检索。配置本地模型后可接入节点网络成为查询对象，能够进行本地查询，节点据实际情况配置法官聚合模型后，可作为中心服务器，向已接入节点发起查询通信并进行联邦聚合，用户若未配置法官模型则“全局”模式无法选取进入。本地模型和法官模型均通过接入测试后，交互页面分别如图5-7、5-8所示。用户输入问题后，节点会在本地数据库中查询或向已接入节点下放查询需求，等待回答返回后聚合，完成答案生成。在“本地”模式下，系统额外提供“溯源功能”，便于用户基于具体内容证实答案生成的准确性，避免黑箱问题。点击回答旁的“溯源”按钮，可查看以相似度最高节点为中心的子图以及相关文本，避免黑箱问题，如图5-9，5-10所示。

#### 信息流区域优化方案

我们总结以下论文中对于信息流功能的叙述：
全局不具备溯源功能，本地才有溯源功能，所以当交互对话界面的“本地/全局”button处于“全局“状态时，对话的回答气泡是不会有”溯源“按钮的；同时为了体现本地模式和全局模式的差异性，我建议当选中全局模式后，由四条线框出的整个矩形svg画布边界动态地发出明亮蓝紫色渐变流动高光，并且使画布中间的那个动态旋转图案颜色从蓝色切换为酷炫的渐变蓝紫色。（卡片边界制作流动霓虹高光，目前有什么先进的UI库里有这个组件？此处请联网搜索最优实践）

#### 模型配置区域优化方案

1、模型配置需要有四类模型：本地查询模型，法官模型，嵌入模型，重排模型

当前未修改状态下的模型配置窗口拥有以下内容：
模型配置
模型服务商选择栏：OpenAI / Ollama / Local
模型选择栏
url输入栏
api输入栏
保存并连接按钮

我们认为每一类模型都应该单独配置相应的baseurl和apikey，故将此页面内容优化如下：

模型配置

本地查询模型：

模型服务商选择
模型选择栏
url输入栏
api输入栏

法官模型：
 
模型服务商选择
模型选择栏
url输入栏
api输入栏

嵌入模型：

模型服务商选择
模型选择栏
url输入栏
api输入栏

重排模型：

模型服务商选择
模型选择栏
url输入栏
api输入栏

保存并连接按钮

当前窗口宽度应该不够放，你做成可下拉栏就行了。请基于目前的页面元素结构，大致减小各个栏目的间距，至少保证一个页面能够完全显示两类模型的全部内容。（因为现在的各个模块间距有点大了，看着很松散）

2、根据论文所述，当你并没有在法官模型那一块配url、api，也就是说，比如，我只填写了本地查询模型url、api，并直接滚动到页面最下方按下了保存并连接按钮，那么此时显然法官模型是没有接入的，此状态下，当你关闭模型配置窗口后在信息流窗口上方的“本地/全局”切换按钮中试图选择全局按钮，则会跳出弹幕提示“未配置法官模型，无法进行全局检索”。

所以，自然状态下，当我什么模型都没配置时，我点击“全局”按钮，应该会跳出弹幕提示“未配置法官模型，无法进行全局检索”。
当我在此状态下直接在本地模式输入问题并点击搜索，输出的气泡内容应该是“未配置本地查询模型，无法进行本地检索”。
当我只配置了本地查询模型，若在本地模式输入问题并点击搜索，输出的气泡内容应该是“未配置嵌入和重排模型，无法生成回复”。
当我只配置了本地查询模型和嵌入模型，若在本地模式输入问题并点击搜索，输出的气泡内容应该是“未配置重排模型，无法生成回复”。
当我只配置了本地查询模型和重排模型，若在本地模式输入问题并点击搜索，输出的气泡内容应该是“未配置嵌入模型，无法生成回复”。
也就是说，本地模式正常生成答案刚需1、3、4类模型，而全局模式如果你没配置2类模型连进都不给进去。
如果配置了法官模型，成功进入了全局模式，若出现以上缺失其它模型的情况，输出气泡同上。

#### 知识溯源页面优化方案

我将会将知识溯源页面做成两页大小的下拉窗口。

当前知识溯源窗口画布的拉入动画做得深得我心，无需改动
然后将知识溯源窗口内部原本三页长度的内容还有关闭按钮等一切东西全部删光。
页面样式为白背景、克莱因蓝线条、蓝字，所有字体皆为钉钉进步体
我们要做的第一页————
使用gsap时间轴绘制线条，线条绘制逻辑参考第一窗口log in窗口的线条慢快慢绘制代码逻辑和css样式。
设置线条如下:
设置竖线：
设置一条竖线c1:位于整个屏幕的左四等分点，时间轴0到0.5s从屏幕最上方画到屏幕最下方，最粗。
设置一条竖线c2：位于整个屏幕的右四分之三区域的左三等分点，时间轴0到0.5s从屏幕最上方画到屏幕最下方，较细。
设置一条竖线c3：位于整个屏幕的右四分之三区域的中点，时间轴0到0.5s从屏幕最上方画到屏幕最下方，较细。

设置横线：
注：所有横线都严格从竖线c1的横坐标开始往右一直要画到屏幕右边界，并非从左边界画到右边界。
设置上下两条横线rtop和rbottom，时间轴0.4到0.8s，从c1开始画到右屏幕边界，单处横线线条为双线，粗细中等。
在rtop和rbottom之间的区域C区域：
设置四条横线r1、r2、r3、r4将C区域等比例分割成五个区域，时间轴分别从上到下依次0.1秒延迟，分别为0.5到0.8s，0.6到0.9s，0.7到1.0s，0.8到1.1s。同样从c1开始一直画到右屏幕边界。

内容：
对于一整个第一页的全屏，
屏幕左边界与c1之间的大片区域，介绍知识溯源，基于向量数据库的语义检索等文字，右四分之三页面追溯本次回答的五条原始知识来源。
c1与c2之间的五个区域模拟填充与生成的答案的语义相关性top5的五段文本
c2与c3之间的五个区域分别从高到低显示语义相关程度（%）
c3到屏幕右边界之间的五个区域显示文本出自哪个文件，显示文件名称。
mock的内容可以根据我的两组问题来续写：（对接我提问时问到这两个问题时对应的数据溯源展示内容）
第一组
问：
《中国法制史配套测试》和《动产担保权公示及优先顺位规则研究》两本书在法学教育中的定位有何不同？请结合它们的出版目的、目标读者群体以及内容特点，分析这两本书在法律专业学习中的具体作用。
答：
1.《中国法制史配套测试》旨在帮助法学院校学生掌握法律专业知识和培养法律思维能力，属于《高校法学专业核心课程配套测试丛书》系列，考点全面、题量充足、解答详尽且应试性强；
2.《动产担保权公示及优先顺位规则研究》则基于我国动产担保实践，深入探讨动产担保的公示制度与优先顺位规则，并提出相关法律对策，以期为完善我国动产担保制度提供立法建议和法理支持。

第二组
问：
在秭归县茅坪镇九里村的故意杀人案中，唐某某因矛盾纠纷持刀杀害了郭某某。而在江苏南通和山东临沂的案件中，孟某被警方抓获。虽然两起案件都涉及暴力行为，但为何前者被定性为故意杀人，而后者目前仅处于进一步侦办阶段？请结合两案中的主观状态与客观后果，分析警方在法律适用上的关键区分依据。
答：
1.在秭归县茅坪镇九里村的案件中，唐某某因矛盾纠纷持刀将郭某某当场杀死，具有明显的故意杀人动机和直接的致死结果，因此被采取刑事强制措施；
2.而在江苏南通和山东临沂的案件中，孟某的具体犯罪行为尚未完全明确，且没有直接导致人员死亡的结果，因此案件仍在进一步侦办中，未明确具体的法律定性。

#### 知识溯源页面第二次优化方案

1、

-将页面左侧"知识溯源"的字样换成：
你可以在此
查看相关文本
或预览文件
了解词条出处

-将语义相关文本（Top5）字样的（Top5）删除

-将c3到屏幕右边界的五个区域中的来源文件mock数据改成两行：
文件所在的聚类名（这是数据库窗口的理论，可以查看学习一下）
文件名.类型后缀

2、将竖线c2删除，将c2和c3之间的”相似度“模块删除，将c1和c3之间的五个区域合并存放原本c1和c2之间语义相关文本。（文本框大小严格契合线条与线条框成的矩形区域的大小）
另外，五个区域每个区域未来都可能会接入一百到二百字的文本数据，所以请你略微缩小字号防止内容超出文本框；并且请你mock每条文本数据，每条模拟到150字左右。

3、将除r1、r2、r3、r4以外的所有线条全部加粗

#### 知识溯源页面第三次优化方案

1、我们将会设置一些更复杂的GSAP动效，具体如下：

目前我们已经设置的动效有：
在溯源窗口的白色画布中使用gsap时间轴绘制竖线和横线
目前我们的知识溯源功能逻辑是：
呈现五横栏的语义相关文本和其对应的来源文件，它们以我绘制的线条为网格框架等效为文本框的参数，实现了线条框出的矩形区域就是文本框的位置。

那么，我们将思维再次延展，使用SVG+GSAP的技术栈，实现此效果：
当鼠标位置处于某一横栏区域时（默认认为单个横栏区域其实包含两个被横竖四线条围成的矩形区域，一个是显示“语义相关文本”的，称作E1，另一个是显示“来源文件”的,称作E2），也就是说检测到鼠标指针处于某个横栏上时，触发以下两个效果：
-E1区域的边界出现滚动的虚线矩形框和荧光高亮，强调其处于被选中的状态

-在“来源文件”栏目单个矩形方格的右下角增设一行： （文件打开的图标）预览来源文件

-E2区域整个矩形连带线条框架，通过SVG画布+GSAP动效的逻辑，将此区域实现颜色翻转：白底矩形变成001BB7的深蓝底矩形，内部所有字的色号从黑色变成白色。动效可逆。也是强调其处于被选中的状态。

补充：第二点的实现可能需要在原先由线条围成的框架上布置一个新的svg 001BB7颜色画布 可能才能实现我的方案需求，这只是我的猜想，你可以联网搜索是否有最优实践或先进解决方案，探究是否有更好的方法。

-只要你鼠标处在某一个横栏里，轻点按钮后，即可触发新交互，动态弹出一个预览窗口，打开并显示你想要预览的文件。（知识图谱里单个聚类里对文件进行单击后打开的弹窗也实现了和这个同样的功能，并且代码很成熟，样式很美观，你可以照搬过来用！）

2、交互对话信息流栏目的上方有一个“模型配置”button的样式非常好看，请你照搬一下按钮样式，然后在我们的知识溯源界面的”你可以在此查看相关文本或预览文件了解词条出处”字样的下方一定距离处放置这个button，按钮名字叫“打开知识图谱”，字数比原来多，所以按钮长度要做长一点。按下按钮后，触发交互，屏幕直接从第一页跳转到第二页。



我们要做的第二页————
第二页将插入一个知识图谱，我们暂时不做，直接空着就行。
