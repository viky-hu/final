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



## （我自己手写的，你可以按照readme规范对格式进行优化）第三个窗口：交互对话
这个页面就是从panel3的Shoot按钮按下去触发出的新窗口，之前咱们做了个模拟的窗口，你可以删了重做。
目前整个页面具有以下模块的现成的代码，我需要你以符合我们技术栈react的形式复现在此界面中（仅照搬代码，不要擅自做改动），确保任何的操作都要符合vercel给出的react的最佳实践（可以联网搜索这个概念），关于传统代码模块的react复现网上也有一些skills可以学习。
注意：你必须完全按照我给定的以下两个代码来做，千万不能擅自修改其逻辑和样式。
我默认整个web的最佳呈现的界面缩放大小为150%，请确保我们制作的界面也是在150%大小界面时的最佳状态

1、Dot Grid（具物理引擎的点阵，鼠标靠近部分膨胀变绿————这是整个窗口的背景）
补充：
水平方向 (宽度)： 约 50 - 55 个点。
垂直方向 (高度)： 约 28 - 32 个点。
间距 (Gap)： 每个点之间的中心距离大约在 20px 到 24px 之间。
圆点大小： 直径约为 4px。

Installation
npm install gsap
Usage
<template>
  <div class="dot-grid-container">
    <DotGrid
      :dot-size="16"
      :gap="32"
      base-color="#27FF64"
      active-color="#27FF64"
      :proximity="150"
      :speed-trigger="100"
      :shock-radius="250"
      :shock-strength="5"
      :max-speed="5000"
      :resistance="750"
      :return-duration="1.5"
      class-name="custom-dot-grid"
    />
  </div>
</template>

<script setup lang="ts">
  import DotGrid from "./DotGrid.vue";
</script>

<style scoped>
  .dot-grid-container {
    width: 100%;
    height: 500px;
    position: relative;
    overflow: hidden;
  }
</style>
Code
<template>
  <section :class="`flex items-center justify-center h-full w-full relative ${className}`" :style="style">
    <div ref="wrapperRef" class="w-full h-full relative">
      <canvas ref="canvasRef" class="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, useTemplateRef } from 'vue';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(InertiaPlugin);

const throttle = <T extends unknown[]>(func: (...args: T) => void, limit: number) => {
  let lastCall = 0;
  return function (this: unknown, ...args: T) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  className?: string;
  style?: Record<string, string | number>;
}

const props = withDefaults(defineProps<DotGridProps>(), {
  dotSize: 16,
  gap: 32,
  baseColor: '#27FF64',
  activeColor: '#27FF64',
  proximity: 150,
  speedTrigger: 100,
  shockRadius: 250,
  shockStrength: 5,
  maxSpeed: 5000,
  resistance: 750,
  returnDuration: 1.5,
  className: '',
  style: () => ({})
});

const wrapperRef = useTemplateRef<HTMLDivElement>('wrapperRef');
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
const dots = ref<Dot[]>([]);
const pointer = ref({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  lastTime: 0,
  lastX: 0,
  lastY: 0
});

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

const baseRgb = computed(() => hexToRgb(props.baseColor));
const activeRgb = computed(() => hexToRgb(props.activeColor));

const circlePath = computed(() => {
  if (typeof window === 'undefined' || !window.Path2D) return null;

  const p = new Path2D();
  p.arc(0, 0, props.dotSize / 2, 0, Math.PI * 2);
  return p;
});

const buildGrid = () => {
  const wrap = wrapperRef.value;
  const canvas = canvasRef.value;
  if (!wrap || !canvas) return;

  const { width, height } = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);

  const cols = Math.floor((width + props.gap) / (props.dotSize + props.gap));
  const rows = Math.floor((height + props.gap) / (props.dotSize + props.gap));
  const cell = props.dotSize + props.gap;

  const gridW = cell * cols - props.gap;
  const gridH = cell * rows - props.gap;

  const extraX = width - gridW;
  const extraY = height - gridH;

  const startX = extraX / 2 + props.dotSize / 2;
  const startY = extraY / 2 + props.dotSize / 2;

  const newDots: Dot[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = startX + x * cell;
      const cy = startY + y * cell;
      newDots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
    }
  }
  dots.value = newDots;
};

