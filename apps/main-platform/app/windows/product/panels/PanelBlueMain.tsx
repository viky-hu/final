"use client";

import { HyperspeedBackground } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";
import { ShuffleText } from "../overlays/ShuffleText";

interface PanelBlueMainProps {
  isActive: boolean;
}

export function PanelBlueMain({ isActive }: PanelBlueMainProps) {
  const panel2Preset =
    (hyperspeedPresets as Record<string, unknown>).one ??
    (hyperspeedPresets as Record<string, unknown>).panelRoadNeon ??
    Object.values(hyperspeedPresets)[0];

  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg">
        <HyperspeedBackground effectOptions={panel2Preset as Partial<typeof hyperspeedPresets.panelRoadNeon>} />
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
            style={{ fontFamily: '"ZCOOL QingKe HuangYou", system-ui, sans-serif' }}
            tag="p"
            textAlign="center"
          />
        </div>
      </div>
    </div>
  );
}
