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
屏幕中央三分之一的大片区域，将会呈现一个模拟的科技风线条地图，我们将设计一些类似光柱的设计，如同地图上的锚点一样（这也与web设计理念相关，例如一片地图区域的派出所每个拥有自己的一个服务器——这一个个终端将会在地图上一个个显现），光柱的位置是地图上服务器的实际位置，而自己终端所登录的服务器所对应的光柱将会高亮显现或换色显现。
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
真实经纬度映射：在实际开发中，派出所的坐标是真实的经纬度（Lng/Lat）。你需要写一个简单的线性转换函数，将辖区的  映射到 SVG 画布的 ，这样服务器光柱的位置才能按真实比例落在地图上。[MinLng, MaxLng][0, svgWidth]

线条性能优化：如果你们有几百条街道的数据，直接渲染巨大且复杂的 SVG 会导致动画掉帧。建议只保留辖区边界和主干道作为带有 GSAP 动画的线条，其余细碎的支路作为静态背景图。

视觉层次（Z-index）：在这种透视布局中，确保光柱的 HTML 节点在 DOM 树中的顺序或层级正确，避免出现远处的底座遮挡近处光柱的穿模问题。


地图底座： 使用深色点阵或网格线（Wireframe）勾勒辖区轮廓，带一点透视效果（2.5D或3D视角），会比纯平面的地图更有“实战指挥”的科幻感。

把 2.5D 地图的“科幻感”和“实战感”拉满，需要你尽量将这个地图绘制地高级大气复杂一些，如果你认为必要的话，可以引入3D引擎。


3. 右侧栏：贡献度与热点分析
d4——贡献前五名柱状图：

视觉优化： 柱体不要用纯色实心，建议使用底部暗色到顶部亮色的渐变，并在柱子顶部加上发光边缘。

交互切换：“当天/本周/本月”的按钮建议做成胶囊型（Capsule）的 Toggle 切换开关，切换时柱状图的升降应带有平滑的弹簧过渡动画（Easing animation）。

d5——语义地点词汇云图（Word Cloud）：

视觉优化： 警务数据的词云需要突出重点。出现频率最高的中心词汇（如“XX中学”）应该不仅字体最大，还可以使用特定的警报色（如红色/橙色）来标示高频风险区域，而比如普通的“XX美食街”用常规科技蓝色即可。可以给词云加一个缓慢的呼吸或自转动画，避免画面死板。

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
视觉特点： 最经典、最优雅的现代 UI 动画。柱体不仅从左向右平滑延伸，同时伴随透明度的渐显。五根柱子像瀑布一样顺滑地依次出场。
技术思路： 使用 GSAP 修改元素的 （需要设置 保证从左向右变长），配合 这种先快后慢的缓动函数，让柱体停下时非常有呼吸感。
在时间轴设计上，你需要阅读readme中“### 防 FOUC 的通用提示词”和“### React + GSAP 动画最佳实践解析”来严格保证呈现效果，具体时间轴为：待到白色画布完全渲染出来后，照搬d1的顶部标题栏浮现实践，同时用0.4秒的时间，让五根柱子同步从左向右生长出来，生长结束后再动态浮现柱状图右侧的文字标注。