let rafId: number;
let resizeObserver: ResizeObserver | null = null;

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { x: px, y: py } = pointer.value;
  const proxSq = props.proximity * props.proximity;

  for (const dot of dots.value) {
    const ox = dot.cx + dot.xOffset;
    const oy = dot.cy + dot.yOffset;
    const dx = dot.cx - px;
    const dy = dot.cy - py;
    const dsq = dx * dx + dy * dy;

    let style = props.baseColor;
    if (dsq <= proxSq) {
      const dist = Math.sqrt(dsq);
      const t = 1 - dist / props.proximity;
      const r = Math.round(baseRgb.value.r + (activeRgb.value.r - baseRgb.value.r) * t);
      const g = Math.round(baseRgb.value.g + (activeRgb.value.g - baseRgb.value.g) * t);
      const b = Math.round(baseRgb.value.b + (activeRgb.value.b - baseRgb.value.b) * t);
      style = `rgb(${r},${g},${b})`;
    }

    if (circlePath.value) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = style;
      ctx.fill(circlePath.value);
      ctx.restore();
    }
  }

  rafId = requestAnimationFrame(draw);
};

const onMove = (e: MouseEvent) => {
  const now = performance.now();
  const pr = pointer.value;
  const dt = pr.lastTime ? now - pr.lastTime : 16;
  const dx = e.clientX - pr.lastX;
  const dy = e.clientY - pr.lastY;
  let vx = (dx / dt) * 1000;
  let vy = (dy / dt) * 1000;
  let speed = Math.hypot(vx, vy);
  if (speed > props.maxSpeed) {
    const scale = props.maxSpeed / speed;
    vx *= scale;
    vy *= scale;
    speed = props.maxSpeed;
  }
  pr.lastTime = now;
  pr.lastX = e.clientX;
  pr.lastY = e.clientY;
  pr.vx = vx;
  pr.vy = vy;
  pr.speed = speed;

  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  pr.x = e.clientX - rect.left;
  pr.y = e.clientY - rect.top;

  for (const dot of dots.value) {
    const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
    if (speed > props.speedTrigger && dist < props.proximity && !dot._inertiaApplied) {
      dot._inertiaApplied = true;
      gsap.killTweensOf(dot);
      const pushX = dot.cx - pr.x + vx * 0.005;
      const pushY = dot.cy - pr.y + vy * 0.005;
      gsap.to(dot, {
        inertia: { xOffset: pushX, yOffset: pushY, resistance: props.resistance },
        onComplete: () => {
          gsap.to(dot, {
            xOffset: 0,
            yOffset: 0,
            duration: props.returnDuration,
            ease: 'elastic.out(1,0.75)'
          });
          dot._inertiaApplied = false;
        }
      });
    }
  }
};

const onClick = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  for (const dot of dots.value) {
    const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
    if (dist < props.shockRadius && !dot._inertiaApplied) {
      dot._inertiaApplied = true;
      gsap.killTweensOf(dot);
      const falloff = Math.max(0, 1 - dist / props.shockRadius);
      const pushX = (dot.cx - cx) * props.shockStrength * falloff;
      const pushY = (dot.cy - cy) * props.shockStrength * falloff;
      gsap.to(dot, {
        inertia: { xOffset: pushX, yOffset: pushY, resistance: props.resistance },
        onComplete: () => {
          gsap.to(dot, {
            xOffset: 0,
            yOffset: 0,
            duration: props.returnDuration,
            ease: 'elastic.out(1,0.75)'
          });
          dot._inertiaApplied = false;
        }
      });
    }
  }
};

const throttledMove = throttle(onMove, 50);

