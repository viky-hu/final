"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { PanelBlack } from "./panels/PanelBlack";
import { PanelBlueMain } from "./panels/PanelBlueMain";
import { PanelBlueExtend } from "./panels/PanelBlueExtend";

const PANEL_COUNT = 3;
const TRANSITION_DURATION = 0.75;
// Minimum ms between two consecutive panel switches — prevents scroll bursts.
const COOLDOWN_MS = 900;
// Minimum wheel delta to register as intentional scroll.
const WHEEL_THRESHOLD = 12;

interface ProductIntroWindowProps {
  onBack: () => void;
}

export function ProductIntroWindow({ onBack }: ProductIntroWindowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const panelIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const lastTriggerRef = useRef(0);

  const goToPanel = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || isTransitioningRef.current) return;

    const clamped = Math.max(0, Math.min(PANEL_COUNT - 1, index));
    if (clamped === panelIndexRef.current) return;

    isTransitioningRef.current = true;
    panelIndexRef.current = clamped;

    gsap.to(track, {
      y: -clamped * window.innerHeight,
      duration: TRANSITION_DURATION,
      ease: "power3.inOut",
      onComplete: () => {
        isTransitioningRef.current = false;
      },
    });
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    gsap.set(track, { y: 0 });

    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastTriggerRef.current < COOLDOWN_MS) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      lastTriggerRef.current = now;
      goToPanel(panelIndexRef.current + (e.deltaY > 0 ? 1 : -1));
    };

    const onResize = () => {
      gsap.set(track, { y: -panelIndexRef.current * window.innerHeight });
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
  }, [goToPanel]);

  return (
    <div className="product-pager-stage">
      <div ref={trackRef} className="product-pager-track">
        <div className="product-panel">
          <PanelBlack onBack={onBack} />
        </div>
        <div className="product-panel">
          <PanelBlueMain />
        </div>
        <div className="product-panel">
          <PanelBlueExtend />
        </div>
      </div>
    </div>
  );
}
