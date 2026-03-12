"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from "postprocessing";
import type { HyperspeedOptions as PresetHyperspeedOptions } from "./hyperspeedPresets";
import { hyperspeedPresets } from "./hyperspeedPresets";

interface Distortion {
  uniforms: Record<string, { value: unknown }>;
  getDistortion: string;
  getJS?: (progress: number, time: number) => THREE.Vector3;
}

interface HyperspeedBackgroundProps {
  effectOptions?: Partial<PresetHyperspeedOptions> & Record<string, unknown>;
}

export interface HyperspeedBackgroundHandle {
  /** 停止动效并释放资源，与收起动画 onComplete 同帧调用可避免后台继续播放造成卡顿 */
  stop(): void;
}

interface RuntimeHyperspeedColors {
  background: number;
  roadColor: number;
  islandColor: number;
  shoulderLines: number;
  brokenLines: number;
  leftCars: readonly number[] | number;
  rightCars: readonly number[] | number;
  sticks: readonly number[] | number;
}

interface RuntimeHyperspeedOptions {
  onSpeedUp?: (event: MouseEvent) => void;
  onSlowDown?: (event: MouseEvent) => void;
  distortion?: Distortion | keyof typeof distortions | null;
  length: number;
  roadWidth: number;
  islandWidth: number;
  lanesPerRoad: number;
  speedUp: number;
  fov: number;
  fovSpeedUp: number;
  bloomIntensity: number;
  bloomLuminanceThreshold: number;
  lightPairsPerRoadWay: number;
  totalSideLightSticks: number;
  carLightsFade: number;
  carLightsLength: [number, number];
  carLightsRadius: [number, number];
  carWidthPercentage: [number, number];
  carShiftX: [number, number];
  carFloorSeparation: [number, number];
  movingAwaySpeed: [number, number];
  movingCloserSpeed: [number, number];
  lightStickWidth: [number, number];
  lightStickHeight: [number, number];
  shoulderLinesWidthPercentage: number;
  brokenLinesWidthPercentage: number;
  brokenLinesLengthPercentage: number;
  colors: RuntimeHyperspeedColors;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toTuple2(value: unknown, fallback: [number, number]): [number, number] {
  if (Array.isArray(value) && value.length >= 2) {
    const a = Number(value[0]);
    const b = Number(value[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];
  }
  return fallback;
}

function toColorList(value: unknown, fallback: readonly number[] | number): readonly number[] | number {
  if (Array.isArray(value) && value.length > 0) return value.map((v) => Number(v));
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function normalizeOptions(basePreset: unknown, overridePreset?: unknown): RuntimeHyperspeedOptions {
  const base = (basePreset ?? {}) as Record<string, unknown>;
  const override = (overridePreset ?? {}) as Record<string, unknown>;
  const raw = { ...base, ...override };
  const colors = {
    ...((base.colors as Record<string, unknown> | undefined) ?? {}),
    ...((override.colors as Record<string, unknown> | undefined) ?? {}),
  };

  const length = toNumber(raw.length, 400);

  return {
    onSpeedUp: typeof raw.onSpeedUp === "function" ? (raw.onSpeedUp as (event: MouseEvent) => void) : undefined,
    onSlowDown: typeof raw.onSlowDown === "function" ? (raw.onSlowDown as (event: MouseEvent) => void) : undefined,
    distortion: (raw.distortion as RuntimeHyperspeedOptions["distortion"]) ?? "turbulentDistortion",
    length,
    roadWidth: toNumber(raw.roadWidth, 10),
    islandWidth: toNumber(raw.islandWidth, 2),
    lanesPerRoad: toNumber(raw.lanesPerRoad, 3),
    speedUp: toNumber(raw.speedUp, 2.4),
    fov: toNumber(raw.fov, 90),
    fovSpeedUp: toNumber(raw.fovSpeedUp, 140),
    bloomIntensity: toNumber(raw.bloomIntensity, 0.8),
    bloomLuminanceThreshold: toNumber(raw.bloomLuminanceThreshold, 0.2),
    lightPairsPerRoadWay: toNumber(raw.lightPairsPerRoadWay, 50),
    totalSideLightSticks: toNumber(raw.totalSideLightSticks, 30),
    carLightsFade: toNumber(raw.carLightsFade, 0.4),
    carLightsLength: toTuple2(raw.carLightsLength ?? raw.lineLength, [length * 0.03, length * 0.2]),
    carLightsRadius: toTuple2(raw.carLightsRadius ?? raw.lineRadius, [0.05, 0.14]),
    carWidthPercentage: toTuple2(raw.carWidthPercentage, [0.3, 0.5]),
    carShiftX: toTuple2(raw.carShiftX, [-0.8, 0.8]),
    carFloorSeparation: toTuple2(raw.carFloorSeparation, [0, 5]),
    movingAwaySpeed: toTuple2(raw.movingAwaySpeed, [60, 80]),
    movingCloserSpeed: toTuple2(raw.movingCloserSpeed, [-120, -160]),
    lightStickWidth: toTuple2(raw.lightStickWidth ?? raw.stickWidth, [0.12, 0.5]),
    lightStickHeight: toTuple2(raw.lightStickHeight ?? raw.stickHeight, [1.3, 1.7]),
    shoulderLinesWidthPercentage: toNumber(raw.shoulderLinesWidthPercentage, 0.05),
    brokenLinesWidthPercentage: toNumber(raw.brokenLinesWidthPercentage, 0.1),
    brokenLinesLengthPercentage: toNumber(raw.brokenLinesLengthPercentage, 0.5),
    colors: {
      background: toNumber(colors.background, 0x1e1919),
      roadColor: toNumber(colors.roadColor ?? colors.road, 0x080808),
      islandColor: toNumber(colors.islandColor ?? colors.divider, 0x0a0a0a),
      shoulderLines: toNumber(colors.shoulderLines ?? colors.brokenLines ?? colors.divider ?? colors.road, 0x0f1119),
      brokenLines: toNumber(colors.brokenLines ?? colors.shoulderLines ?? colors.divider ?? colors.road, 0x0f1119),
      leftCars: toColorList(colors.leftCars ?? colors.leftLines, [0xd856bf, 0x6750a2, 0xc247ac]),
      rightCars: toColorList(colors.rightCars ?? colors.rightLines, [0x03b3c3, 0x0e5ea5, 0x324555]),
      sticks: toColorList(colors.sticks, [0x03b3c3, 0xe5a1ff]),
    },
  };
}

function nsin(val: number) {
  return Math.sin(val) * 0.5 + 0.5;
}

const mountainUniforms = {
  uFreq: { value: new THREE.Vector3(3, 6, 10) },
  uAmp: { value: new THREE.Vector3(30, 30, 20) },
};

const xyUniforms = {
  uFreq: { value: new THREE.Vector2(5, 2) },
  uAmp: { value: new THREE.Vector2(25, 15) },
};

const LongRaceUniforms = {
  uFreq: { value: new THREE.Vector2(2, 3) },
  uAmp: { value: new THREE.Vector2(35, 10) },
};

const turbulentUniforms = {
  uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
  uAmp: { value: new THREE.Vector4(25, 5, 10, 10) },
};

const deepUniforms = {
  uFreq: { value: new THREE.Vector2(4, 8) },
  uAmp: { value: new THREE.Vector2(10, 20) },
  uPowY: { value: new THREE.Vector2(20, 2) },
};

const distortions: Record<string, Distortion> = {
  mountainDistortion: {
    uniforms: mountainUniforms,
    getDistortion: `
      uniform vec3 uAmp;
      uniform vec3 uFreq;
      #define PI 3.14159265358979
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      vec3 getDistortion(float progress){
        float movementProgressFix = 0.02;
        return vec3(
          cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
          nsin(progress * PI * uFreq.y + uTime) * uAmp.y - nsin(movementProgressFix * PI * uFreq.y + uTime) * uAmp.y,
          nsin(progress * PI * uFreq.z + uTime) * uAmp.z - nsin(movementProgressFix * PI * uFreq.z + uTime) * uAmp.z
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const movementProgressFix = 0.02;
      const uFreq = mountainUniforms.uFreq.value;
      const uAmp = mountainUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
        nsin(progress * Math.PI * uFreq.y + time) * uAmp.y -
          nsin(movementProgressFix * Math.PI * uFreq.y + time) * uAmp.y,
        nsin(progress * Math.PI * uFreq.z + time) * uAmp.z -
          nsin(movementProgressFix * Math.PI * uFreq.z + time) * uAmp.z,
      );
      return distortion.multiply(new THREE.Vector3(2, 2, 2)).add(new THREE.Vector3(0, 0, -5));
    },
  },
  xyDistortion: {
    uniforms: xyUniforms,
    getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float movementProgressFix = 0.02;
        return vec3(
          cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + PI/2. + uTime) * uAmp.y - sin(movementProgressFix * PI * uFreq.y + PI/2. + uTime) * uAmp.y,
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const movementProgressFix = 0.02;
      const uFreq = xyUniforms.uFreq.value;
      const uAmp = xyUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
        Math.sin(progress * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y -
          Math.sin(movementProgressFix * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y,
        0,
      );
      return distortion.multiply(new THREE.Vector3(2, 0.4, 1)).add(new THREE.Vector3(0, 0, -3));
    },
  },
  LongRaceDistortion: {
    uniforms: LongRaceUniforms,
    getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float camProgress = 0.0125;
        return vec3(
          sin(progress * PI * uFreq.x + uTime) * uAmp.x - sin(camProgress * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + uTime) * uAmp.y - sin(camProgress * PI * uFreq.y + uTime) * uAmp.y,
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const camProgress = 0.0125;
      const uFreq = LongRaceUniforms.uFreq.value;
      const uAmp = LongRaceUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.sin(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.sin(camProgress * Math.PI * uFreq.x + time) * uAmp.x,
        Math.sin(progress * Math.PI * uFreq.y + time) * uAmp.y -
          Math.sin(camProgress * Math.PI * uFreq.y + time) * uAmp.y,
        0,
      );
      return distortion.multiply(new THREE.Vector3(1, 1, 0)).add(new THREE.Vector3(0, 0, -5));
    },
  },
  turbulentDistortion: {
    uniforms: turbulentUniforms,
    getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      float nsin(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          cos(PI * progress * uFreq.r + uTime) * uAmp.r +
          pow(cos(PI * progress * uFreq.g + uTime * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
        );
      }
      float getDistortionY(float progress){
        return (
          -nsin(PI * progress * uFreq.b + uTime) * uAmp.b +
          -pow(nsin(PI * progress * uFreq.a + uTime / (uFreq.b / uFreq.a)), 5.) * uAmp.a
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.0125),
          getDistortionY(progress) - getDistortionY(0.0125),
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const uFreq = turbulentUniforms.uFreq.value;
      const uAmp = turbulentUniforms.uAmp.value;
      const getX = (p: number) =>
        Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
        Math.pow(Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)), 2) * uAmp.y;
      const getY = (p: number) =>
        -nsin(Math.PI * p * uFreq.z + time) * uAmp.z -
        Math.pow(nsin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)), 5) * uAmp.w;
      const distortion = new THREE.Vector3(getX(progress) - getX(progress + 0.007), getY(progress) - getY(progress + 0.007), 0);
      return distortion.multiply(new THREE.Vector3(-2, -5, 0)).add(new THREE.Vector3(0, 0, -10));
    },
  },
  deepDistortion: {
    uniforms: deepUniforms,
    getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      uniform vec2 uPowY;
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return sin(progress * PI * uFreq.x + uTime) * uAmp.x;
      }
      float getDistortionY(float progress){
        return pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y + uTime) * uAmp.y;
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.02),
          0.
        );
      }
    `,
    getJS: (progress: number, time: number) => {
      const uFreq = deepUniforms.uFreq.value;
      const uAmp = deepUniforms.uAmp.value;
      const uPowY = deepUniforms.uPowY.value;
      const getX = (p: number) => Math.sin(p * Math.PI * uFreq.x + time) * uAmp.x;
      const getY = (p: number) => Math.pow(p * uPowY.x, uPowY.y) + Math.sin(p * Math.PI * uFreq.y + time) * uAmp.y;
      const distortion = new THREE.Vector3(getX(progress) - getX(progress + 0.01), getY(progress) - getY(progress + 0.01), 0);
      return distortion.multiply(new THREE.Vector3(-2, -4, 0)).add(new THREE.Vector3(0, 0, -10));
    },
  },
};

const distortion_uniforms = {
  uDistortionX: { value: new THREE.Vector2(80, 3) },
  uDistortionY: { value: new THREE.Vector2(-40, 2.5) },
};

const distortion_vertex = `
  #define PI 3.14159265358979
  uniform vec2 uDistortionX;
  uniform vec2 uDistortionY;
  float nsin(float val){
    return sin(val) * 0.5 + 0.5;
  }
  vec3 getDistortion(float progress){
    progress = clamp(progress, 0., 1.);
    float xAmp = uDistortionX.r;
    float xFreq = uDistortionX.g;
    float yAmp = uDistortionY.r;
    float yFreq = uDistortionY.g;
    return vec3(
      xAmp * nsin(progress * PI * xFreq - PI / 2.),
      yAmp * nsin(progress * PI * yFreq - PI / 2.),
      0.
    );
  }
`;

function random(base: number | [number, number]): number {
  if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0];
  return Math.random() * base;
}

function pickRandom<T>(arr: T | readonly T[]): T {
  if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)];
  return arr as T;
}

