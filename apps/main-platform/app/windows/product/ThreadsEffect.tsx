"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";

interface ThreadsEffectProps {
  /** 单色模式（与 gradientColors 二选一） */
  color?: [number, number, number];
  /** 三色渐变 [上, 中, 下]，对应 uv.y 高→低，如 [C9BEFF, 8494FF, 6367FF] */
  gradientColors?: [[number, number, number], [number, number, number], [number, number, number]];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
  /** 线束垂直下移量（0~1），用于补偿 canvas 在底部 65% 时坐标系从顶部算起；越大线束越靠下 */
  verticalOffset?: number;
  /**
   * 渲染模式：
   * - "active"：全速 60fps，完整振幅
   * - "idle"  ：每 3 帧渲染 1 帧，振幅平滑衰减至 20%（软退出过渡期）
   * - "off"   ：振幅归零后停止 rAF，画布保留最后一帧
   */
  mode?: "active" | "idle" | "off";
}

const defaultColor: [number, number, number] = [1, 1, 1];

let globalTimeSeconds = 0;
let globalClockRafId: number | null = null;
let globalClockUsers = 0;

const tickGlobalClock = (timestamp: number) => {
  globalTimeSeconds = timestamp * 0.001;
  globalClockRafId = requestAnimationFrame(tickGlobalClock);
};

const retainGlobalClock = () => {
  globalClockUsers += 1;
  if (globalClockRafId === null && typeof window !== "undefined") {
    globalClockRafId = requestAnimationFrame(tickGlobalClock);
  }
};

const releaseGlobalClock = () => {
  globalClockUsers = Math.max(0, globalClockUsers - 1);
  if (globalClockUsers === 0 && globalClockRafId !== null) {
    cancelAnimationFrame(globalClockRafId);
    globalClockRafId = null;
  }
};

const getGlobalTimeSeconds = () => {
  if (typeof performance === "undefined") return globalTimeSeconds;
  return Math.max(globalTimeSeconds, performance.now() * 0.001);
};

/** Panel 3 主色调渐变：C9BEFF → 8494FF → 6367FF（上→下，0-1） */
export const THREADS_GRADIENT: [[number, number, number], [number, number, number], [number, number, number]] = [
  [201 / 255, 190 / 255, 255 / 255], // #C9BEFF 上
  [132 / 255, 148 / 255, 255 / 255], // #8494FF 中
  [99 / 255, 103 / 255, 255 / 255],  // #6367FF 下
];

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform vec3 uColorTop;
uniform vec3 uColorMid;
uniform vec3 uColorBot;
uniform float uUseGradient;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;
uniform float uVerticalOffset;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 16.0;
const float u_line_blur = 14.0;

