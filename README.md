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

第三窗口由第二窗口 Panel 3 中 **Shoot** 入口点击后进入，作为产品介绍流程的终点页。界面以「交互对话」为主题，由 **全屏点阵背景** 与 **侧滑菜单** 两大模块组成。

### 一、入口与触发

- **触发**：在 [`PanelBlueExtend`](apps/main-platform/app/windows/product/panels/PanelBlueExtend.tsx) 中点击 Aim/Shoot 文案或十字准星区域，执行 `onShoot` 回调；  
- **路由**：[`login-window-demo.tsx`](apps/main-platform/app/login-window-demo.tsx) 维护 `activeWindow`，当 `activeWindow === "main"` 时渲染 [`MainWindow`](apps/main-platform/app/windows/main/MainWindow.tsx)；  
- **返回**：第三窗口内菜单项「返回初始界面」点击后调用 `onBack`，切回第一窗口（登录介绍）。

### 二、技术栈与整体结构

| 类别 | 技术选型 |
|------|----------|
| **框架** | Next.js App Router + React + TypeScript |
| **组件** | 客户端组件（`"use client"`），满足 GSAP / Canvas / DOM 交互需求 |
| **动画** | GSAP + InertiaPlugin（点阵·惯性、菜单开合与列表入场） |
| **绘制** | Canvas 2D + Path2D（点阵）；CSS 控制 `.sm-scope`（菜单样式） |
| **字体** | ZCOOL QingKe HuangYou（与 Panel 2 保持一致） |

整体布局：`MainWindow` 根节点为 `main-window-page`（全屏，相对定位），其下两层绝对定位叠放：

1. **背景层**：`main-window-dotgrid-bg`，铺满视口，承载 DotGrid 点阵；  
2. **前景层**：`main-window-menu-layer`，铺满视口，承载 StaggeredMenu（菜单按钮 + 侧滑面板）。

### 三、模块一：DotGrid 点阵背景

#### 1）视觉效果

- **静态**：全屏规则点阵，默认灰色（`baseColor: #6b6b6b`），在 150% 浏览器缩放下约 50 列 × 28 行；  
- **靠近**：鼠标进入某点一定距离内，该点颜色由灰色线性过渡为荧光绿（`activeColor: #27FF64`），形成「靠近变绿」反馈；  
- **快速移动**：鼠标速度超过阈值且处于某点 proximity 内时，该点受 GSAP Inertia 推动产生位移，随后弹性回弹；  
- **点击**：点击画布时，以点击点为中心一定半径内的点受冲击波推动，再弹性回弹。

#### 2）技术要点

- 单 canvas 铺满容器，`getBoundingClientRect + ResizeObserver` 驱动网格重建；  
- 使用 `requestAnimationFrame` 循环绘制，根据指针位置与每个点的 `xOffset / yOffset` 绘制圆点；  
- 注册 `InertiaPlugin`，对每个点的 `xOffset / yOffset` 做惯性动画与 `elastic.out` 回弹；  
- 事件 `mousemove`（throttle 50ms）、`click` 绑定在 `window`，坐标转换到 canvas；canvas 设置 `pointer-events: none`，不挡菜单交互。

#### 3）参数（当前实现）

| 参数        | 含义                     | 当前取值 |
|-------------|--------------------------|----------|
| `dotSize`   | 圆点直径（px）           | 4        |
| `gap`       | 点中心间距（px）         | 20       |
| `baseColor` | 默认点颜色               | `#6b6b6b` |
| `activeColor` | 靠近时颜色             | `#27FF64` |
| `proximity` | 变色 / 惯性作用半径（px） | 150      |

#### 4）代码落点

- [`windows/main/components/DotGrid.tsx`](apps/main-platform/app/windows/main/components/DotGrid.tsx)：React 版点阵组件（buildGrid、draw、onMove、onClick、RAF、ResizeObserver、GSAP Inertia）；  
- [`MainWindow.tsx`](apps/main-platform/app/windows/main/MainWindow.tsx)：通过 props 传入 `baseColor` / `activeColor`，并挂载于 `main-window-dotgrid-bg`。

### 四、模块二：StaggeredMenu 侧滑菜单

#### 1）视觉与交互效果

- **头部区域**：右上角「菜单 / 关闭」切换按钮（文案随开合滚动切换）+ 加号图标旋转动画，左侧预留 Logo 区；  
- **打开状态**：点击按钮后，右侧滑入多层彩色条（`#9EF2B2`、`#27FF64`）与白色毛玻璃面板；面板内菜单项自下而上、带旋转的 stagger 入场，右侧 1～4 荧光绿编号渐显；  
- **菜单项**：四项中文——「返回初始界面」「交互对话」「数据库」「宏观平台」；「返回初始界面」点击执行 `onBack`，其余为占位链接；  
- **收起方式**：
  - 头部切换按钮从「菜单」变为「关闭」，点击可收起；  
  - 面板左上角提供 **统一设计的收起图标按钮**，点击同样关闭菜单；  
