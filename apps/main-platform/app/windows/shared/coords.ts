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
