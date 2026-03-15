# Final

基于 **Monorepo** 架构的 Web 前端项目，通过「组件化拆分」先独立开发各功能窗口，再在主平台中整合。

## 🛠 技术栈

| 类别 | 技术选型 |
|------|----------|
| **管理工具** | pnpm workspaces + Turborepo |
| **框架** | Next.js 14+ (App Router) |
| **开发库** | React + TypeScript |
| **样式方案** | Tailwind CSS |
| **基础组件** | shadcn/ui (Radix + Tailwind) |
| **动画引擎** | GSAP (GreenSock Animation Platform) — 窗口弹出、拖拽、视差滚动 |
| **交互式动画** | Rive — 导航菜单、图标、品牌展示（参考 Dropbox Brand） |
| **组件规范** | Vercel 最佳实践 (Server Components 优先) |

### 为什么选择 GSAP？
GSAP 是 Awwwards 获奖作品的标配。在本项目中：
- **窗口平滑弹出**：通过 GSAP 的 `scale`、`opacity` 和自定义缓动实现
- **路径生长**：使用 GSAP `attr` 插件驱动 SVG `stroke-dashoffset`

### Rive：设计师驱动的交互动画
[Rive](https://rive.app/) 是设计师在可视化编辑器中制作动画，导出 `.riv` 文件后在 React 中播放。
- **适用场景**：导航菜单、图标动画、品牌展示模块
- **与 GSAP 分工**：Rive 负责设计感强的交互模块；GSAP 负责窗口级、滚动驱动的动画

---

## 🏗 目录结构
```
final/
├── apps/
│   └── main-platform/          # 核心承载平台
│       └── app/                # Next.js App Router 目录
├── packages/
│   ├── ui/                     # 基础 UI 组件库
│   ├── ui-components/          # 业务窗口组件库
│   └── tsconfig/               # 共享 TS 配置
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 💡 开发哲学与计划
- **窗口独立性**：每个窗口高内聚，不依赖其他窗口的内部状态
- **配置共享**：UI 风格通过 Tailwind 配置统一管理
- **画布思维**：从路径绘制到坍缩，文字与线条通过坐标系统精确联动

---

## 🎯 第一个窗口：登录界面 (Login Window)

### 设计灵感
模仿 **Dropbox Brand Guidelines**，采用「画布思维」：用 **SVG + GSAP** 实现几何动效，文字与线条通过坐标系统精确联动。

### 一、完整流程（必读）
```
页面加载 → [自动] 绘制动画 → 阶段 1 结束：介绍界面
                                    ↓
                           用户 scroll 或 click
                                    ↓
              [一次完成] 白蓝反转 + 坍缩 + 切到登录表单
                                    ↓
                    阶段 2 结束：登录表单界面
```

#### 阶段 1：开场绘制（自动播放）
- **触发**：页面加载完成后立即自动播放
- **内容**：四条主干线从边缘划入，Logo 轮廓线同步画出
- **结束状态**：白底、蓝线框架、蓝字介绍文案，**蓝色 Logo 在框架左下角**

#### 阶段 2：白蓝反转 + 坍缩（交互触发）
- **内容**：一次交互内同时完成：白蓝反转、线条坍缩、内容切换
- **白蓝反转**：框架**内部**：背景变蓝，文字和 Logo 变白
- **线条坍缩**：四条线对称收缩，**中心点保持不变**

### 二、核心参数 (Coordinate Reference)
| 变量 | 含义 | 初始值 (1440x900) | 坍缩后目标值 |
|------|------|-------------------|--------------|
| `x1` | 左竖线位置 | `0.31 * VW` | `0.37 * VW` |
| `x2` | 右竖线位置 | `0.69 * VW` | `0.63 * VW` |
| `y1` | 上横线位置 | `0.17 * VH` | `0.23 * VH` |
| `y2` | 下横线位置 | `0.83 * VH` | `0.83 * VH` |

### 三、第一窗口动态背景融合方案（Three.js Beams）

> 目标：让动态背景只服务于第一阶段氛围，不抢占主信息；进入第二阶段蓝色登录区后，背景必须退场并被内容区覆盖。

#### 1) 设计原则（不喧宾夺主）
- 背景层仅作为“氛围层”，不是“信息层”。
- 第一阶段允许微弱动态纹理；第二阶段登录区必须成为视觉主角。
- 动态背景在阶段切换时应快速淡出，避免与蓝色表单区叠加造成信息干扰。

#### 2) 分阶段显示规则
- **Phase 1（开场介绍）**：
  - Beams 可见，但强度受控（低对比、低饱和、低速度）。
  - 推荐整体透明度区间：`0.06 ~ 0.14`。
- **Phase 2（白蓝反转 + 坍缩）**：
  - 在阶段 2 时间线起点后 `0.12s ~ 0.20s` 内，将 Beams `opacity -> 0`。
  - 蓝色登录区（`panel-fill`）转为不透明后，完全覆盖背景层。
- **Phase 2 结束（登录态）**：
  - Beams 保持关闭，不再可见。

#### 3) 视觉参数建议（白底场景）
- 背景主色：使用品牌蓝系的低饱和版本（避免纯白光束）。
- 推荐风格：`saturate(0.7)`、`contrast(0.9)`、`brightness(1.02)`。
- 运动强度：
  - `speed: 0.45 ~ 0.9`
  - `noiseIntensity: 0.35 ~ 0.9`
  - `beamNumber: 6 ~ 10`
- 原则：宁可“几乎看不见”，也不要让用户注意力离开主框与文案。

#### 4) 层级与遮挡规范（必须满足）
- DOM 层级：`Beams(底层) < SVG主动画层 < 文本/表单交互层`。
- Beams 容器必须 `pointer-events: none`，不得影响按钮/输入框交互。
- 登录蓝区显现后，背景层不应在蓝区上方继续可见（禁止视觉穿透）。

#### 5) 技术实现映射（对应现有动画结构）
- 在 `LoginIntroWindow` 中新增可控背景层（React Client Component）。
- 背景开关与 `introTl / stage2Tl` 同步：
  - `introTl`：保持低强度可见。
  - `stage2Tl`：起始段执行背景淡出。
- 保持现有几何主逻辑不变（四线绘制、白蓝反转、坍缩、内容切换），仅增加“背景礼貌退场”。

#### 6) 验收标准
- 第一阶段：能感知空间氛围，但不影响文案可读性。
- 第二阶段：用户视觉焦点稳定落在蓝色登录区与表单元素。
- 全流程：无层级穿透、无交互阻挡、无颜色冲突。

---

## 🚀 第二个窗口：产品介绍（三板块全屏滚动）

> 第二窗口由 3 个全屏 panel 组成，用户滚轮或轻点触发按屏切换。  
> 各板块安放各自的时间轴、实现样式与坐标系统。

### 一、全局硬规则（必须满足）

- **一屏一板块**：任意时刻仅显示一个 panel。
- **严格全屏**：每个 panel 必须始终撑满视口（`100vw × 100dvh`）。
- **整屏步进**：切换时按整屏跳转（index 步进），不可半屏停留。
- **过渡锁定**：切换动画期间锁定输入，避免连续触发导致越级跳转。
- **画布规范**：SVG 统一使用 `1920×1080` 坐标体系；panel 轨道位移按 `translateY(-index * window.innerHeight)`。

---

### （1）Panel 1：黑色动态主视觉（LightRAG）

**主题**：深色底 + 几何网格 + 标题上升 + 色块流动 + 3D 返回按钮。

#### 统一坐标系统（1920 x 1080）
以左上角为原点 `(0, 0)`，最终骨架为 **3 条竖线 + 4 条横线**。

#### 1) 竖线（Vertical）
| 线名 | 像素 x（1920） | 说明 |
|------|----------------|------|
| `V1` | `56` | 左侧细长区右边界；横线左端极限 |
| `V2` | `254` | 主内容起始线；主标题左边界贴齐 |
| `V3` | `1524` | 主内容右边界；右侧色块起始线 |

#### 2) 横线（Horizontal）
| 线名 | 像素 y | 说明 |
|------|----------------|------|
| `L1` | `328.5` | 上部辅助线 |
| `L2` | `469.5` | 标题上边界 |
| `L3` | `610.5` | 标题下边界 |
| `L4` | `751.5` | 下部辅助线 |

**硬规则**：
- 横线均从中心向两端生长（中心约 `x=889`）
- 横线左端不得越过 `V1=56`
- 横线右端到屏幕边界 `x=1920`

#### 二、版式与颜色（唯一口径）
- **页面背景**：`#1E1919`
- **主标题**：白色粗体，文案 `LightRAG`
- **右下黄区文案**：深色字 `#121212`（保证对比）
- **右下绿区文案**：白色字 `#FFFFFF`
- **黄区**：`#F7D147`，区域 `x: V3 -> 1920`、`y: 0 -> L1`
- **绿区**：`#164D33`，区域 `x: (V2 + 2/3*(V3-V2)) -> V3`、`y: L4 -> 1080`
- **科技蓝**：`#2D5AF7`（线条最终细线颜色 + 左侧按钮主色）

#### 三、动画分层与技术细节 (Technical Deep Dive)

#### 1) 标题上升 (Typography Rise)
- **对齐规则**：**Cap Height（大写高度）对齐**。大写字母顶端严格压在 `L2` 线。
- **技术栈**：`foreignObject` + `CSS Flexbox`。
- **位移抵消扩容 (Smart Clipping)**：
  - `foreignObject` 向上扩容 `TOP_EXPAND` (36px)，向下扩容 `BOTTOM_EXPAND` (56px)。
  - 通过 `paddingTop` 抵消向上位移，确保文字锚点锁定在 `L2`。
- **动态实现**：逐字上升 `yPercent: 112 -> 0`，`stagger: 0.03`，`power3.out`。
- **遮罩**：`SVG clipPath` 与扩容后的容器尺寸同步。

#### 2) 网格线中心生长 (Grid Growth)
- **生长方式**：线段端点从中心向边界插值。
- **质感转换**：初始 `#FFFFFF` 1px -> 最终 `#2D5AF7` 1px (通过 `strokeOpacity: 0.5` 模拟细线感)。
- **渲染优化**：
  - **像素对齐**：坐标应用 `+0.5px` 偏移，防止抗锯齿导致线条模糊或丢失。
  - **动态模式**：动画时 `geometricPrecision`，静止后 `crispEdges` 强制锐化。

#### 3) 色块流动揭示 (Gradient Mask Reveal)
- **原理**：使用 `SVG mask` 内嵌套 `linearGradient` 的 `rect`。
- **动态**：GSAP 动画驱动 `mask` 内部矩形的宽度/高度增加，配合渐变前沿产生“流体漫延”感。

#### 4) 3D 返回按钮 (Interactive Button)
- **结构**：`shadow` + `edge` + `front`。
- **物理反馈**：使用 `cubic-bezier(.3, .7, .4, 1)`。
- **交互**：`hover` 时 `translateY(-6px)`，`active` 时 `translateY(-2px)`。

#### 5) 角落引号 + 文案浮现 (Quotes & Copy Reveal)
- **坐标隔离**：引号使用双层 `<g>`，外层仅负责 `translate/scale` 静态坐标，内层仅绑定 GSAP 动画。
- **引号字符**：使用圆润字形 `\u275b\u275b` / `\u275c\u275c`，字体栈优先 `Arial Rounded MT Bold`。
- **文案浮现**：两块文案容器使用 `autoAlpha + yPercent + scale` 轻量浮现，且与黄/绿色块揭示时间衔接。
- **稳定调参**：所有引号位置/大小统一由常量控制，避免 GSAP 覆盖手动坐标。

#### 四、时间轴（标准版）
| 时间点 | 动画对象 | 动态方式 | 状态目标 |
|--------|----------|----------|----------|
| `t=0.00s` | 主标题容器 | 容器释放 | 占据 `V2~V3` 与 `L2~L3` 区域 |
| `t=0.08s` | 主标题字符 | `yPercent 112 -> 0` + `stagger` | 白色大标题优先成形 |
| `t=0.22s` | `L2` | 中心向两端生长 | 白线 `1px` |
| `t=0.30s` | `L3` | 中心向两端生长 | 白线 `1px` |
| `t=0.40s` | `L1` | 中心向两端生长 | 白线 `1px` |
| `t=0.52s` | `L4` | 中心向两端生长 | 白线 `1px` |
| `t=0.60s` | `V2` | 中心向上下生长 | 白线 `1px` |
| `t=0.68s` | `V3` | 中心向上下生长 | 白线 `1px` |
| `t=0.78s` | `V1` | 中心向上下生长 | 白线 `1px` |
| `t=0.92s` | 全部线条 | 统一质感切换 | `#fff/1 -> #2D5AF7/1` + `opacity: 0.5` |
| `t=1.00s` | 黄区 | 渐变遮罩水平揭示 | `#F7D147`，`x: V3 -> 1920` |
| `t=1.08s` | 绿区 | 渐变遮罩垂直揭示 | `#164D33`，`y: L4 -> 1080` |
| `t=1.06s` | 黄区文案 | `autoAlpha + yPercent + scale` | 右上文案柔和浮现 |
| `t=1.12s` | 左上/右下引号 | `autoAlpha + yPercent + scale` + `back.out(1.9)` | 引号弹性浮现 |
| `t=1.14s` | 绿区文案 | `autoAlpha + yPercent + scale` | 右下文案柔和浮现 |
| `t=1.15s` | 左侧按钮 | 3D 回弹入场 | `#2D5AF7` 可点击状态 |

#### 五、参数调优手册 (Parameter Tuning)

| 参数名 | 调整位置 | 作用 |
|--------|----------|------|
| `CHAT_BLUE` | `windows/shared/coords.ts` | 全局蓝色主调 (线、按钮) |
| `strokeOpacity` | `windows/product/panels/PanelBlack.tsx` | 蓝线视觉粗细（建议 0.5） |
| `font-size` | `globals.css` | `LightRAG` 标题大小 |
| `transform: translateY` | `globals.css` | 标题 Cap Height 像素级微调 |
| `TOP_EXPAND` | `windows/shared/coords.ts` | 字母 `i` 的点防切缓冲 |
| `BOTTOM_EXPAND` | `windows/shared/coords.ts` | 字母 `g` 的尾巴防切缓冲 |
| `CHAT_QUOTE_TL_X/Y` | `windows/shared/coords.ts` | 左上引号坐标 |
| `CHAT_QUOTE_BR_X/Y` | `windows/shared/coords.ts` | 右下引号坐标 |
| `CHAT_QUOTE_SCALE` | `windows/shared/coords.ts` | 引号整体缩放 |
| `V1, V2, V3, L1...` | `windows/shared/coords.ts` | 骨架网格的核心像素坐标 |

#### 六、Next.js / React 实施规范
- **动画组件使用 `"use client"`**，初始化放在 `useLayoutEffect`。
- **销毁管理**：所有动画通过 `gsap.context()` 管理，清理函数调用 `ctx.revert()`。
- **渲染策略**：暗色背景下的细线，强制使用物理 1px + 透明度方案，禁用物理 0.x px 线宽。

---

### （2）Panel 2：蓝色产品介绍主板块

**主题**：流光公路特效 + SVG 线条框 + Shuffle 文案动效。承接 Panel 1，突出核心价值与能力摘要。

#### 层级结构（必须严格）

```
z-index: 0  → 流光层（HyperspeedBackground，Three.js WebGL）
z-index: 1  → SVG 线条层（仅画线条，不画背景 rect）
z-index: 2  → 文案层（ShuffleText：「各端口即时交流 时空链接」）
```

**红线**：SVG 线条层不得添加全屏不透明 `rect`，否则会盖住流光层。

#### 坐标系统（1920×1080，基于文本框尺寸）

文本框由 `.panel-blue-main-shuffle-wrap` 定位：`top: 35%`，`width: min(90vw, 1280px)` 居中。换算得文字框约 `x: 320~1600`，`y: 378~499`。四条主线在框外留约 40px 边距。

| 常量 | 值 | 说明 |
|------|-----|------|
| `P2_V1` | `56`（= CHAT_V1） | 左辅线，与 Panel1 一致；所有横线左端止于此 |
| `P2_TOP` | `338` | 上主线 y |
| `P2_BOTTOM` | `539` | 下主线 y |
| `P2_LEFT` | `280` | 左主线 x |
| `P2_RIGHT` | `1640` | 右主线 x |
| `P2_AUX_H_Y` | `169` | 第二条辅线（横）y，屏幕顶与上主线之间居中 |

#### 线条时间轴（标准版）

| 顺序 | 线 | t（秒） | 动态方式 |
|------|-----|---------|----------|
| 1 | 左辅线（竖） | 0.00 | 从中心向上下生长 |
| 2 | 上主线（横） | 0.12 | x1 固定 56.5，x2 从 56.5 → 1920 |
| 3 | 下主线（横） | 0.22 | 同上 |
| 4 | 左主线（竖） | 0.32 | 从中心向上下生长 |
| 5 | 右主线（竖） | 0.42 | 同上 |
| 6 | 第二条辅线（横） | 0.52 | 从左辅线向右生长 |
| 7 | 全部线条 | 0.70 | 统一变色 `#fff` → `#8494FF`，`strokeOpacity` → 0.3 |

#### 线宽与透明度（与 Panel1 一致）

- 初始：`stroke: #ffffff`，`strokeWidth: 1`，`strokeOpacity: 1`
- 最终：`stroke: #8494FF`（CHAT_BLUE），`strokeWidth: 1`，`strokeOpacity: 0.3`

#### 流光特效（Hyperspeed）

- **技术栈**：Three.js + postprocessing（BloomEffect + SMAAEffect）
- **落点**：`HyperspeedBackground.tsx`、`hyperspeedPresets.ts`
- **层级**：`.panel-blue-main-bg` 内，`z-index: 0`

#### 文案动效（ShuffleText）

- **文案**：`各端口即时交流 时空链接`
- **字体**：ZCOOL QingKe HuangYou（`@fontsource/zcool-qingke-huangyou`）
- **触发**：panel2 激活时自动播放，每 1.5s 自动重播

---

### （3）Panel 3：蓝色延展

**主题**：Threads 线束特效（下 65% 区域，C9BEFF / 8494FF / 6367FF 渐变）+ 四条横线时间轴（与 Panel 1 套路一致，对称轴上移）。

#### 一、层级结构（必须严格）

```
z-index: 0  →  Threads 画布（.panel-blue-extend-canvas，仅 WebGL，高度 65% 靠下）
z-index: 1  →  SVG 线条层（仅四条横线：一棵 <svg> + 四条 <line>，不画全屏 rect）
```

**红线**：SVG 线条层不得添加全屏不透明 `rect`，否则会盖住 Threads 层。

**现状与动工要求**：Panel 3 当前只有 WebGL（Threads），没有 SVG 画布。做 GSAP 四横线动画时，必须在 Panel 3 里加一层 SVG 画布（一棵 `<svg>` + 四条 `<line>`），由 GSAP 改 `attr: { x1, x2 }` 做「中心向两端生长」，与 Panel 1、Panel 2 的线条实现方式一致。

#### 二、坐标系统（1920×1080，已在 coords.ts 中定义）

四条横线间隔与 Panel 1 的 L1～L4 相同（约 141px），整体上移约 60px，为下方 Threads 留出视觉空间。

| 常量   | 值     | 说明           |
|--------|--------|----------------|
| `P3_L1` | `268.5` | 上部辅助线 y   |
| `P3_L2` | `409.5` | 标题区上边界 y |
| `P3_L3` | `550.5` | 标题区下边界 y |
| `P3_L4` | `691.5` | 下部辅助线 y   |

**硬规则**（与 Panel 1 一致）：

- 横线均从中心向两端生长（中心 `CHAT_X_MID`，约 x=889）。
- 横线左端不得越过 `CHAT_V1 + 0.5`（56.5）。
- 横线右端到屏幕边界 `x=1920`。

#### 三、动画分层与技术细节 (Technical Deep Dive)

#### 1) Threads 线束特效（已落地）

- **位置**：`.panel-blue-extend-canvas` 占视口下方 **65%**（`height: 65%`，`bottom: 0`）。
- **技术栈**：WebGL（Canvas 2D / WebGL 或同层技术），由 `ThreadsEffect` 组件承载。
- **颜色**：三色渐变 `#C9BEFF` → `#8494FF` → `#6367FF`（上→下），由 `gradientColors` + shader 插值实现。
- **清晰度**：Canvas 按 `devicePixelRatio`（上限 2）设置缓冲分辨率，CSS 宽高为显示尺寸；容器使用 `transform: translateZ(0)` / `will-change: transform` 促发 GPU 合成。

#### 2) 四横线中心生长 (Grid Growth，与 Panel 1 一致)

- **技术栈**：`"use client"` + `useLayoutEffect` + GSAP timeline；坐标与缓动从 `coords.ts`、`animation.ts` 引入（`CHAT_W`、`CHAT_V1`、`CHAT_X_MID`、`P3_L1`～`P3_L4`、`CHAT_LINE_EASE`）。
- **生长方式**：线段端点从中心向两端插值，GSAP 驱动每条 `<line>` 的 `attr: { x1, x2 }`，从 `x1 = x2 = CHAT_X_MID` 动画至 `x1: CHAT_V1 + 0.5`、`x2: CHAT_W`。
- **质感转换**：初始 `#FFFFFF` 1px、`strokeOpacity: 1` → 最终 `#8494FF`（CHAT_BLUE）1px、`strokeOpacity: 0.3`（与 Panel 2 一致）。
- **渲染优化**：
  - **像素对齐**：横线 y 使用 **P3_Lx + 0.5**（与 Panel 1 的 `CHAT_Lx + 0.5` 一致），防止抗锯齿导致线条模糊或断裂。
  - **shapeRendering**：动画进行中设为 `geometricPrecision`（onStart），动画结束 onComplete 设回 `crispEdges`。
- **SVG 结构**：仅包含四条 `<line>` 元素，**不包含全屏 `rect`**；viewBox `0 0 1920 1080`，`preserveAspectRatio="xMidYMid slice"`。

#### 四、时间轴（标准版）

| 时间点   | 动画对象 | 动态方式           | 状态目标                         |
|----------|----------|--------------------|----------------------------------|
| `t=0.00s` | L2（P3_L2） | 中心向两端生长     | 白线 1px，左端 56.5，右端 1920   |
| `t=0.08s` | L3（P3_L3） | 中心向两端生长     | 白线 1px                         |
| `t=0.18s` | L1（P3_L1） | 中心向两端生长     | 白线 1px                         |
| `t=0.28s` | L4（P3_L4） | 中心向两端生长     | 白线 1px                         |
| `t=0.38s` | 全部线条 | 统一质感切换       | `#fff/1` → `#8494FF/1`，`strokeOpacity: 0.3` |

**说明**：顺序与 Panel 1 横线一致（L2 → L3 → L1 → L4），时长与缓动沿用 `CHAT_LINE_EASE`，最终色与 Panel 2 一致（`CHAT_BLUE` #8494FF）。

#### 五、线宽与透明度（与 Panel 1 / Panel 2 一致）

- **初始**：`stroke: #ffffff`，`strokeWidth: 1`，`strokeOpacity: 1`
- **结束**：`stroke: #8494FF`（CHAT_BLUE），`strokeWidth: 1`，`strokeOpacity: 0.3`

#### 六、Next.js / React 实施规范（注意事项）

- **动画组件使用 `"use client"`**，线条 timeline 初始化放在 `useLayoutEffect` 内。
- **坐标与缓动**：从 `windows/shared/coords.ts`、`animation.ts` 引入 `CHAT_W`、`CHAT_V1`、`CHAT_X_MID`、`P3_L1`～`P3_L4`、`CHAT_LINE_EASE`。
- **初始/结束状态**：线条初始 `x1 = x2 = CHAT_X_MID`（一点），动画 to `attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }`；初始 `stroke: #ffffff`、`strokeOpacity: 1`，结束 `stroke: CHAT_BLUE`、`strokeOpacity: 0.3`。
- **像素对齐**：横线 y 使用 `P3_Lx + 0.5`，避免抗锯齿导致线条发虚或断裂。
- **shapeRendering**：动画时 `geometricPrecision`，静止后 `crispEdges`，与 Panel 1 / Panel 2 一致。
- **SVG 画布**：仅 `<line>`，无全屏 `rect`；viewBox `0 0 1920 1080`，`preserveAspectRatio="xMidYMid slice"`。
- **销毁管理**：timeline 在 effect 的 return 中调用 `kill()`，避免重复执行与内存泄漏；建议使用 `gsap.context()`，清理时 `ctx.revert()`。
- **激活时机**：线条动画仅在 Panel 3 激活（`isActive === true`）时播放，与 Panel 2 的 `PanelBlueLines` 一致，避免切屏前就播完。
- **层级**：线条层容器 `z-index: 1`，置于 Threads 容器（`z-index: 0`）之上。

---

### 二、交互定义（滚轮/轻点）

- 滚轮向下：进入下一 panel。
- 滚轮向上：返回上一 panel。
- 轻点空白区：按产品节奏推进到下一 panel（可选与滚轮同逻辑）。
- 到达首尾边界时不再继续跳转。
- 每次切换仅允许移动一个 panel。

### 三、画布与容器规范

- 统一窗口舞台高度：`100dvh`，并 `overflow: hidden`。
- panel 轨道采用纵向排列，位移使用视口像素步进（`translateY(-index * window.innerHeight)`）。
- SVG 统一继续使用 `1920x1080` 坐标体系，适配时保持单屏裁切稳定。
- 所有 panel 的交互元素不得突破本屏边界。

### 四、三板块规划

各板块时间轴、坐标与实现样式详见上文 **（1）Panel 1**、**（2）Panel 2**、**（3）Panel 3**。

### 五、文件结构（已落地）

```
app/
├── login-window-demo.tsx          # 顶层编排入口（仅路由状态）
└── windows/
    ├── shared/
    │   ├── coords.ts              # 所有坐标 / 颜色常量（两窗口共用）
    │   └── animation.ts           # GSAP 插件注册 + 自定义 easing
    ├── login/
    │   ├── LoginIntroWindow.tsx   # 第一窗口：介绍 + 白蓝反转 + 登录表单
    │   ├── LoginForm.tsx          # 登录表单子组件
    │   └── utils.ts               # SVG 布局辅助函数（updateLines 等）
    └── product/
        ├── ProductIntroWindow.tsx # 三板块容器：wheel 节流 + GSAP 整屏切换
        ├── HyperspeedBackground.tsx # Panel 2 的 Three.js + postprocessing 背景层
        ├── hyperspeedPresets.ts   # Hyperspeed 参数预设
        ├── overlays/
        │   └── ShuffleText.tsx    # Panel 2：Shuffle 文案动效组件
        └── panels/
            ├── PanelBlack.tsx     # Panel 1：已完成黑色动效
            ├── PanelBlueMain.tsx  # Panel 2：蓝色主介绍（流光 + 线条 + 文案）
            └── PanelBlueExtend.tsx# Panel 3：蓝色延展（留白）
```

### 六、验收标准

- 任意分辨率下，初始进入仅看到一个完整 panel。
- 连续滚轮操作不会导致跳帧、越屏或叠屏显示。
- panel 切换动画连贯，且可稳定落在离散索引位置（0/1/2）。
- 未开工 panel 保持结构占位，不影响已完成 panel 的展示与交互。

### 七、Panel 2 流光特效（Hyperspeed）实施说明

#### 1) 技术栈对齐（与本项目 README 主规范一致）
- **框架层**：`Next.js + React + TypeScript`，组件为 `use client` 客户端组件。
- **动效层**：保留 `GSAP` 负责整屏切换（Panel 间转场），`Three.js` 负责 Panel 内流光渲染。
- **后处理层**：`postprocessing`（`BloomEffect + SMAAEffect`）增强流光与抗锯齿。
- **样式层**：通过 `globals.css` 的分层定位方案，保证画布严格贴合 `panel-blue-main` 白色画布。

#### 2) 提取原则（本次严格执行）
- 仅提取模板中的**线条播放实现方式**：`RAF 更新循环 + 速度/FOV 插值 + Bloom/SMAA 后处理`。
- 不搬运模板中的道路地面、岛区、背景实体等“场景语义”对象。
- 最终效果是“白底上的线条图案层”，而不是完整公路场景。

#### 3) 为什么不会“脱离窗口”
- 轨道层：`.product-pager-stage` 与 `.product-panel` 都是 `overflow: hidden`，作为第一道裁切边界。
- Panel 2 根容器：`.panel-blue-main` 设置 `position: relative + overflow: hidden + isolation: isolate`。
- 背景层：`.panel-blue-main-bg` 使用 `position: absolute; inset: 0; z-index: 0`，Three.js canvas 仅存在于此层。
- 线条层：SVG 线条层 `z-index: 1`，位于流光之上、文案之下。
- 内容层：`.panel-blue-main-content` 使用 `position: absolute; inset: 0; z-index: 2`，保证文案覆盖在线条与流光之上。

#### 4) 照搬到画布的方法（可复用步骤）
1. 在 `PanelBlueMain.tsx` 中创建双层结构：`背景层` + `内容层`。
2. 将 `HyperspeedBackground` 仅挂载到背景层，不直接挂在 panel 根节点。
3. 背景组件内部使用容器 `ref`，将 renderer canvas append 到该容器。
4. 通过 `ResizeObserver` 同步 renderer/composer/camera 尺寸，避免分辨率变化导致越界。
5. 在组件卸载时执行完整 `dispose`（renderer、composer、geometry、material、RAF、事件监听）。
6. 三屏切换位移按视口像素 `y = -index * window.innerHeight`，避免 `yPercent` 对轨道高度计算造成越屏。

#### 5) 当前代码落点
- `windows/product/HyperspeedBackground.tsx`：React 版线条特效层（仅线条对象 + postprocessing）。
- `windows/product/hyperspeedPresets.ts`：Panel 2 白底线条预设参数。
- `windows/product/panels/PanelBlueMain.tsx`：已接入白底画布上的线条层与基础文案层。
- `windows/product/ProductIntroWindow.tsx`：三屏位移按视口像素进行，避免 panel 错位。
- `globals.css`：Panel2 白底 + 分层样式 + canvas 约束样式。

---

### 八、Panel 3 十字准星 Crosshair

#### 1) 技术栈与实现方式

- **框架层**：`Next.js + React + TypeScript`，组件为 `"use client"` 客户端组件。
- **动效层**：`GSAP` 负责准星跟随的 lerp 插值、进入/离开容器的透明度、以及 `<a>` hover 时的「雪花化」SVG filter 动画。
- **交互层**：十字准星通过 `requestAnimationFrame` 持续读取鼠标位置并更新横竖线位置；`<a>` 元素上绑定 `mouseenter` / `mouseleave` 触发雪花化 timeline。
- **样式层**：通过 `globals.css` 的 `.panel-blue-extend-interact` 与 `.p3-aim-shoot-wrap` 实现 L2～L3 区间的精确定位，字号使用 `calc(141 / 1080 * 100dvh)` 使文字上下边界与 L2、L3 重合。

#### 2) 实现效果（瞄准 → 射击联动）

该模块与 Panel 3 中央的交互文本联动，形成「瞄准 → 射击」的视觉反馈：

| 状态 | 表现 |
|------|------|
| **十字准星未靠近文本** | 显示灰蓝色大号文本「点此开启链接」，下方有提示「(悬停文字)」 |
| **十字准星搭在文本上** | 文本变为鲜亮的荧光绿色「链接启动」，准星叠加在文字中心，形成瞄准就绪感 |

#### 3) 文本安放与字号

- **垂直区域**：文本放置在 Panel 3 的 **P3_L2** 与 **P3_L3** 之间（`coords.ts` 中 `P3_L2 = 409.5`，`P3_L3 = 550.5`，间距 141px）。
- **字号要求**：`font-size: calc(141 / 1080 * 100dvh)` 配合 `line-height: 1`，使文字上下边界恰好与 L2、L3 重合。
- **字体**：ZCOOL QingKe HuangYou（`@fontsource/zcool-qingke-huangyou`），与 Panel 2 一致。
- **水平居中**：文本在 L2～L3 区域内水平居中显示。

#### 4) 「链接启动」按钮行为

「链接启动」在交互上等同于入口按钮：用户将十字准星对准文本并点击后，跳转进入第三窗口（主功能界面）。文本包裹为 `<a>` 元素，既可复用 Crosshair 的雪花化效果，又便于绑定点击回调。

#### 5) 代码落点

- `windows/product/overlays/Crosshair.tsx`：十字准星组件（GSAP + SVG feTurbulence 雪花化）。
- `windows/product/panels/PanelBlueExtend.tsx`：挂载 Crosshair 与 Aim/Shoot 文案，透传 `onShoot` 回调。
- `globals.css`：`.panel-blue-extend-interact`、`.p3-aim-shoot-wrap`、`.p3-aim-shoot-text` 等样式。

---