function lerp(current: number, target: number, speed = 0.1, limit = 0.001): number {
  let change = (target - current) * speed;
  if (Math.abs(change) < limit) change = target - current;
  return change;
}

const carLightsFragment = `
  #define USE_FOG;
  ${THREE.ShaderChunk.fog_pars_fragment}
  varying vec3 vColor;
  varying vec2 vUv;
  uniform vec2 uFade;
  void main() {
    vec3 color = vec3(vColor);
    float alpha = smoothstep(uFade.x, uFade.y, vUv.x);
    gl_FragColor = vec4(color, alpha);
    if (gl_FragColor.a < 0.0001) discard;
    ${THREE.ShaderChunk.fog_fragment}
  }
`;

const carLightsVertex = `
  #define USE_FOG;
  ${THREE.ShaderChunk.fog_pars_vertex}
  attribute vec3 aOffset;
  attribute vec3 aMetrics;
  attribute vec3 aColor;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vColor;
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    float radius = aMetrics.r;
    float myLength = aMetrics.g;
    float speed = aMetrics.b;
    transformed.xy *= radius;
    transformed.z *= myLength;
    transformed.z += myLength - mod(uTime * speed + aOffset.z, uTravelLength);
    transformed.xy += aOffset.xy;
    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vColor = aColor;
    ${THREE.ShaderChunk.fog_vertex}
  }
`;

