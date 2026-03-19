"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { HyperspeedBackground, type HyperspeedBackgroundHandle } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";
import { ShuffleText } from "../overlays/ShuffleText";
import { PanelBlueLines } from "./PanelBlueLines";

/** 公路收起动画时长，与 pager 切换错开一点，结束即停止动效 */
const ROAD_HIDE_DURATION = 0.42;

interface PanelBlueMainProps {
  isActive: boolean;
}

export function PanelBlueMain({ isActive }: PanelBlueMainProps) {
  const panel2Preset =
    (hyperspeedPresets as Record<string, unknown>).one ??
    (hyperspeedPresets as Record<string, unknown>).panelRoadNeon ??
    Object.values(hyperspeedPresets)[0];

  const [isClosing, setIsClosing] = useState(false);
  const wasActiveRef = useRef(isActive);
  const hyperspeedRef = useRef<HyperspeedBackgroundHandle>(null);
  const bgWrapRef = useRef<HTMLDivElement>(null);

  /** 仅当从「当前面板」切走时保留公路并播收起动画，其余时间不挂载公路以省资源 */
  const shouldMountRoad = isActive || isClosing;

  // 从激活切到非激活时：进入「收起」状态，播从下到上收起动画，结束同帧停止动效并卸载
  useEffect(() => {
    const becameInactive = !isActive && wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (becameInactive) setIsClosing(true);
  }, [isActive]);

  const onCloseAnimationComplete = useCallback(() => {
    hyperspeedRef.current?.stop();
    setIsClosing(false);
  }, []);

  useEffect(() => {
    if (!isClosing || !bgWrapRef.current) return;
    const el = bgWrapRef.current;
    gsap.fromTo(
      el,
      { clipPath: "inset(0 0 0% 0)" },
      {
        clipPath: "inset(0 0 100% 0)",
        duration: ROAD_HIDE_DURATION,
        ease: "power3.inOut",
        onComplete: onCloseAnimationComplete,
      },
    );
    return () => {
      gsap.killTweensOf(el);
    };
  }, [isClosing, onCloseAnimationComplete]);

  // 切回公路面板时取消未完成的收起动画并重置裁剪
  useEffect(() => {
    if (!isActive || !bgWrapRef.current) return;
    const el = bgWrapRef.current;
    gsap.killTweensOf(el);
    gsap.set(el, { clipPath: "inset(0 0 0% 0)" });
  }, [isActive]);

  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg" ref={bgWrapRef}>
        {shouldMountRoad && (
          <HyperspeedBackground
            ref={hyperspeedRef}
            effectOptions={panel2Preset as Partial<typeof hyperspeedPresets.panelRoadNeon>}
          />
        )}
      </div>
      <div className="panel-blue-main-lines" aria-hidden="true">
        <PanelBlueLines isActive={isActive} />
      </div>
      <div className="panel-blue-main-content" aria-hidden="true">
        <div className="panel-blue-main-shuffle-wrap">
          <ShuffleText
            active={isActive}
            text="各端口即时交流 时空链接"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            triggerOnce={false}
            triggerOnHover={false}
            respectReducedMotion
            autoReplayMs={1500}
            className="panel-blue-main-shuffle-text"
            style={{ fontFamily: '"DingTalk JinBuTi", system-ui, sans-serif' }}
            tag="p"
            textAlign="center"
          />
        </div>
      </div>
    </div>
  );
}
