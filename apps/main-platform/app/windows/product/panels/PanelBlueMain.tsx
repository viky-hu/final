"use client";

import { HyperspeedBackground } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";

export function PanelBlueMain() {
  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg">
        <HyperspeedBackground effectOptions={hyperspeedPresets.one} />
      </div>
      <div className="panel-blue-main-content">
        <p className="panel-blue-kicker">Product Intro</p>
        <h2 className="panel-blue-title">LightRAG Neon Road</h2>
        <p className="panel-blue-desc">
          已接入完整公路流光特效（黑幕+炫彩线条+行进感），并严格限制在 Panel 2 内显示。
        </p>
      </div>
    </div>
  );
}