const sideSticksVertex = `
  #define USE_FOG;
  ${THREE.ShaderChunk.fog_pars_vertex}
  attribute float aOffset;
  attribute vec3 aColor;
  attribute vec2 aMetrics;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec3 vColor;
  mat4 rotationY( in float angle ) {
    return mat4(
      cos(angle), 0, sin(angle), 0,
      0, 1.0, 0, 0,
      -sin(angle), 0, cos(angle), 0,
      0, 0, 0, 1
    );
  }
  #include <getDistortion_vertex>
  void main(){
    vec3 transformed = position.xyz;
    float width = aMetrics.x;
    float height = aMetrics.y;
    transformed.xy *= vec2(width, height);
    float time = mod(uTime * 60. * 2. + aOffset, uTravelLength);
    transformed = (rotationY(3.14/2.) * vec4(transformed,1.)).xyz;
    transformed.z += - uTravelLength + time;
    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);
    transformed.y += height / 2.;
    transformed.x += -width / 2.;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    ${THREE.ShaderChunk.fog_vertex}
  }
`;

const sideSticksFragment = `
  #define USE_FOG;
  ${THREE.ShaderChunk.fog_pars_fragment}
  varying vec3 vColor;
  void main(){
    vec3 color = vec3(vColor);
    gl_FragColor = vec4(color,1.);
    ${THREE.ShaderChunk.fog_fragment}
  }
`;

