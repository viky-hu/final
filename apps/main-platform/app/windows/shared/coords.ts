// ─────────────────────────────────────────────
// Window 1 · Login / Intro  (viewBox 1440 × 900)
// ─────────────────────────────────────────────
export const BRAND_BLUE = "#3152f4";
export const GRID_COLOR = "rgba(49, 82, 244, 0.12)";
export const VW = 1440;
export const VH = 900;
export const PHASE1_STROKE = 1.5;

export const INTRO_COORDS = {
  x1: 0.31 * VW,
  x2: 0.69 * VW,
  y1: 0.17 * VH,
  y2: 0.83 * VH,
};

export const COLLAPSE_COORDS = {
  x1: 0.37 * VW,
  x2: 0.63 * VW,
  y1: 0.23 * VH,
  y2: 0.83 * VH,
};

// Background reference grid positions (non-uniform)
export const GRID_V = [0.08, 0.18, 0.3, 0.42, 0.58, 0.7, 0.82, 0.92].map((r) => r * VW);
export const GRID_H = [0.06, 0.14, 0.28, 0.44, 0.56, 0.72, 0.86, 0.94].map((r) => r * VH);

// ─────────────────────────────────────────────
// Window 2 · Product Intro  (viewBox 1920 × 1080)
// ─────────────────────────────────────────────
export const CHAT_W = 1920;
export const CHAT_H = 1080;
export const CHAT_BLUE = "#8494FF";
export const CHAT_BG = "#1e1919";

// Vertical grid lines
export const CHAT_V1 = 56;
export const CHAT_V2 = 254;
export const CHAT_V3 = 1524;

// Horizontal grid lines
export const CHAT_L1 = 328.5;
export const CHAT_L2 = 469.5;
export const CHAT_L3 = 610.5;
export const CHAT_L4 = 751.5;

// Derived positions
export const CHAT_GREEN_START_X = CHAT_V2 + ((CHAT_V3 - CHAT_V2) * 2) / 3;
export const CHAT_X_MID = (CHAT_V2 + CHAT_V3) / 2;
export const CHAT_Y_MID = CHAT_H / 2;

// Title clipping / layout
export const CHAT_TITLE_TOP_EXPAND = 36;
export const CHAT_TITLE_BOTTOM_EXPAND = 56;
export const CHAT_TITLE_TEXT_BASE_HEIGHT = CHAT_L3 - CHAT_L2;
export const CHAT_TITLE_FO_Y = CHAT_L2 - CHAT_TITLE_TOP_EXPAND;
export const CHAT_TITLE_FO_HEIGHT =
  CHAT_TITLE_TEXT_BASE_HEIGHT + CHAT_TITLE_TOP_EXPAND + CHAT_TITLE_BOTTOM_EXPAND;
export const CHAT_TITLE_MASK_Y = CHAT_TITLE_FO_Y;
export const CHAT_TITLE_MASK_HEIGHT = CHAT_TITLE_FO_HEIGHT;

// Corner quote positions
export const CHAT_QUOTE_TL_X = 140;
export const CHAT_QUOTE_TL_Y = 200;
export const CHAT_QUOTE_BR_X = 1700;
export const CHAT_QUOTE_BR_Y = 1050;
export const CHAT_QUOTE_SCALE = 1.7;

// ─────────────────────────────────────────────
// Window 2 · Panel 2 (Blue) · Lines Blueprint
// ─────────────────────────────────────────────
// Panel 2 text box (CSS): top 35%, width min(90vw, 1280px), centered.
// For 1920×1080, approx text box: x: 320~1600, y: 378~499.
// Main box lines keep ~40px padding around text box.
export const P2_V1 = CHAT_V1; // Aligns with Panel 1 V1 (56)
export const P2_TOP = 338;
export const P2_BOTTOM = 539;
export const P2_LEFT = 280;
export const P2_RIGHT = 1640;
export const P2_AUX_H_Y = 169;
// Panel 2 quotes: keep TL same as Panel 1, lift BR into lower third area.
export const P2_QUOTE_BR_Y = 720;

// ─────────────────────────────────────────────
// Window 2 · Panel 3 (Blue Extend) · 四条横线
// 与 Panel 1 间隔一致，对称轴上移约 60px，为下方 Threads 留空
// ─────────────────────────────────────────────
export const P3_L1 = 268.5;
export const P3_L2 = 409.5;
export const P3_L3 = 550.5;
export const P3_L4 = 691.5;

// ─────────────────────────────────────────────
// Window 3 · Main (Chat Canvas) · 1440×900
// 四线围成的画布区域，y1/y2 扩张后贴紧上下屏幕边界
// ─────────────────────────────────────────────
export const MAIN_CANVAS_INITIAL = {
  x1: 0.35 * VW, // 504
  x2: 0.65 * VW, // 936
  y1: 0.23 * VH, // 207
  y2: 0.83 * VH, // 747
};

// 菜单收起（默认）时的展开态坐标
export const MAIN_CANVAS_EXPANDED = {
  x1: 0.25 * VW, // 360
  x2: 0.75 * VW, // 1080
  y1: 0 * VH,    // 0
  y2: 1 * VH,    // 900
};

// 菜单展开时，画布横向平移至左侧 2/3 区间
export const MAIN_CANVAS_MENU_OPEN = {
  x1: 0.10 * VW, // 144
  x2: 0.60 * VW, // 864
  y1: 0 * VH,
  y2: 1 * VH,
};

export const MAIN_CANVAS_FILL = "#1e1919";
export const MAIN_CANVAS_LINE_ACTIVE = "#27FF64";
export const MAIN_CANVAS_LINE_INITIAL = "#ffffff";
export const MAIN_CANVAS_STROKE_WIDTH = 1.5;

// ─────────────────────────────────────────────
// Window 3 · Model Config Canvas · 1440×900
// 模型配置画布，独立于主画布，填充色为暖白
// ─────────────────────────────────────────────
export const MC_CANVAS_INITIAL = {
  x1: 0.35 * VW, // 504
  x2: 0.65 * VW, // 936
  y1: 0.23 * VH, // 207
  y2: 0.83 * VH, // 747
};

export const MC_CANVAS_EXPANDED = {
  x1: 0.25 * VW, // 360
  x2: 0.75 * VW, // 1080
  y1: 0,
  y2: VH,
};

// 菜单展开时，模型配置画布横向平移至左侧 2/3 区间（与主画布完全一致）
export const MC_CANVAS_MENU_OPEN = {
  x1: 0.10 * VW, // 144
  x2: 0.60 * VW, // 864
  y1: 0,
  y2: VH,
};

export const MC_CANVAS_FILL = "#FFF6F6";
export const MC_CANVAS_LINE_ACTIVE = "#27FF64";
export const MC_CANVAS_LINE_INITIAL = "#ffffff";
export const MC_CANVAS_STROKE_WIDTH = 1.5;

// ─────────────────────────────────────────────
// Window 5 · Macro Platform  (viewBox 1440 × 900)
// ─────────────────────────────────────────────
export const MACRO_BG = "#ffffff";
export const MACRO_LINE_INITIAL = "#1e1919";
export const MACRO_LINE_SETTLED = "#888888";
export const MACRO_STROKE_WIDTH = 1.5;