float Perlin2D(vec2 P) {
    vec2 Pi = floor(P);
    vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
    vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
    Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
    Pt += vec2(26.0, 161.0).xyxy;
    Pt *= Pt;
    Pt = Pt.xzxz * Pt.yyww;
    vec4 hash_x = fract(Pt * (1.0 / 951.135664));
    vec4 hash_y = fract(Pt * (1.0 / 642.949883));
    vec4 grad_x = hash_x - 0.49999;
    vec4 grad_y = hash_y - 0.49999;
    vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
        * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
    grad_results *= 1.4142135623730950;
    vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
               * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
    vec4 blend2 = vec4(blend, vec2(1.0 - blend));
    return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
    return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
    float split_offset = (perc * 0.4);
    float split_point = 0.1 + split_offset;

    float amplitude_normal = smoothstep(split_point, 0.7, st.x);
    float amplitude_strength = 0.5;
    float finalAmplitude = amplitude_normal * amplitude_strength
                           * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

    float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
    float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

    float xnoise = mix(
        Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
        Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
        st.x * 0.3
    );

    float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

    float line_start = smoothstep(
        y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        y,
        st.y
    );

    float line_end = smoothstep(
        y,
        y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        st.y
    );

    return clamp(
        (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
        0.0,
        1.0
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv.y = min(1.0, uv.y + uVerticalOffset);

    float line_strength = 1.0;
    for (int i = 0; i < u_line_count; i++) {
        float p = float(i) / float(u_line_count);
        line_strength *= (1.0 - lineFn(
            uv,
            u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
            p,
            (PI * 1.0) * p,
            uMouse,
            iTime,
            uAmplitude,
            uDistance
        ));
    }

    float colorVal = 1.0 - line_strength;
    float t = uv.y;
    vec3 midLow = mix(uColorBot, uColorMid, smoothstep(0.0, 0.5, t));
    vec3 gradientColor = mix(midLow, uColorTop, smoothstep(0.5, 1.0, t));
    vec3 finalColor = mix(uColor, gradientColor, uUseGradient);
    fragColor = vec4(finalColor * colorVal, colorVal);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export function ThreadsEffect({
  color = defaultColor,
  gradientColors,
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
  verticalOffset = 0.22,
  mode = "active",
}: ThreadsEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<Program | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const currentMouseRef = useRef<[number, number]>([0.5, 0.5]);
  const targetMouseRef = useRef<[number, number]>([0.5, 0.5]);

  // mode 相关 refs：不进入 WebGL useEffect 的依赖，避免重建 GL 上下文
  const modeRef = useRef(mode);
  // 按最新 props 驱动 rAF 内插值，不触发 GL 重建
  const amplitudeRef = useRef(amplitude);
  // 实际使用的振幅，在 rAF 循环内平滑插值
  const effectiveAmplitudeRef = useRef(mode === "off" ? 0 : amplitude);
  // 用于帧率节流
  const frameCountRef = useRef(0);
  // 暴露给外部 useEffect 用来重启已停止的 rAF
  const restartRafRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanup = () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      const canvas = container.querySelector("canvas");
      if (canvas) container.removeChild(canvas);
      const gl = glRef.current;
      if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
      rendererRef.current = null;
      glRef.current = null;
      programRef.current = null;
      meshRef.current = null;
      currentMouseRef.current = [0.5, 0.5];
      targetMouseRef.current = [0.5, 0.5];
      releaseGlobalClock();
    };

    const onResize = () => {
      const renderer = rendererRef.current;
      const program = programRef.current;
      if (!container || !renderer || !program) return;
      const displayW = container.clientWidth;
      const displayH = container.clientHeight;
      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
      const bufferW = Math.round(displayW * dpr);
      const bufferH = Math.round(displayH * dpr);
      renderer.setSize(bufferW, bufferH);
      program.uniforms.iResolution.value.r = bufferW;
      program.uniforms.iResolution.value.g = bufferH;
      program.uniforms.iResolution.value.b = bufferW / bufferH;
      const canvas = renderer.gl.canvas as HTMLCanvasElement;
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouseRef.current = [x, y];
    };

    const handleMouseLeave = () => {
      targetMouseRef.current = [0.5, 0.5];
    };

    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    rendererRef.current = renderer;
    glRef.current = gl;
    retainGlobalClock();

    const geometry = new Triangle(gl);
    const [top, mid, bot] = gradientColors ?? [color, color, color];
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uColor: { value: new Color(...color) },
        uColorTop: { value: new Color(...top) },
        uColorMid: { value: new Color(...mid) },
        uColorBot: { value: new Color(...bot) },
        uUseGradient: { value: gradientColors ? 1 : 0 },
        uAmplitude: { value: amplitude },
        uDistance: { value: distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uVerticalOffset: { value: verticalOffset },
      },
    });
    programRef.current = program;

    const mesh = new Mesh(gl, { geometry, program });
    meshRef.current = mesh;

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    window.addEventListener("resize", onResize);
    if (enableMouseInteraction) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    onResize();

    const update = (t: number) => {
      const program = programRef.current;
      const renderer = rendererRef.current;
      const mesh = meshRef.current;
      if (!program || !renderer || !mesh) return;

      const currentMode = modeRef.current;

      // 帧节流：active=每帧, idle=每3帧, off=每6帧（让振幅有时间归零）
      frameCountRef.current++;
      const frameInterval = currentMode === "active" ? 1 : currentMode === "idle" ? 3 : 6;
      if (frameCountRef.current % frameInterval !== 0) {
        animationIdRef.current = requestAnimationFrame(update);
        return;
      }

      // 振幅平滑插值：active→prop值, idle→20%, off→0
      const targetAmp =
        currentMode === "active" ? amplitudeRef.current :
        currentMode === "idle"   ? amplitudeRef.current * 0.2 :
        0;
      const lerpSpeed = currentMode === "active" ? 0.1 : 0.04;
      effectiveAmplitudeRef.current +=
        (targetAmp - effectiveAmplitudeRef.current) * lerpSpeed;

      if (enableMouseInteraction) {
        const smoothing = 0.05;
        const current = currentMouseRef.current;
        const target = targetMouseRef.current;
        current[0] += smoothing * (target[0] - current[0]);
        current[1] += smoothing * (target[1] - current[1]);
        (program.uniforms.uMouse as { value: Float32Array }).value[0] = current[0];
        (program.uniforms.uMouse as { value: Float32Array }).value[1] = current[1];
      } else {
        (program.uniforms.uMouse as { value: Float32Array }).value[0] = 0.5;
        (program.uniforms.uMouse as { value: Float32Array }).value[1] = 0.5;
      }

      program.uniforms.iTime.value = getGlobalTimeSeconds();
      program.uniforms.uAmplitude.value = effectiveAmplitudeRef.current;
      renderer.render({ scene: mesh });

      // off 模式下振幅归零后停止 rAF，画布保留最后一帧
      if (currentMode === "off" && effectiveAmplitudeRef.current < 0.005) {
        animationIdRef.current = null;
        return;
      }

      animationIdRef.current = requestAnimationFrame(update);
    };

    // 暴露重启方法，供 mode 切换时使用
    restartRafRef.current = () => {
      if (!animationIdRef.current) {
        frameCountRef.current = 0;
        animationIdRef.current = requestAnimationFrame(update);
      }
    };

    // 初始 mode 为 off 时先不启动 rAF，等 mode 变为 active/idle 再启动
    if (modeRef.current !== "off") {
      animationIdRef.current = requestAnimationFrame(update);
    }

    return cleanup;
  }, [enableMouseInteraction]);

  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    program.uniforms.uDistance.value = distance;
  }, [distance]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    program.uniforms.uVerticalOffset.value = verticalOffset;
  }, [verticalOffset]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    program.uniforms.uColor.value = new Color(...color);
  }, [color]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    const [top, mid, bot] = gradientColors ?? [color, color, color];
    program.uniforms.uColorTop.value = new Color(...top);
    program.uniforms.uColorMid.value = new Color(...mid);
    program.uniforms.uColorBot.value = new Color(...bot);
    program.uniforms.uUseGradient.value = gradientColors ? 1 : 0;
  }, [gradientColors, color]);

  // 单独监听 mode 变化：更新 ref，并在需要时重启已停止的 rAF
  // 故意不加入上面的 WebGL useEffect 依赖，避免重建 GL 上下文
  useEffect(() => {
    modeRef.current = mode;
    if (mode !== "off") {
      restartRafRef.current?.();
    }
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className="threads-effect-container"
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
