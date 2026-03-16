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

#### 层级结构

```
main-window-page
├── main-window-dotgrid-bg (z-index: 0)     ← 点阵背景
├── main-window-canvas-layer (z-index: 5)   ← SVG 画布
├── chat-interaction-layer (z-index: 6)     ← 聊天交互面板
└── main-window-menu-layer (z-index: 10)    ← 侧滑菜单
```

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
            └── StaggeredMenu.tsx   # 侧滑菜单（GSAP timeline）
```

全局样式：`main-window-page`、`main-window-dotgrid-bg`、`main-window-canvas-layer`、`main-window-menu-layer`、`chat-interaction-layer` 及 `.sm-scope`、`.chat-*` 均在 [`globals.css`](apps/main-platform/app/globals.css) 中维护。

---

### 八、第三窗口验收要求

- 在 Panel 3 点击 Shoot 稳定进入第三窗口；点阵靠近变绿、快速移动与点击有位移回弹；  
- 画布入场后四条线扩张并填充；菜单打开时画布与聊天面板同步左移；  
- 聊天面板：模式切换、发送消息、三阶段气泡、Q 弹入场、FLIP 补间、平滑滚动均正常；  
- 菜单可打开/收起；「返回初始界面」可回到第一窗口；  
- 1024px / 640px 断点下布局正常；无新增 lint 报错。


#### 对第三窗口的回答信息溯源