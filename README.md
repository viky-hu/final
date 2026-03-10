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

## 🚀 第二个窗口：LightRAG Chat（标准实施稿）

### 设计目标
第二窗口延续“画布思维”，以深色底和几何网格构建高动态界面。  
核心观感：**标题优先上升、线条中心生长、白线柔和转蓝、色块流动揭示、按钮真实压感反馈**。

### 一、统一坐标系统（1920 x 1080）
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

---

### 二、版式与颜色（唯一口径）
- **页面背景**：`#1E1919`
- **主标题**：白色粗体，文案 `LightRAG`
- **右下黄区文案**：深色字 `#121212`（保证对比）
- **右下绿区文案**：白色字 `#FFFFFF`
- **黄区**：`#F7D147`，区域 `x: V3 -> 1920`、`y: 0 -> L1`
- **绿区**：`#164D33`，区域 `x: (V2 + 2/3*(V3-V2)) -> V3`、`y: L4 -> 1080`
- **科技蓝**：`#2D5AF7`（线条最终细线颜色 + 左侧按钮主色）

---

### 三、动画分层与技术细节 (Technical Deep Dive)

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

---

### 四、时间轴（标准版）
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

---

### 五、参数调优手册 (Parameter Tuning)

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

---

### 六、Next.js / React 实施规范
- **动画组件使用 `"use client"`**，初始化放在 `useLayoutEffect`。
- **销毁管理**：所有动画通过 `gsap.context()` 管理，清理函数调用 `ctx.revert()`。
- **渲染策略**：暗色背景下的细线，强制使用物理 1px + 透明度方案，禁用物理 0.x px 线宽。


---

## 🧩 第二窗口升级：三板块全屏滚动（需求冻结稿）

> 目标：将当前“黑色动态板块”升级为一个由 3 个全屏 panel 组成的产品介绍长栏。  
> 交互方式：用户滚轮或轻点触发，按屏切换，不允许同屏出现两个板块。

### 一、全局硬规则（必须满足）

- **一屏一板块**：任意时刻仅显示一个 panel。
- **严格全屏**：每个 panel 必须始终撑满视口（`100vw × 100dvh`）。
- **禁止穿屏**：不得出现“黑+白”或“黑+蓝”同时可见的情况。
- **整屏步进**：切换时按整屏跳转（index 步进），不可半屏停留。
- **过渡锁定**：切换动画期间锁定输入，避免连续触发导致越级跳转。

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

### 四、三板块规划（当前版本）

#### Panel 1（已实现 / 现有）
- 主题：黑色动态主视觉（LightRAG 几何动效）
- 状态：已完成基础动效，可继续微调

#### Panel 2（已开始实现 / 线条特效版本）
- 主题：蓝色产品介绍主板块
- 目标：承接 Panel 1，突出核心价值与能力摘要
- 状态：**白底 + 线条流光特效已接入（持续迭代）**

#### Panel 3（待实现 / 留白）
- 主题：第二个补充板块（蓝系延展）
- 目标：展示进阶能力、场景或案例信息
- 状态：**留白，暂未动工**

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
        └── panels/
            ├── PanelBlack.tsx     # Panel 1：已完成黑色动效
            ├── PanelBlueMain.tsx  # Panel 2：蓝色主介绍（已接入 Hyperspeed）
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
- 内容层：`.panel-blue-main-content` 使用 `position: absolute; inset: 0; z-index: 1`，保证文案覆盖在流光之上。

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