const roadBaseFragment = `
  #define USE_FOG;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uTime;
  #include <roadMarkings_vars>
  ${THREE.ShaderChunk.fog_pars_fragment}
  void main() {
    vec2 uv = vUv;
    vec3 color = vec3(uColor);
    #include <roadMarkings_fragment>
    gl_FragColor = vec4(color, 1.);
    ${THREE.ShaderChunk.fog_fragment}
  }
`;

const roadMarkings_vars = `
  uniform float uLanes;
  uniform vec3 uBrokenLinesColor;
  uniform vec3 uShoulderLinesColor;
  uniform float uShoulderLinesWidthPercentage;
  uniform float uBrokenLinesWidthPercentage;
  uniform float uBrokenLinesLengthPercentage;
`;

const roadMarkings_fragment = `
  uv.y = mod(uv.y + uTime * 0.05, 1.);
  float laneWidth = 1.0 / uLanes;
  float brokenLineWidth = laneWidth * uBrokenLinesWidthPercentage;
  float laneEmptySpace = 1. - uBrokenLinesLengthPercentage;
  float brokenLines = step(1.0 - brokenLineWidth, fract(uv.x * 2.0)) * step(laneEmptySpace, fract(uv.y * 10.0));
  float sideLines = step(1.0 - brokenLineWidth, fract((uv.x - laneWidth * (uLanes - 1.0)) * 2.0)) + step(brokenLineWidth, uv.x);
  float marks = mix(brokenLines, sideLines, uv.x);
  color = mix(color, uBrokenLinesColor, marks);
`;