onMounted(async () => {
  await nextTick();

  buildGrid();

  if (circlePath.value) {
    draw();
  }

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(buildGrid);
    if (wrapperRef.value) {
      resizeObserver.observe(wrapperRef.value);
    }
  } else {
    (window as Window).addEventListener('resize', buildGrid);
  }

  window.addEventListener('mousemove', throttledMove, { passive: true });
  window.addEventListener('click', onClick);
});

onUnmounted(() => {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
  } else {
    window.removeEventListener('resize', buildGrid);
  }

  window.removeEventListener('mousemove', throttledMove);
  window.removeEventListener('click', onClick);
});

watch([() => props.dotSize, () => props.gap], () => {
  buildGrid();
});

watch([() => props.proximity, () => props.baseColor, activeRgb, baseRgb, circlePath], () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
  if (circlePath.value) {
    draw();
  }
});
</script>


2、Staggered Menu（一个菜单按钮和其动态弹出菜单的样式）
menu菜单的文字全改成中文（请将字体改为ZCOOL QingKe HuangYou，Panel2部分代码有其成熟实现方法，请注意参照），BACK改成“返回初始界面”，ABOUT改成“交互对话”，SERVICES改成“数据库”，CONTACT改成”宏观平台“，并且删除Socials Twitter GitHub LinkedIn这些模块。我们设置了01、02、03、04的荧光绿图案，文本修改时需要顺便调整这些图案的位置，防止这些图案和文本重合了。
四行按钮的行距不能太窄，应该大一点，并且单行字的字与字之间不能太近太过紧凑。
Installation
npm install gsap（我们web是pnpm，这个应该没事吧？我也不懂）
Usage
<template>
 <div style="height: 100vh; background: #1a1a1a">
   <StaggeredMenu
     position="right"
     :items="menuItems"
     :social-items="socialItems"
     :display-socials="true"
     :display-item-numbering="true"
     menu-button-color="#fff"
     open-menu-button-color="#fff"
     :change-menu-color-on-open="true"
     :colors="['#9EF2B2', '#27FF64']"
     logo-url="/path-to-your-logo.svg"
     accent-color="#27FF64"
     @menu-open="handleMenuOpen"
     @menu-close="handleMenuClose"
   />
 </div>
</template>

<script setup>
import StaggeredMenu from './StaggeredMenu.vue'

