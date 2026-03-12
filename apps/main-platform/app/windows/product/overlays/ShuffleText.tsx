"use client";

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

type ShuffleDirection = "left" | "right" | "up" | "down";
type AnimationMode = "random" | "evenodd";
type ShuffleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
type TextAlign = "left" | "center" | "right" | "justify";

interface ShuffleTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  shuffleDirection?: ShuffleDirection;
  duration?: number;
  maxDelay?: number;
  ease?: string | ((t: number) => number);
  tag?: ShuffleTag;
  textAlign?: TextAlign;
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: AnimationMode;
  loop?: boolean;
  loopDelay?: number;
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  triggerOnHover?: boolean;
  active?: boolean;
  /** 自动重播间隔（ms），设置后在 active=true 期间每隔指定时间自动重播一次 */
  autoReplayMs?: number;
}

type SplitTextInstance = {
  chars?: Element[];
  revert: () => void;
};

// 去掉了 uppercase（中文无意义），保留其余布局类
const baseClasses = "inline-block whitespace-normal break-words will-change-transform text-6xl leading-none";

export function ShuffleText({
  text,
  className = "",
  style,
  shuffleDirection = "right",
  duration = 0.35,
  maxDelay = 0,
  ease = "power3.out",
  tag = "p",
  textAlign = "center",
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = "evenodd",
  loop = false,
  loopDelay = 0,
  stagger = 0.03,
  scrambleCharset = "",
  colorFrom,
  colorTo,
  triggerOnce = false,
  respectReducedMotion = true,
  triggerOnHover = false,
  active = true,
  autoReplayMs,
}: ShuffleTextProps) {
  const textRef = useRef<HTMLElement>(null);
  const splitRef = useRef<SplitTextInstance | null>(null);
  const wrappersRef = useRef<HTMLElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const hoverHandlerRef = useRef<((e: Event) => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playingRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  const userHasFont = useMemo(() => /font[-[]/i.test(className || ""), [className]);
  const computedClassName = useMemo(
    () => `${baseClasses} ${ready ? "visible" : "invisible"} ${className}`.trim(),
    [className, ready],
  );
  const computedStyle = useMemo<CSSProperties>(() => {
    // 只在用户未指定字体类时提供中性 fallback（不再强制像素字体）
    const fallback = userHasFont ? {} : { fontFamily: "system-ui, sans-serif" };
    return { textAlign, ...fallback, ...style };
  }, [style, textAlign, userHasFont]);

  // ── 清理 hover 监听 ────────────────────────────────────────────────────────
  const removeHover = useCallback(() => {
    const handler = hoverHandlerRef.current;
    if (handler && textRef.current) {
      textRef.current.removeEventListener("mouseenter", handler);
    }
    hoverHandlerRef.current = null;
  }, []);

  // ── 清理定时器 ─────────────────────────────────────────────────────────────
  const clearAutoInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── DOM 还原 + timeline 销毁 ───────────────────────────────────────────────
  const teardown = useCallback(() => {
    if (tlRef.current) {
      tlRef.current.kill();
      tlRef.current = null;
    }
    if (wrappersRef.current.length > 0) {
      wrappersRef.current.forEach((wrap) => {
        const inner = wrap.firstElementChild as HTMLElement | null;
        const orig = inner?.querySelector("[data-orig='1']") as HTMLElement | null;
        if (orig && wrap.parentNode) wrap.parentNode.replaceChild(orig, wrap);
      });
      wrappersRef.current = [];
    }
    try {
      splitRef.current?.revert();
    } catch {
      // noop
    }
    splitRef.current = null;
    playingRef.current = false;
  }, []);

  const randomizeScrambles = useCallback(() => {
    if (!scrambleCharset) return;
    wrappersRef.current.forEach((wrap) => {
      const strip = wrap.firstElementChild as HTMLElement | null;
      if (!strip) return;
      const kids = Array.from(strip.children) as HTMLElement[];
      for (let i = 1; i < kids.length - 1; i += 1) {
        kids[i].textContent = scrambleCharset.charAt(Math.floor(Math.random() * scrambleCharset.length));
      }
    });
  }, [scrambleCharset]);

  const cleanupToStill = useCallback(() => {
    wrappersRef.current.forEach((wrap) => {
      const strip = wrap.firstElementChild as HTMLElement | null;
      if (!strip) return;
      const real = strip.querySelector("[data-orig='1']") as HTMLElement | null;
      if (!real) return;
      strip.replaceChildren(real);
      strip.style.transform = "none";
      strip.style.willChange = "auto";
    });
  }, []);

  // ── 拆字 + 包裹构建（完全按原模板逻辑）──────────────────────────────────────
  const build = useCallback(() => {
    if (!textRef.current) return;
    teardown();

    const el = textRef.current;
    const computedFont = getComputedStyle(el).fontFamily;

    let split: SplitTextInstance;
    try {
      split = new SplitText(el, {
        type: "chars",
        charsClass: "shuffle-char",
        wordsClass: "shuffle-word",
        linesClass: "shuffle-line",
        reduceWhiteSpace: false,
      }) as unknown as SplitTextInstance;
    } catch {
      setReady(true);
      onShuffleComplete?.();
      return;
    }

    splitRef.current = split;
    const chars = (splitRef.current.chars || []) as HTMLElement[];
    wrappersRef.current = [];

    const rolls = Math.max(1, Math.floor(shuffleTimes));
    const rand = (set: string) => set.charAt(Math.floor(Math.random() * set.length)) || "";

    chars.forEach((ch) => {
      const parent = ch.parentElement;
      if (!parent) return;

      const w = ch.getBoundingClientRect().width;
      const h = ch.getBoundingClientRect().height;
      if (!w) return;

      const wrap = document.createElement("span");
      wrap.className = "inline-block overflow-hidden text-left";
      Object.assign(wrap.style, {
        width: `${w}px`,
        height: shuffleDirection === "up" || shuffleDirection === "down" ? `${h}px` : "auto",
        verticalAlign: "bottom",
      });

      const inner = document.createElement("span");
      inner.className =
        "inline-block will-change-transform origin-left transform-gpu " +
        (shuffleDirection === "up" || shuffleDirection === "down" ? "whitespace-normal" : "whitespace-nowrap");

      parent.insertBefore(wrap, ch);
      wrap.appendChild(inner);

      const firstOrig = ch.cloneNode(true) as HTMLElement;
      firstOrig.className =
        "text-left " + (shuffleDirection === "up" || shuffleDirection === "down" ? "block" : "inline-block");
      Object.assign(firstOrig.style, { width: `${w}px`, fontFamily: computedFont });

      ch.setAttribute("data-orig", "1");
      ch.className =
        "text-left " + (shuffleDirection === "up" || shuffleDirection === "down" ? "block" : "inline-block");
      Object.assign(ch.style, { width: `${w}px`, fontFamily: computedFont });

      inner.appendChild(firstOrig);
      for (let k = 0; k < rolls; k += 1) {
        const c = ch.cloneNode(true) as HTMLElement;
        if (scrambleCharset) c.textContent = rand(scrambleCharset);
        c.className =
          "text-left " + (shuffleDirection === "up" || shuffleDirection === "down" ? "block" : "inline-block");
        Object.assign(c.style, { width: `${w}px`, fontFamily: computedFont });
        inner.appendChild(c);
      }
      inner.appendChild(ch);

      const steps = rolls + 1;
      if (shuffleDirection === "right" || shuffleDirection === "down") {
        const firstCopy = inner.firstElementChild as HTMLElement | null;
        const real = inner.lastElementChild as HTMLElement | null;
        if (real) inner.insertBefore(real, inner.firstChild);
        if (firstCopy) inner.appendChild(firstCopy);
      }

      let startX = 0, finalX = 0, startY = 0, finalY = 0;
      if (shuffleDirection === "right") { startX = -steps * w; finalX = 0; }
      else if (shuffleDirection === "left") { startX = 0; finalX = -steps * w; }
      else if (shuffleDirection === "down") { startY = -steps * h; finalY = 0; }
      else if (shuffleDirection === "up") { startY = 0; finalY = -steps * h; }

      if (shuffleDirection === "left" || shuffleDirection === "right") {
        gsap.set(inner, { x: startX, y: 0, force3D: true });
        inner.setAttribute("data-start-x", String(startX));
        inner.setAttribute("data-final-x", String(finalX));
      } else {
        gsap.set(inner, { x: 0, y: startY, force3D: true });
        inner.setAttribute("data-start-y", String(startY));
        inner.setAttribute("data-final-y", String(finalY));
      }

      if (colorFrom) inner.style.color = colorFrom;
      wrappersRef.current.push(wrap);
    });
  }, [colorFrom, onShuffleComplete, scrambleCharset, shuffleDirection, shuffleTimes, teardown]);

  const getInners = useCallback(
    () => wrappersRef.current.map((w) => w.firstElementChild as HTMLElement),
    [],
  );

  // ── 播放时间轴（完全按原模板逻辑）────────────────────────────────────────────
  const play = useCallback(() => {
    const strips = getInners();
    if (!strips.length) return;

    playingRef.current = true;
    const isVertical = shuffleDirection === "up" || shuffleDirection === "down";

    const tl = gsap.timeline({
      smoothChildTiming: true,
      repeat: loop ? -1 : 0,
      repeatDelay: loop ? loopDelay : 0,
      onRepeat: () => {
        if (scrambleCharset) randomizeScrambles();
        if (isVertical) {
          gsap.set(strips, { y: (_i, t: HTMLElement) => Number.parseFloat(t.getAttribute("data-start-y") || "0") });
        } else {
          gsap.set(strips, { x: (_i, t: HTMLElement) => Number.parseFloat(t.getAttribute("data-start-x") || "0") });
        }
        onShuffleComplete?.();
      },
      onComplete: () => {
        playingRef.current = false;
        if (!loop) {
          cleanupToStill();
          if (colorTo) gsap.set(strips, { color: colorTo });
          onShuffleComplete?.();
        }
      },
    });

    const addTween = (targets: HTMLElement[], at: number) => {
      const vars: gsap.TweenVars = {
        duration,
        ease,
        force3D: true,
        stagger: animationMode === "evenodd" ? stagger : 0,
      };
      if (isVertical) {
        vars.y = (_i: number, t: HTMLElement) => Number.parseFloat(t.getAttribute("data-final-y") || "0");
      } else {
        vars.x = (_i: number, t: HTMLElement) => Number.parseFloat(t.getAttribute("data-final-x") || "0");
      }
      tl.to(targets, vars, at);
      if (colorFrom && colorTo) tl.to(targets, { color: colorTo, duration, ease }, at);
    };

    if (animationMode === "evenodd") {
      const odd = strips.filter((_, i) => i % 2 === 1);
      const even = strips.filter((_, i) => i % 2 === 0);
      const oddTotal = duration + Math.max(0, odd.length - 1) * stagger;
      const evenStart = odd.length ? oddTotal * 0.7 : 0;
      if (odd.length) addTween(odd, 0);
      if (even.length) addTween(even, evenStart);
    } else {
      strips.forEach((strip) => {
        const d = Math.random() * maxDelay;
        const vars: gsap.TweenVars = { duration, ease, force3D: true };
        if (isVertical) {
          vars.y = Number.parseFloat(strip.getAttribute("data-final-y") || "0");
        } else {
          vars.x = Number.parseFloat(strip.getAttribute("data-final-x") || "0");
        }
        tl.to(strip, vars, d);
        if (colorFrom && colorTo) tl.fromTo(strip, { color: colorFrom }, { color: colorTo, duration, ease }, d);
      });
    }

    tlRef.current = tl;
    hasPlayedRef.current = true;
  }, [
    animationMode, cleanupToStill, colorFrom, colorTo, duration, ease,
    getInners, loop, loopDelay, maxDelay, onShuffleComplete,
    randomizeScrambles, scrambleCharset, shuffleDirection, stagger,
  ]);

  // ── hover 绑定（triggerOnHover=true 时启用）────────────────────────────────
  const armHover = useCallback(() => {
    if (!triggerOnHover || !textRef.current) return;
    removeHover();
    const handler = () => {
      if (playingRef.current) return;
      build();
      if (scrambleCharset) randomizeScrambles();
      play();
    };
    hoverHandlerRef.current = handler;
    textRef.current.addEventListener("mouseenter", handler);
  }, [build, play, randomizeScrambles, removeHover, scrambleCharset, triggerOnHover]);

  // ── 首次创建（build + play + armHover）────────────────────────────────────
  const create = useCallback(() => {
    build();
    if (scrambleCharset) randomizeScrambles();
    play();
    armHover();
    setReady(true);
  }, [armHover, build, play, randomizeScrambles, scrambleCharset]);

  // ── 完整清理（timeline + hover + interval + DOM + ready）────────────────────
  const cleanup = useCallback(() => {
    clearAutoInterval();
    removeHover();
    teardown();
    setReady(false);
  }, [clearAutoInterval, removeHover, teardown]);

  // ── 字体加载守卫 ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const checkFonts = async () => {
      if (typeof document === "undefined") return;
      if ("fonts" in document) {
        if (document.fonts.status !== "loaded") await document.fonts.ready;
      }
      if (mounted) setFontsLoaded(true);
    };
    void checkFonts();
    return () => { mounted = false; };
  }, []);

  // ── 主触发 Effect：active 变化时直接创建/清理（不依赖 ScrollTrigger）──────────
  useEffect(() => {
    if (!active || !fontsLoaded || !text) {
      cleanup();
      return;
    }

    // prefers-reduced-motion 降级：直接显示静态文案
    if (
      respectReducedMotion &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setReady(true);
      onShuffleComplete?.();
      return;
    }

    // triggerOnce：已播放过则只恢复显示 + armHover，不重建
    if (triggerOnce && hasPlayedRef.current) {
      setReady(true);
      armHover();
      return;
    }

    create();
    return () => { cleanup(); };
  }, [active, fontsLoaded, text, respectReducedMotion, triggerOnce, create, cleanup, armHover, onShuffleComplete]);

  // ── 自动重播 Effect（autoReplayMs 独立管理，不与主触发 Effect 耦合）────────────
  useEffect(() => {
    if (!active || !autoReplayMs || !fontsLoaded) return;

    // 等动画首次完成后再启动定时器；通过 setTimeout 错开首次 create() 执行时机
    const startTimer = () => {
      clearAutoInterval();
      intervalRef.current = setInterval(() => {
        if (playingRef.current) return; // 播放中跳过本轮
        build();
        if (scrambleCharset) randomizeScrambles();
        play();
      }, autoReplayMs);
    };

    // 延迟一帧，确保 create() 已经完成
    const raf = requestAnimationFrame(startTimer);
    return () => {
      cancelAnimationFrame(raf);
      clearAutoInterval();
    };
  }, [active, autoReplayMs, fontsLoaded, build, play, randomizeScrambles, scrambleCharset, clearAutoInterval]);

  return createElement(tag, { ref: textRef, className: computedClassName, style: computedStyle }, text);
}
