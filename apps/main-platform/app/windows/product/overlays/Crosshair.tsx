"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface CrosshairProps {
  color?: string;
  containerRef?: HTMLElement | null;
}

const lerp = (a: number, b: number, n: number): number => (1 - n) * a + n * b;

const getMousePos = (e: MouseEvent, container: HTMLElement | null) => {
  if (container) {
    const bounds = container.getBoundingClientRect();
    return {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    };
  }
  return { x: e.clientX, y: e.clientY };
};

export function Crosshair({ color = "white", containerRef = null }: CrosshairProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const lineHorizontalRef = useRef<HTMLDivElement>(null);
  const lineVerticalRef = useRef<HTMLDivElement>(null);
  const filterXRef = useRef<SVGFETurbulenceElement>(null);
  const filterYRef = useRef<SVGFETurbulenceElement>(null);

  const mouseRef = useRef({ x: 0, y: 0 });
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef;
    // Cast to EventTarget so TypeScript accepts both HTMLElement and Window
    const target: EventTarget = container ?? window;
    const lineHorizontal = lineHorizontalRef.current;
    const lineVertical = lineVerticalRef.current;

    const handleMouseMove = (ev: Event) => {
      const mouseEvent = ev as MouseEvent;
      mouseRef.current = getMousePos(mouseEvent, container);

      if (container) {
        const bounds = container.getBoundingClientRect();
        if (
          mouseEvent.clientX < bounds.left ||
          mouseEvent.clientX > bounds.right ||
          mouseEvent.clientY < bounds.top ||
          mouseEvent.clientY > bounds.bottom
        ) {
          gsap.to([lineHorizontal, lineVertical], { opacity: 0 });
        } else {
          gsap.to([lineHorizontal, lineVertical], { opacity: 1 });
        }
      }
    };

    const renderedStyles: Record<string, { previous: number; current: number; amt: number }> = {
      tx: { previous: 0, current: 0, amt: 0.15 },
      ty: { previous: 0, current: 0, amt: 0.15 },
    };

    gsap.set([lineHorizontal, lineVertical], { opacity: 0 });

    const onMouseMove = () => {
      const mouse = mouseRef.current;
      renderedStyles.tx.previous = renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.previous = renderedStyles.ty.current = mouse.y;

      gsap.to([lineHorizontal, lineVertical], {
        duration: 0.9,
        ease: "Power3.easeOut",
        opacity: 1,
      });

      if (animationIdRef.current === null) {
        const render = () => {
          renderedStyles.tx.current = mouseRef.current.x;
          renderedStyles.ty.current = mouseRef.current.y;

          for (const key in renderedStyles) {
            const r = renderedStyles[key];
            r.previous = lerp(r.previous, r.current, r.amt);
          }

          if (lineHorizontalRef.current && lineVerticalRef.current) {
            gsap.set(lineVerticalRef.current, { x: renderedStyles.tx.previous });
            gsap.set(lineHorizontalRef.current, { y: renderedStyles.ty.previous });
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
    // Removed .kill() — killing the timeline prevents subsequent restart() calls from working
    const leave = () => tl.progress(1);

    const render = () => {
      renderedStyles.tx.current = mouseRef.current.x;
      renderedStyles.ty.current = mouseRef.current.y;

      for (const key in renderedStyles) {
        const r = renderedStyles[key];
        r.previous = lerp(r.previous, r.current, r.amt);
      }

      if (lineHorizontalRef.current && lineVerticalRef.current) {
        gsap.set(lineVerticalRef.current, { x: renderedStyles.tx.previous });
        gsap.set(lineHorizontalRef.current, { y: renderedStyles.ty.previous });
      }

      animationIdRef.current = requestAnimationFrame(render);
    };

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
          transform: "translateY(50%)",
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
          transform: "translateX(50%)",
          opacity: 0,
        }}
      />
    </div>
  );
}
