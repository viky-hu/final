"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
// 软退出窗口：与 panel 过渡动画时长保持一致，确保离屏期间特效平滑收尾
const SOFT_STOP_MS = Math.round(TRANSITION_DURATION * 1000);

interface ProductIntroWindowProps {
  onBack: () => void;
}

export function ProductIntroWindow({ onBack }: ProductIntroWindowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const panelIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const lastTriggerRef = useRef(0);
  const [activePanel, setActivePanel] = useState(0);
  // 刚被切走的 panel（软退出中），null 表示无软退出
  const [fadingOutPanel, setFadingOutPanel] = useState<number | null>(null);
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToPanel = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || isTransitioningRef.current) return;

    const clamped = Math.max(0, Math.min(PANEL_COUNT - 1, index));
    if (clamped === panelIndexRef.current) return;

    const prev = panelIndexRef.current;
    isTransitioningRef.current = true;
    panelIndexRef.current = clamped;

    // 触发软退出：让旧 panel 的特效有时间平滑收尾
    if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    setFadingOutPanel(prev);
    fadeOutTimerRef.current = setTimeout(() => {
      setFadingOutPanel(null);
      fadeOutTimerRef.current = null;
    }, SOFT_STOP_MS);

    setActivePanel(clamped);

    gsap.to(track, {
      y: -clamped * window.innerHeight,
      duration: TRANSITION_DURATION,
      ease: "power3.inOut",
      onComplete: () => {
        isTransitioningRef.current = false;
      },
    });
  }, []);

  useEffect(() => {
    return () => {
      if (fadeOutTimerRef.current) clearTimeout(fadeOutTimerRef.current);
    };
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
          <PanelBlueMain isActive={activePanel === 1} />
        </div>
        <div className="product-panel">
          <PanelBlueExtend
            isActive={activePanel === 2}
            shouldSoftStop={fadingOutPanel === 2}
          />
        </div>
      </div>
    </div>
  );
}