const roadFragment = roadBaseFragment
  .replace("#include <roadMarkings_fragment>", roadMarkings_fragment)
  .replace("#include <roadMarkings_vars>", roadMarkings_vars);

const islandFragment = roadBaseFragment
  .replace("#include <roadMarkings_fragment>", "")
  .replace("#include <roadMarkings_vars>", "");

const roadVertex = `
  #define USE_FOG;
  uniform float uTime;
  ${THREE.ShaderChunk.fog_pars_vertex}
  uniform float uTravelLength;
  varying vec2 vUv;
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    vec3 distortion = getDistortion((transformed.y + uTravelLength / 2.) / uTravelLength);
    transformed.x += distortion.x;
    transformed.z += distortion.y;
    transformed.y += -1. * distortion.z;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    ${THREE.ShaderChunk.fog_vertex}
  }
`;

class CarLights {
  webgl: App;
  options: RuntimeHyperspeedOptions;
  colors: readonly number[] | number;
  speed: [number, number];
  fade: THREE.Vector2;
  mesh!: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;

  constructor(
    webgl: App,
    options: RuntimeHyperspeedOptions,
    colors: readonly number[] | number,
    speed: [number, number],
    fade: THREE.Vector2,
  ) {
    this.webgl = webgl;
    this.options = options;
    this.colors = colors;
    this.speed = speed;
    this.fade = fade;
  }

  init() {
    const options = this.options;
    const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
    const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false);
    const instanced = new THREE.InstancedBufferGeometry();
    Object.keys(geometry.attributes).forEach((key) => {
      instanced.setAttribute(key, geometry.attributes[key as keyof typeof geometry.attributes]);
    });
    if (geometry.index) instanced.setIndex(geometry.index);
    instanced.instanceCount = options.lightPairsPerRoadWay * 2;

    const laneWidth = options.roadWidth / options.lanesPerRoad;
    const aOffset: number[] = [];
    const aMetrics: number[] = [];
    const aColor: number[] = [];
    const colorValues = Array.isArray(this.colors) ? this.colors : [this.colors];
    const colorArray = colorValues.map((c) => new THREE.Color(Number(c)));

    for (let i = 0; i < options.lightPairsPerRoadWay; i += 1) {
      const radius = random(options.carLightsRadius);
      const length = random(options.carLightsLength);
      const spd = random(this.speed);
      const carLane = i % options.lanesPerRoad;
      let laneX = carLane * laneWidth - options.roadWidth / 2 + laneWidth / 2;
      const carWidth = random(options.carWidthPercentage) * laneWidth;
      laneX += random(options.carShiftX) * laneWidth;
      const offsetY = random(options.carFloorSeparation) + radius * 1.3;
      const offsetZ = -random(options.length);

      aOffset.push(laneX - carWidth / 2, offsetY, offsetZ);
      aOffset.push(laneX + carWidth / 2, offsetY, offsetZ);
      aMetrics.push(radius, length, spd);
      aMetrics.push(radius, length, spd);
      const color = pickRandom(colorArray);
      aColor.push(color.r, color.g, color.b);
      aColor.push(color.r, color.g, color.b);
    }