const menuItems = [
 { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
 { label: 'About', ariaLabel: 'Learn about us', link: '/about' },
 { label: 'Services', ariaLabel: 'View our services', link: '/services' },
 { label: 'Contact', ariaLabel: 'Get in touch', link: '/contact' }
]

const socialItems = [
 { label: 'Twitter', link: 'https://twitter.com' },
 { label: 'GitHub', link: 'https://github.com' },
 { label: 'LinkedIn', link: 'https://linkedin.com' }
]

const handleMenuOpen = () => console.log('Menu opened')
const handleMenuClose = () => console.log('Menu closed')
</script>
Collapse Snippet
Code
<template>
  <div class="w-full h-full sm-scope">
    <div
      :class="(className ? className + ' ' : '') + 'staggered-menu-wrapper relative w-full h-full z-40'"
      :style="accentColor ? { '--sm-accent': accentColor } : undefined"
      :data-position="position"
      :data-open="open || undefined"
    >
      <div
        ref="preLayersRef"
        class="top-0 right-0 bottom-0 z-[5] absolute pointer-events-none sm-prelayers"
        aria-hidden="true"
      >
        <div
          v-for="(color, index) in processedColors"
          :key="index"
          class="top-0 right-0 absolute w-full h-full translate-x-0 sm-prelayer"
          :style="{ background: color }"
        />
      </div>

      <header
        class="top-0 left-0 z-20 absolute flex justify-between items-center bg-transparent p-[2em] w-full pointer-events-none staggered-menu-header"
        aria-label="Main navigation header"
      >
        <div class="flex items-center pointer-events-auto select-none sm-logo" aria-label="Logo">
          <img
            :src="logoUrl || '/src/assets/logos/reactbits-gh-white.svg'"
            alt="Logo"
            class="block w-auto h-8 object-contain sm-logo-img"
            :draggable="false"
            width="110"
            height="24"
          />
        </div>

        <button
          ref="toggleBtnRef"
          class="inline-flex relative items-center gap-[0.3rem] bg-transparent border-0 overflow-visible font-medium text-[#e9e9ef] leading-none cursor-pointer pointer-events-auto sm-toggle"
          :aria-label="open ? 'Close menu' : 'Open menu'"
          :aria-expanded="open"
          aria-controls="staggered-menu-panel"
          @click="toggleMenu"
          type="button"
        >
          <span
            ref="textWrapRef"
            class="inline-block relative w-[var(--sm-toggle-width,auto)] min-w-[var(--sm-toggle-width,auto)] h-[1em] overflow-hidden whitespace-nowrap sm-toggle-textWrap"
            aria-hidden="true"
          >
            <span ref="textInnerRef" class="flex flex-col leading-none sm-toggle-textInner">
              <span v-for="(line, index) in textLines" :key="index" class="block h-[1em] leading-none sm-toggle-line">
                {{ line }}
              </span>
            </span>
          </span>

          <span
            ref="iconRef"
            class="inline-flex relative justify-center items-center w-[14px] h-[14px] sm-icon shrink-0 [will-change:transform]"
            aria-hidden="true"
          >
            <span
              ref="plusHRef"
              class="top-1/2 left-1/2 absolute bg-current rounded-[2px] w-full h-[2px] -translate-x-1/2 -translate-y-1/2 sm-icon-line [will-change:transform]"
            />
            <span
              ref="plusVRef"
              class="top-1/2 left-1/2 absolute bg-current rounded-[2px] w-full h-[2px] -translate-x-1/2 -translate-y-1/2 sm-icon-line sm-icon-line-v [will-change:transform]"
            />
          </span>
        </button>
      </header>

      <aside
        id="staggered-menu-panel"
        ref="panelRef"
        class="top-0 right-0 z-10 absolute flex flex-col bg-white backdrop-blur-[12px] p-[6em_2em_2em_2em] h-full overflow-y-auto staggered-menu-panel"
        style="webkit-backdrop-filter: blur(12px)"
        :aria-hidden="!open"
      >
        <div class="flex flex-col flex-1 gap-5 sm-panel-inner">
          <ul
            class="flex flex-col gap-2 m-0 p-0 list-none sm-panel-list"
            role="list"
            :data-numbering="displayItemNumbering || undefined"
          >
            <li
              v-if="items && items.length"
              v-for="(item, idx) in items"
              :key="item.label + idx"
              class="relative overflow-hidden leading-none sm-panel-itemWrap"
            >
              <a
                class="inline-block relative pr-[1.4em] font-semibold text-[4rem] text-black no-underline uppercase leading-none tracking-[-2px] transition-[background,color] duration-150 ease-linear cursor-pointer sm-panel-item"
                :href="item.link"
                :aria-label="item.ariaLabel"
                :data-index="idx + 1"
              >
                <span class="inline-block will-change-transform sm-panel-itemLabel [transform-origin:50%_100%]">
                  {{ item.label }}
                </span>
              </a>
            </li>
            <li v-else class="relative overflow-hidden leading-none sm-panel-itemWrap" aria-hidden="true">
              <span
                class="inline-block relative pr-[1.4em] font-semibold text-[4rem] text-black no-underline uppercase leading-none tracking-[-2px] transition-[background,color] duration-150 ease-linear cursor-pointer sm-panel-item"
              >
                <span class="inline-block will-change-transform sm-panel-itemLabel [transform-origin:50%_100%]">
                  No items
                </span>
              </span>
            </li>
          </ul>

          <div
            v-if="displaySocials && socialItems && socialItems.length > 0"
            class="flex flex-col gap-3 mt-auto pt-8 sm-socials"
            aria-label="Social links"
          >
            <h3 class="m-0 font-medium text-base sm-socials-title [color:var(--sm-accent,#ff0000)]">Socials</h3>
            <ul class="flex flex-row flex-wrap items-center gap-4 m-0 p-0 list-none sm-socials-list" role="list">
              <li v-for="(social, i) in socialItems" :key="social.label + i" class="sm-socials-item">
                <a
                  :href="social.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block relative py-[2px] font-medium text-[#111] text-[1.2rem] no-underline transition-[color,opacity] duration-300 ease-linear sm-socials-link"
                >
                  {{ social.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}
export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}
export interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items?: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  className?: string;
  logoUrl?: string;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

const props = withDefaults(defineProps<StaggeredMenuProps>(), {
  position: 'right',
  colors: () => ['#9EF2B2', '#27FF64'],
  items: () => [],
  socialItems: () => [],
  displaySocials: true,
  displayItemNumbering: true,
  logoUrl: '/src/assets/logos/vuebits-gh-white.svg',
  menuButtonColor: '#fff',
  openMenuButtonColor: '#fff',
  changeMenuColorOnOpen: true,
  accentColor: '#27FF64'
});

const open = ref(false);
const openRef = ref(false);

const panelRef = useTemplateRef('panelRef');
const preLayersRef = useTemplateRef('preLayersRef');
const preLayerElsRef = ref<HTMLElement[]>([]);

const plusHRef = useTemplateRef('plusHRef');
const plusVRef = useTemplateRef('plusVRef');
const iconRef = useTemplateRef('iconRef');

const textInnerRef = useTemplateRef('textInnerRef');
const textWrapRef = useTemplateRef('textWrapRef');
const textLines = ref<string[]>(['Menu', 'Close']);

const openTlRef = ref<gsap.core.Timeline | null>(null);
const closeTweenRef = ref<gsap.core.Tween | null>(null);
const spinTweenRef = ref<gsap.core.Timeline | null>(null);
const textCycleAnimRef = ref<gsap.core.Tween | null>(null);
const colorTweenRef = ref<gsap.core.Tween | null>(null);

const toggleBtnRef = useTemplateRef('toggleBtnRef');
const busyRef = ref(false);

const itemEntranceTweenRef = ref<gsap.core.Tween | null>(null);

const processedColors = computed(() => {
  const raw = props.colors && props.colors.length ? props.colors.slice(0, 4) : ['#20251F', '#353F37'];
  const arr = [...raw];
  if (arr.length >= 3) {
    const mid = Math.floor(arr.length / 2);
    arr.splice(mid, 1);
  }
  return arr;
});

let gsapContext: gsap.Context | null = null;

const initializeGSAP = () => {
  gsapContext = gsap.context(() => {
    const panel = panelRef.value;
    const preContainer = preLayersRef.value;
    const plusH = plusHRef.value;
    const plusV = plusVRef.value;
    const icon = iconRef.value;
    const textInner = textInnerRef.value;

    if (!panel || !plusH || !plusV || !icon || !textInner) return;

    let preLayers: HTMLElement[] = [];
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer')) as HTMLElement[];
    }
    preLayerElsRef.value = preLayers;

    const offscreen = props.position === 'left' ? -100 : 100;
    gsap.set([panel, ...preLayers], { xPercent: offscreen });

    gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
    gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
    gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });

    gsap.set(textInner, { yPercent: 0 });

    if (toggleBtnRef.value) {
      gsap.set(toggleBtnRef.value, { color: props.menuButtonColor });
    }
  });
};