- **样式**：面板宽度 `clamp(225px, 33vw, 375px)`；菜单项使用 ZCOOL QingKe HuangYou 字体；编号位于文本右侧、间距紧凑（`padding-right: 2em`，编号 `right: 0.2em`）。

#### 2）技术要点

- 使用 `gsap.context` 统一管理初始状态与 revert；  
- 打开时的 timeline 驱动 preLayers + panel 的 `xPercent`，菜单 item 的 `yPercent / rotate` 以及编号的 `--sm-num-opacity`；  
- 关闭时统一 `xPercent` 滑出并重置 item 状态；  
- 使用 React `useState` 控制 open 状态与“菜单 / 关闭”文案；`useRef` 保存 GSAP 实例与 DOM 引用；必要时通过 `flushSync` 先更新文案再启动 GSAP 滚动动画；  
- 无障碍：`aria-label`、`aria-expanded`、`aria-controls` 与面板 `aria-hidden` 与开合状态同步。

#### 3）收起按钮设计规范（针对原实现的修复）

> 原实现中的收起按钮样式较为粗糙、位置不理想，影响整体观感。本节对其重新规范。

- **位置**：
  - 收起按钮应放置在 **侧滑面板左上角**，与右上角的菜单主按钮形成视觉平衡；
  - 与面板内容留出足够内边距（如 `padding: 16px 20px`），不与菜单项抢占视觉焦点。
- **图标形态**：
  - 使用通用的「向左箭头 + 文本」或「× 关闭」图标，建议参考成熟组件库（如 Radix UI、Lucide、Heroicons）中的样式；
  - 图标线条粗细与菜单内其他图形元素保持一致，避免突兀；
  - 悬停时可增加轻微缩放或透明度变化（`scale(1.02)` / `opacity: 0.8`）。
- **交互一致性**：
  - 点击收起图标与点击头部「关闭」按钮应触发同一关闭逻辑（同一个 `closeMenu` / `playClose`）；
  - 键盘操作（Enter / Space）同样可触发收起；
  - 加上适当的 `aria-label="收起菜单"`，提升可访问性。
- **布局实现参考**：
  - 使用 flex 布局将收起图标与面板标题（如需要）对齐；
  - 参考常见侧滑抽屉（Drawer）或 Off‑Canvas 布局，将按钮固定在面板内顶部栏，而非漂浮在内容中间。

> 如果需要更具体的 UI 参考，可以查阅 “drawer close button design” 或成熟组件库的 Drawer / Sidebar 关闭按钮样式，并在现有 `.sm-scope` 体系下用 Tailwind 或纯 CSS 实现。

#### 4）代码落点

- [`windows/main/components/StaggeredMenu.tsx`](apps/main-platform/app/windows/main/components/StaggeredMenu.tsx)：React 版菜单组件（initializeGSAP、buildOpenTimeline、playOpen / playClose、animateIcon / animateColor / animateText、toggleMenu、面板左上角收起按钮）；  
- [`globals.css`](apps/main-platform/app/globals.css)：`.sm-scope` 下全部菜单样式（wrapper、header、toggle、panel、prelayers、list、item、编号 `::after`、收起按钮、媒体查询）。

### 五、第三窗口文件结构

```bash
app/
├── login-window-demo.tsx           # 顶层编排，activeWindow === "main" 时渲染 MainWindow
└── windows/
    └── main/
        ├── MainWindow.tsx          # 第三窗口根：DotGrid 背景 + StaggeredMenu 前景
        └── components/
            ├── DotGrid.tsx         # 点阵背景（Canvas + GSAP Inertia）
            └── StaggeredMenu.tsx   # 侧滑菜单（GSAP timeline + 中文四项 + 收起按钮）
```

全局样式（Window 3 与 StaggeredMenu）均在 [`globals.css`](apps/main-platform/app/globals.css) 中维护：`main-window-page`、`main-window-dotgrid-bg`、`main-window-menu-layer` 以及 `.sm-scope` 下菜单与收起按钮相关样式。

### 六、第三窗口验收要求

- 在 Panel 3 点击 Shoot 稳定进入第三窗口；点阵初始为灰色，靠近变绿，快速移动与点击具有明显位移与回弹效果；  
- 菜单按钮可打开 / 收起面板；面板内四项中文及 1～4 编号清晰可见；左上角收起图标样式统一、位置合理，并能正常关闭菜单；  
- 「返回初始界面」可以回到第一窗口；  
- 在 150% 缩放下，点阵密度与菜单排版正常；无新增 lint 报错。