    instanced.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false));
    instanced.setAttribute("aMetrics", new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false));
    instanced.setAttribute("aColor", new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false));

    const material = new THREE.ShaderMaterial({
      fragmentShader: carLightsFragment,
      vertexShader: carLightsVertex,
      transparent: true,
      uniforms: Object.assign(
        {
          uTime: { value: 0 },
          uTravelLength: { value: options.length },
          uFade: { value: this.fade },
        },
        this.webgl.fogUniforms,
        (typeof options.distortion === "object" && options.distortion !== null ? options.distortion.uniforms : {}) || {},
      ),
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <getDistortion_vertex>",
        typeof options.distortion === "object" && options.distortion !== null ? options.distortion.getDistortion : "",
      );
    };

    const mesh = new THREE.Mesh(instanced, material);
    mesh.frustumCulled = false;
    this.webgl.scene.add(mesh);
    this.mesh = mesh;
  }

  update(time: number) {
    this.mesh.material.uniforms.uTime.value = time;
  }
}

class LightsSticks {
  webgl: App;
  options: RuntimeHyperspeedOptions;
  mesh!: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;

  constructor(webgl: App, options: RuntimeHyperspeedOptions) {
    this.webgl = webgl;
    this.options = options;
  }

  init() {
    const options = this.options;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const instanced = new THREE.InstancedBufferGeometry();
    Object.keys(geometry.attributes).forEach((key) => {
      instanced.setAttribute(key, geometry.attributes[key as keyof typeof geometry.attributes]);
    });
    if (geometry.index) instanced.setIndex(geometry.index);
    instanced.instanceCount = options.totalSideLightSticks;

    const stickoffset = options.length / (options.totalSideLightSticks - 1);
    const aOffset: number[] = [];
    const aColor: number[] = [];
    const aMetrics: number[] = [];
    const stickValues = Array.isArray(options.colors.sticks) ? options.colors.sticks : [options.colors.sticks];
    const colorArray = stickValues.map((c) => new THREE.Color(Number(c)));

    for (let i = 0; i < options.totalSideLightSticks; i += 1) {
      const width = random(options.lightStickWidth);
      const height = random(options.lightStickHeight);
      aOffset.push((i - 1) * stickoffset * 2 + stickoffset * Math.random());
      const color = pickRandom(colorArray);
      aColor.push(color.r, color.g, color.b);
      aMetrics.push(width, height);
    }

    instanced.setAttribute("aOffset", new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false));
    instanced.setAttribute("aColor", new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false));
    instanced.setAttribute("aMetrics", new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false));

    const material = new THREE.ShaderMaterial({
      fragmentShader: sideSticksFragment,
      vertexShader: sideSticksVertex,
      side: THREE.DoubleSide,
      uniforms: Object.assign(
        {
          uTravelLength: { value: options.length },
          uTime: { value: 0 },
        },
        this.webgl.fogUniforms,
        (typeof options.distortion === "object" && options.distortion !== null ? options.distortion.uniforms : {}) || {},
      ),
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <getDistortion_vertex>",
        typeof options.distortion === "object" && options.distortion !== null ? options.distortion.getDistortion : "",
      );
    };

    const mesh = new THREE.Mesh(instanced, material);
    mesh.frustumCulled = false;
    this.webgl.scene.add(mesh);
    this.mesh = mesh;
  }

  update(time: number) {
    this.mesh.material.uniforms.uTime.value = time;
  }
}

class Road {
  webgl: App;
  options: RuntimeHyperspeedOptions;
  uTime = { value: 0 };
  leftRoadWay!: THREE.Mesh;
  rightRoadWay!: THREE.Mesh;
  island!: THREE.Mesh;

  constructor(webgl: App, options: RuntimeHyperspeedOptions) {
    this.webgl = webgl;
    this.options = options;
  }