const buildOpenTimeline = (): gsap.core.Timeline | null => {
  const panel = panelRef.value;
  const layers = preLayerElsRef.value;
  if (!panel) return null;

  openTlRef.value?.kill();
  if (closeTweenRef.value) {
    closeTweenRef.value.kill();
    closeTweenRef.value = null;
  }
  itemEntranceTweenRef.value?.kill();

  const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
  const numberEls = Array.from(
    panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
  ) as HTMLElement[];
  const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement | null;
  const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];

  const layerStates = layers.map((el: HTMLElement) => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
  const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

  if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
  if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as keyof Record<string, number>]: 0 });
  if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
  if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

  const tl = gsap.timeline({ paused: true });

  layerStates.forEach((ls: { el: HTMLElement; start: number }, i: number) => {
    tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
  });

  const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
  const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
  const panelDuration = 0.65;

  tl.fromTo(
    panel,
    { xPercent: panelStart },
    { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
    panelInsertTime
  );

  if (itemEls.length) {
    const itemsStartRatio = 0.15;
    const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;

    tl.to(
      itemEls,
      { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
      itemsStart
    );

    if (numberEls.length) {
      tl.to(
        numberEls,
        {
          duration: 0.6,
          ease: 'power2.out',
          ['--sm-num-opacity' as keyof Record<string, number>]: 1,
          stagger: { each: 0.08, from: 'start' }
        },
        itemsStart + 0.1
      );
    }
  }

  if (socialTitle || socialLinks.length) {
    const socialsStart = panelInsertTime + panelDuration * 0.4;

    if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
    if (socialLinks.length) {
      tl.to(
        socialLinks,
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: 'power3.out',
          stagger: { each: 0.08, from: 'start' },
          onComplete: () => {
            gsap.set(socialLinks, { clearProps: 'opacity' });
          }
        },
        socialsStart + 0.04
      );
    }
  }

  openTlRef.value = tl;
  return tl;
};

