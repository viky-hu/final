"use client";

import { HyperspeedBackground } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";

export function PanelBlueMain() {
  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg">
        <HyperspeedBackground effectOptions={hyperspeedPresets.one} />
      </div>
    </div>
  );
}