  createPlane(side: number, isRoad: boolean) {
    const options = this.options;
    const geometry = new THREE.PlaneGeometry(isRoad ? options.roadWidth : options.islandWidth, options.length, 20, 100);
    let uniforms: Record<string, { value: unknown }> = {
      uTravelLength: { value: options.length },
      uColor: { value: new THREE.Color(isRoad ? options.colors.roadColor : options.colors.islandColor) },
      uTime: this.uTime,
    };

    if (isRoad) {
      uniforms = Object.assign(uniforms, {
        uLanes: { value: options.lanesPerRoad },
        uBrokenLinesColor: { value: new THREE.Color(options.colors.brokenLines) },
        uShoulderLinesColor: { value: new THREE.Color(options.colors.shoulderLines) },
        uShoulderLinesWidthPercentage: { value: options.shoulderLinesWidthPercentage },
        uBrokenLinesLengthPercentage: { value: options.brokenLinesLengthPercentage },
        uBrokenLinesWidthPercentage: { value: options.brokenLinesWidthPercentage },
      });
    }

    const material = new THREE.ShaderMaterial({
      fragmentShader: isRoad ? roadFragment : islandFragment,
      vertexShader: roadVertex,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: Object.assign(
        uniforms,
        this.webgl.fogUniforms,
        (typeof options.distortion === "object" && options.distortion !== null ? options.distortion.uniforms : {}) || {},
      ),
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <getDistortion_vertex>",
        typeof options.distortion === "object" && options.distortion !== null ? options.distortion.getDistortion : "",
      );
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -options.length / 2;
    mesh.position.x += (options.islandWidth / 2 + options.roadWidth / 2) * side;
    this.webgl.scene.add(mesh);
    return mesh;
  }

  init() {
    this.leftRoadWay = this.createPlane(-1, true);
    this.rightRoadWay = this.createPlane(1, true);
    this.island = this.createPlane(0, false);
  }

  update(time: number) {
    this.uTime.value = time;
  }
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer, setSize: (width: number, height: number, updateStyle: boolean) => void) {
  const canvas = renderer.domElement;
  const container = canvas.parentElement;
  if (!container) return false;
  const width = container.clientWidth;
  const height = container.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) setSize(width, height, false);
  return needResize;
}

class App {
  container: HTMLDivElement;
  options: RuntimeHyperspeedOptions;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  clock: THREE.Clock;
  road: Road;
  leftCarLights: CarLights;
  rightCarLights: CarLights;
  leftSticks: LightsSticks;
  fogUniforms: Record<string, { value: unknown }>;
  fovTarget: number;
  speedUpTarget: number;
  speedUp = 0;
  timeOffset = 0;
  disposed = false;
  resizeObserver?: ResizeObserver;
  requestId = 0;
  stageBackground = 0x1e1919;