const playOpen = () => {
  if (busyRef.value) return;
  busyRef.value = true;
  const tl = buildOpenTimeline();
  if (tl) {
    tl.eventCallback('onComplete', () => {
      busyRef.value = false;
    });
    tl.play(0);
  } else {
    busyRef.value = false;
  }
};

const playClose = () => {
  openTlRef.value?.kill();
  openTlRef.value = null;
  itemEntranceTweenRef.value?.kill();

  const panel = panelRef.value;
  const layers = preLayerElsRef.value;
  if (!panel) return;

  const all: HTMLElement[] = [...layers, panel];
  closeTweenRef.value?.kill();

  const offscreen = props.position === 'left' ? -100 : 100;

  closeTweenRef.value = gsap.to(all, {
    xPercent: offscreen,
    duration: 0.32,
    ease: 'power3.in',
    overwrite: 'auto',
    onComplete: () => {
      const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
      if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });

      const numberEls = Array.from(
        panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')
      ) as HTMLElement[];
      if (numberEls.length) gsap.set(numberEls, { ['--sm-num-opacity' as keyof Record<string, number>]: 0 });

      const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement | null;
      const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];
      if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
      if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

      busyRef.value = false;
    }
  });
};

const animateIcon = (opening: boolean) => {
  const icon = iconRef.value;
  const h = plusHRef.value;
  const v = plusVRef.value;
  if (!icon || !h || !v) return;

  spinTweenRef.value?.kill();

  if (opening) {
    gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
    spinTweenRef.value = gsap
      .timeline({ defaults: { ease: 'power4.out' } })
      .to(h, { rotate: 45, duration: 0.5 }, 0)
      .to(v, { rotate: -45, duration: 0.5 }, 0);
  } else {
    spinTweenRef.value = gsap
      .timeline({ defaults: { ease: 'power3.inOut' } })
      .to(h, { rotate: 0, duration: 0.35 }, 0)
      .to(v, { rotate: 90, duration: 0.35 }, 0)
      .to(icon, { rotate: 0, duration: 0.001 }, 0);
  }
};

const animateColor = (opening: boolean) => {
  const btn = toggleBtnRef.value;
  if (!btn) return;
  colorTweenRef.value?.kill();
  if (props.changeMenuColorOnOpen) {
    const targetColor = opening ? props.openMenuButtonColor : props.menuButtonColor;
    colorTweenRef.value = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
  } else {
    gsap.set(btn, { color: props.menuButtonColor });
  }
};

