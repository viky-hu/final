"use client";

export interface HyperspeedColors {
  background: number;
  road: number;
  divider: number;
  leftLines: number[];
  rightLines: number[];
  sticks: number[];
}

export interface HyperspeedOptions {
  speedUp: number;
  fov: number;
  fovSpeedUp: number;
  bloomIntensity: number;
  bloomLuminanceThreshold: number;
  lightPairsPerRoadWay: number;
  totalSideLightSticks: number;
  lineLength: [number, number];
  lineRadius: [number, number];
  movingAwaySpeed: [number, number];
  movingCloserSpeed: [number, number];
  sideStickSpeed: [number, number];
  roadWidth: number;
  islandWidth: number;
  spreadX: [number, number];
  spreadY: [number, number];
  stickWidth: [number, number];
  stickHeight: [number, number];
  colors: HyperspeedColors;
}

export const hyperspeedPresets: Record<string, HyperspeedOptions> = {
  panelRoadNeon: {
    speedUp: 2.6,
    fov: 90,
    fovSpeedUp: 132,
    bloomIntensity: 1.2,
    bloomLuminanceThreshold: 0.24,
    lightPairsPerRoadWay: 56,
    totalSideLightSticks: 40,
    lineLength: [7, 34],
    lineRadius: [0.014, 0.065],
    movingAwaySpeed: [70, 92],
    movingCloserSpeed: [-175, -128],
    sideStickSpeed: [60, 95],
    roadWidth: 9.5,
    islandWidth: 2.2,
    spreadX: [0.4, 3.6],
    spreadY: [0.05, 1.8],
    stickWidth: [0.05, 0.24],
    stickHeight: [0.75, 1.9],
    colors: {
      background: 0x040507,
      road: 0x0a0c12,
      divider: 0x0f1119,
      leftLines: [0xd856bf, 0x9e63ff, 0xff6eb6],
      rightLines: [0x03b3c3, 0x2d8cff, 0x8ad8ff],
      sticks: [0x43c6ff, 0xa58bff],
    },
  },
  // Backward-compatible alias for newer callers.
  one: {
    speedUp: 2.6,
    fov: 90,
    fovSpeedUp: 132,
    bloomIntensity: 1.2,
    bloomLuminanceThreshold: 0.24,
    lightPairsPerRoadWay: 56,
    totalSideLightSticks: 40,
    lineLength: [7, 34],
    lineRadius: [0.014, 0.065],
    movingAwaySpeed: [70, 92],
    movingCloserSpeed: [-175, -128],
    sideStickSpeed: [60, 95],
    roadWidth: 9.5,
    islandWidth: 2.2,
    spreadX: [0.4, 3.6],
    spreadY: [0.05, 1.8],
    stickWidth: [0.05, 0.24],
    stickHeight: [0.75, 1.9],
    colors: {
      background: 0x040507,
      road: 0x0a0c12,
      divider: 0x0f1119,
      leftLines: [0xd856bf, 0x9e63ff, 0xff6eb6],
      rightLines: [0x03b3c3, 0x2d8cff, 0x8ad8ff],
      sticks: [0x43c6ff, 0xa58bff],
    },
  },
};