  constructor(container: HTMLDivElement, options: RuntimeHyperspeedOptions) {
    this.options = { ...options };
    if (!this.options.distortion) {
      this.options.distortion = { uniforms: distortion_uniforms, getDistortion: distortion_vertex };
    } else if (typeof this.options.distortion === "string") {
      this.options.distortion = distortions[this.options.distortion] ?? distortions.turbulentDistortion;
    }

    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight, false);
    this.renderer.setClearColor(this.stageBackground, 1);
    this.renderer.domElement.className = "hyperspeed-canvas";
    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.camera = new THREE.PerspectiveCamera(this.options.fov, container.clientWidth / container.clientHeight, 0.1, 10000);
    this.camera.position.set(0, 8, -5);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.stageBackground);
    const fog = new THREE.Fog(this.stageBackground, this.options.length * 0.2, this.options.length * 500);
    this.scene.fog = fog;
    this.fogUniforms = {
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far },
    };

    this.clock = new THREE.Clock();
    this.road = new Road(this, this.options);
    this.leftCarLights = new CarLights(this, this.options, this.options.colors.leftCars, this.options.movingAwaySpeed, new THREE.Vector2(0, 1 - this.options.carLightsFade));
    this.rightCarLights = new CarLights(this, this.options, this.options.colors.rightCars, this.options.movingCloserSpeed, new THREE.Vector2(1, 0 + this.options.carLightsFade));
    this.leftSticks = new LightsSticks(this, this.options);

    this.fovTarget = this.options.fov;
    this.speedUpTarget = 0;
    this.bindEvents();
  }

  bindEvents() {
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.tick = this.tick.bind(this);
    this.container.addEventListener("pointerdown", this.onPointerDown);
    this.container.addEventListener("pointerup", this.onPointerUp);
    this.container.addEventListener("pointerleave", this.onPointerUp);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }
  }

  onPointerDown(ev: PointerEvent) {
    this.options.onSpeedUp?.(ev as unknown as MouseEvent);
    this.fovTarget = this.options.fovSpeedUp;
    this.speedUpTarget = this.options.speedUp;
  }

  onPointerUp(ev: PointerEvent) {
    this.options.onSlowDown?.(ev as unknown as MouseEvent);
    this.fovTarget = this.options.fov;
    this.speedUpTarget = 0;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  initPasses() {
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new EffectPass(
      this.camera,
      new BloomEffect({
        luminanceThreshold: 0.2,
        luminanceSmoothing: 0,
        resolutionScale: 1,
      }),
    );
    const smaaPass = new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.MEDIUM }));
    renderPass.renderToScreen = false;
    bloomPass.renderToScreen = false;
    smaaPass.renderToScreen = true;
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);
    this.composer.addPass(smaaPass);
  }

  init() {
    this.initPasses();
    this.road.init();
    this.leftCarLights.init();
    this.leftCarLights.mesh.position.setX(-this.options.roadWidth / 2 - this.options.islandWidth / 2);
    this.rightCarLights.init();
    this.rightCarLights.mesh.position.setX(this.options.roadWidth / 2 + this.options.islandWidth / 2);
    this.leftSticks.init();
    this.leftSticks.mesh.position.setX(-(this.options.roadWidth + this.options.islandWidth / 2));
    this.tick();
  }

  tick() {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (resizeRendererToDisplaySize(this.renderer, this.composer.setSize.bind(this.composer))) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    const delta = this.clock.getDelta();
    const lerpPct = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);
    this.speedUp += lerp(this.speedUp, this.speedUpTarget, lerpPct, 0.00001);
    this.timeOffset += this.speedUp * delta;
    const time = this.clock.elapsedTime + this.timeOffset;

    this.leftCarLights.update(time);
    this.rightCarLights.update(time);
    this.leftSticks.update(time);
    this.road.update(time);

    const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPct);
    if (fovChange !== 0) {
      this.camera.fov += fovChange * delta * 6;
      this.camera.updateProjectionMatrix();
    }

    if (typeof this.options.distortion === "object" && this.options.distortion?.getJS) {
      const d = this.options.distortion.getJS(0.025, time);
      this.camera.lookAt(new THREE.Vector3(this.camera.position.x + d.x, this.camera.position.y + d.y, this.camera.position.z + d.z));
    }

    this.composer.render(delta);
    this.requestId = requestAnimationFrame(this.tick);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.requestId);
    this.resizeObserver?.disconnect();
    this.container.removeEventListener("pointerdown", this.onPointerDown);
    this.container.removeEventListener("pointerup", this.onPointerUp);
    this.container.removeEventListener("pointerleave", this.onPointerUp);
    this.scene.clear();
    this.composer.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export const HyperspeedBackground = forwardRef<HyperspeedBackgroundHandle, HyperspeedBackgroundProps>(
  function HyperspeedBackground({ effectOptions }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<App | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        stop() {
          if (appRef.current) {
            appRef.current.dispose();
            appRef.current = null;
          }
        },
      }),
      [],
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const basePreset =
        (hyperspeedPresets as Record<string, unknown>).one ??
        (hyperspeedPresets as Record<string, unknown>).panelRoadNeon ??
        Object.values(hyperspeedPresets)[0];
      if (!basePreset) return;
      const mergedOptions = normalizeOptions(basePreset, effectOptions);
      appRef.current?.dispose();
      const app = new App(container, mergedOptions);
      appRef.current = app;
      app.init();
      return () => {
        app.dispose();
        appRef.current = null;
      };
    }, [effectOptions]);

    return <div ref={containerRef} className="hyperspeed-container" aria-hidden="true" />;
  },
);