const animateText = (opening: boolean) => {
  const inner = textInnerRef.value;
  if (!inner) return;

  textCycleAnimRef.value?.kill();

  const valueLabel = opening ? 'Menu' : 'Close';
  const targetLabel = opening ? 'Close' : 'Menu';
  const cycles = 3;

  const seq: string[] = [valueLabel];
  let last = valueLabel;
  for (let i = 0; i < cycles; i++) {
    last = last === 'Menu' ? 'Close' : 'Menu';
    seq.push(last);
  }
  if (last !== targetLabel) seq.push(targetLabel);
  seq.push(targetLabel);

  textLines.value = seq;
  gsap.set(inner, { yPercent: 0 });

  const lineCount = seq.length;
  const finalShift = ((lineCount - 1) / lineCount) * 100;

  textCycleAnimRef.value = gsap.to(inner, {
    yPercent: -finalShift,
    duration: 0.5 + lineCount * 0.07,
    ease: 'power4.out'
  });
};

const toggleMenu = () => {
  const target = !openRef.value;
  openRef.value = target;
  open.value = target;

  if (target) {
    props.onMenuOpen?.();
    playOpen();
  } else {
    props.onMenuClose?.();
    playClose();
  }

  animateIcon(target);
  animateColor(target);
  animateText(target);
};

watch(
  () => [props.changeMenuColorOnOpen, props.menuButtonColor, props.openMenuButtonColor],
  () => {
    if (toggleBtnRef.value) {
      if (props.changeMenuColorOnOpen) {
        const targetColor = openRef.value ? props.openMenuButtonColor : props.menuButtonColor;
        gsap.set(toggleBtnRef.value, { color: targetColor });
      } else {
        gsap.set(toggleBtnRef.value, { color: props.menuButtonColor });
      }
    }
  }
);

watch(
  () => [props.menuButtonColor, props.position],
  () => {
    nextTick(() => {
      if (gsapContext) {
        gsapContext.revert();
      }
      initializeGSAP();
    });
  }
);

onMounted(() => {
  nextTick(() => {
    initializeGSAP();
  });
});

onBeforeUnmount(() => {
  openTlRef.value?.kill();
  closeTweenRef.value?.kill();
  spinTweenRef.value?.kill();
  textCycleAnimRef.value?.kill();
  colorTweenRef.value?.kill();
  itemEntranceTweenRef.value?.kill();

  if (gsapContext) {
    gsapContext.revert();
  }
});
</script>

<style scoped>
.sm-scope .staggered-menu-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 40;
}

.sm-scope .staggered-menu-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2em;
  background: transparent;
  pointer-events: none;
  z-index: 20;
}

.sm-scope .staggered-menu-header > * {
  pointer-events: auto;
}

.sm-scope .sm-logo {
  display: flex;
  align-items: center;
  user-select: none;
}

.sm-scope .sm-logo-img {
  display: block;
  height: 32px;
  width: auto;
  object-fit: contain;
}

.sm-scope .sm-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #e9e9ef;
  font-weight: 500;
  line-height: 1;
  overflow: visible;
}

.sm-scope .sm-toggle:focus-visible {
  outline: 2px solid #ffffffaa;
  outline-offset: 4px;
  border-radius: 4px;
}

.sm-scope .sm-line:last-of-type {
  margin-top: 6px;
}

.sm-scope .sm-toggle-textWrap {
  position: relative;
  margin-right: 0.5em;
  display: inline-block;
  height: 1em;
  overflow: hidden;
  white-space: nowrap;
  width: var(--sm-toggle-width, auto);
  min-width: var(--sm-toggle-width, auto);
}

