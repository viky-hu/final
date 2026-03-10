"use client";

import { HyperspeedBackground } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";

export function PanelBlueMain() {
  const panel2Preset = hyperspeedPresets.one;

  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg">
        <HyperspeedBackground effectOptions={panel2Preset} />
      </div>
    </div>
  );
}
