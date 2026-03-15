"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface CrosshairProps {
  color?: string;
  containerRef?: HTMLElement | null;
}

const lerp = (a: number, b: number, n: number): number => (1 - n) * a + n * b;

export function Crosshair({ color = "white", containerRef = null }: CrosshairProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const lineHorizontalRef = useRef<HTMLDivElement>(null);
  const lineVerticalRef = useRef<HTMLDivElement>(null);
  const filterXRef = useRef<SVGFETurbulenceElement>(null);
  const filterYRef = useRef<SVGFETurbulenceElement>(null);

  /** 原始鼠标坐标，mousemove 只写入，不触发布局读取 */
  const rawMouseRef = useRef({ x: 0, y: 0 });
  /** 计算后的相对坐标，在 rAF 中更新 */
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationIdRef = useRef<number | null>(null);
  /** 边界内/外状态，避免重复 gsap.to */
  const wasInsideRef = useRef<boolean | null>(null);

  useEffect(() => {
    const container = containerRef;
    const target: EventTarget = container ?? window;
    const lineHorizontal = lineHorizontalRef.current;
    const lineVertical = lineVerticalRef.current;

    // mousemove: 仅存储原始坐标，不调用 getBoundingClientRect
    const handleMouseMove = (ev: Event) => {
      const e = ev as MouseEvent;
      rawMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const renderedStyles: Record<string, { previous: number; current: number; amt: number }> = {
      tx: { previous: 0, current: 0, amt: 0.4 },
      ty: { previous: 0, current: 0, amt: 0.4 },
    };

    gsap.set([lineHorizontal, lineVertical], { opacity: 0 });

    const onMouseMove = () => {
      const raw = rawMouseRef.current;
      let x = raw.x;
      let y = raw.y;
      if (container) {
        const bounds = container.getBoundingClientRect();
        x = raw.x - bounds.left;
        y = raw.y - bounds.top;
        const isInside =
          raw.x >= bounds.left &&
          raw.x <= bounds.right &&
          raw.y >= bounds.top &&
          raw.y <= bounds.bottom;
        wasInsideRef.current = isInside;
        const opacity = isInside ? 1 : 0;
        if (lineHorizontal) lineHorizontal.style.opacity = String(opacity);
        if (lineVertical) lineVertical.style.opacity = String(opacity);
      }
      renderedStyles.tx.previous = renderedStyles.tx.current = x;
      renderedStyles.ty.previous = renderedStyles.ty.current = y;
      mouseRef.current = { x, y };

      if (animationIdRef.current === null) {
        const render = () => {
          const raw = rawMouseRef.current;
          let x = raw.x;
          let y = raw.y;

          // 每帧只读一次布局，在 rAF 中批量处理
          if (container) {
            const bounds = container.getBoundingClientRect();
            x = raw.x - bounds.left;
            y = raw.y - bounds.top;

            // 边界检测：仅状态变化时更新 opacity，避免重复 gsap.to
            const isInside =
              raw.x >= bounds.left &&
              raw.x <= bounds.right &&
              raw.y >= bounds.top &&
              raw.y <= bounds.bottom;
            if (wasInsideRef.current !== isInside) {
              wasInsideRef.current = isInside;
              const opacity = isInside ? 1 : 0;
              if (lineHorizontalRef.current) lineHorizontalRef.current.style.opacity = String(opacity);
              if (lineVerticalRef.current) lineVerticalRef.current.style.opacity = String(opacity);
            }
          }

          mouseRef.current = { x, y };
          renderedStyles.tx.current = x;
          renderedStyles.ty.current = y;

          for (const key in renderedStyles) {
            const r = renderedStyles[key];
            r.previous = lerp(r.previous, r.current, r.amt);
          }

          // 原生 transform 替代 gsap.set，GPU 加速
          const lineH = lineHorizontalRef.current;
          const lineV = lineVerticalRef.current;
          if (lineV && lineH) {
            const tx = renderedStyles.tx.previous;
            const ty = renderedStyles.ty.previous;
            lineV.style.transform = `translate3d(${0.5 + tx}px, 0, 0)`;
            lineH.style.transform = `translate3d(0, ${0.5 + ty}px, 0)`;
          }

          animationIdRef.current = requestAnimationFrame(render);
        };
        animationIdRef.current = requestAnimationFrame(render);
      }

      target.removeEventListener("mousemove", onMouseMove);
    };

    target.addEventListener("mousemove", handleMouseMove);
    target.addEventListener("mousemove", onMouseMove);

    const primitiveValues = { turbulence: 0 };
    const tl = gsap
      .timeline({
        paused: true,
        onStart: () => {
          if (lineHorizontalRef.current && lineVerticalRef.current) {
            lineHorizontalRef.current.style.filter = "url(#filter-noise-x)";
            lineVerticalRef.current.style.filter = "url(#filter-noise-y)";
          }
        },
        onUpdate: () => {
          if (filterXRef.current && filterYRef.current) {
            filterXRef.current.setAttribute("baseFrequency", String(primitiveValues.turbulence));
            filterYRef.current.setAttribute("baseFrequency", String(primitiveValues.turbulence));
          }
        },
        onComplete: () => {
          if (lineHorizontalRef.current && lineVerticalRef.current) {
            lineHorizontalRef.current.style.filter = "none";
            lineVerticalRef.current.style.filter = "none";
          }
        },
      })
      .to(primitiveValues, {
        duration: 0.5,
        ease: "power1",
        startAt: { turbulence: 1 },
        turbulence: 0,
      });

    const enter = () => tl.restart();
    const leave = () => tl.progress(1);

    const links = container
      ? container.querySelectorAll("a")
      : document.querySelectorAll("a");

    links.forEach((link: HTMLAnchorElement) => {
      link.addEventListener("mouseenter", enter);
      link.addEventListener("mouseleave", leave);
    });

    return () => {
      target.removeEventListener("mousemove", handleMouseMove);
      target.removeEventListener("mousemove", onMouseMove);
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      links.forEach((link: HTMLAnchorElement) => {
        link.removeEventListener("mouseenter", enter);
        link.removeEventListener("mouseleave", leave);
      });
    };
  }, [containerRef]);

  return (
    <div
      ref={cursorRef}
      style={{
        position: containerRef ? "absolute" : "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10000,
      }}
    >
      <svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
        aria-hidden
      >
        <defs>
          <filter id="filter-noise-x">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.000001"
              numOctaves={1}
              ref={filterXRef}
            />
            <feDisplacementMap in="SourceGraphic" scale="40" />
          </filter>
          <filter id="filter-noise-y">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.000001"
              numOctaves={1}
              ref={filterYRef}
            />
            <feDisplacementMap in="SourceGraphic" scale="40" />
          </filter>
        </defs>
      </svg>
      <div
        ref={lineHorizontalRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "1px",
          background: color,
          pointerEvents: "none",
          opacity: 0,
        }}
      />
      <div
        ref={lineVerticalRef}
        style={{
          position: "absolute",
          height: "100%",
          width: "1px",
          background: color,
          pointerEvents: "none",
          opacity: 0,
        }}
      />
    </div>
  );
}