.sm-scope .sm-toggle-textInner {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.sm-scope .sm-toggle-line {
  display: block;
  height: 1em;
  line-height: 1;
}

.sm-scope .sm-icon {
  position: relative;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

.sm-scope .sm-panel-itemWrap {
  position: relative;
  overflow: hidden;
  line-height: 1;
}

.sm-scope .sm-icon-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
  transform: translate(-50%, -50%);
  will-change: transform;
}

.sm-scope .sm-line {
  display: none !important;
}

.sm-scope .staggered-menu-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: clamp(260px, 38vw, 420px);
  height: 100%;
  background: white;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  padding: 6em 2em 2em 2em;
  overflow-y: auto;
  z-index: 10;
}

.sm-scope [data-position='left'] .staggered-menu-panel {
  right: auto;
  left: 0;
}

.sm-scope .sm-prelayers {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: clamp(260px, 38vw, 420px);
  pointer-events: none;
  z-index: 5;
}

.sm-scope [data-position='left'] .sm-prelayers {
  right: auto;
  left: 0;
}

.sm-scope .sm-prelayer {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 100%;
  transform: translateX(0);
}

.sm-scope .sm-panel-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sm-scope .sm-socials {
  margin-top: auto;
  padding-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sm-scope .sm-socials-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--sm-accent, #ff0000);
}

.sm-scope .sm-socials-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.sm-scope .sm-socials-list .sm-socials-link {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.sm-scope .sm-socials-list:hover .sm-socials-link:not(:hover) {
  opacity: 0.35;
}

.sm-scope .sm-socials-list:focus-within .sm-socials-link:not(:focus-visible) {
  opacity: 0.35;
}

.sm-scope .sm-socials-list .sm-socials-link:hover,
.sm-scope .sm-socials-list .sm-socials-link:focus-visible {
  opacity: 1;
}

.sm-scope .sm-socials-link:focus-visible {
  outline: 2px solid var(--sm-accent, #ff0000);
  outline-offset: 3px;
}

.sm-scope .sm-socials-link {
  font-size: 1.2rem;
  font-weight: 500;
  color: #111;
  text-decoration: none;
  position: relative;
  padding: 2px 0;
  display: inline-block;
  transition:
    color 0.3s ease,
    opacity 0.3s ease;
}

.sm-scope .sm-socials-link:hover {
  color: var(--sm-accent, #ff0000);
}

.sm-scope .sm-panel-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
}

.sm-scope .sm-panel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sm-scope .sm-panel-item {
  position: relative;
  color: #000;
  font-weight: 600;
  font-size: 4rem;
  cursor: pointer;
  line-height: 1;
  letter-spacing: -2px;
  text-transform: uppercase;
  transition:
    background 0.25s,
    color 0.25s;
  display: inline-block;
  text-decoration: none;
  padding-right: 1.4em;
}

.sm-scope .sm-panel-itemLabel {
  display: inline-block;
  will-change: transform;
  transform-origin: 50% 100%;
}

.sm-scope .sm-panel-item:hover {
  color: var(--sm-accent, #ff0000);
}

.sm-scope .sm-panel-list[data-numbering] {
  counter-reset: smItem;
}

.sm-scope .sm-panel-list[data-numbering] .sm-panel-item::after {
  counter-increment: smItem;
  content: counter(smItem, decimal-leading-zero);
  position: absolute;
  top: 0.1em;
  right: 3.2em;
  font-size: 18px;
  font-weight: 400;
  color: var(--sm-accent, #ff0000);
  letter-spacing: 0;
  pointer-events: none;
  user-select: none;
  opacity: var(--sm-num-opacity, 0);
}

@media (max-width: 1024px) {
  .sm-scope .staggered-menu-panel {
    width: 100%;
    left: 0;
    right: 0;
  }
  .sm-scope .staggered-menu-wrapper[data-open] .sm-logo-img {
    filter: invert(100%);
  }
}

@media (max-width: 640px) {
  .sm-scope .staggered-menu-panel {
    width: 100%;
    left: 0;
    right: 0;
  }
  .sm-scope .staggered-menu-wrapper[data-open] .sm-logo-img {
    filter: invert(100%);
  }
}
</style>


