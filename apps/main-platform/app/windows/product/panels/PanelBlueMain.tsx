"use client";

import { HyperspeedBackground } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";

export function PanelBlueMain() {
  const panel2Preset =
    (hyperspeedPresets as Record<string, unknown>).one ??
    (hyperspeedPresets as Record<string, unknown>).panelRoadNeon ??
    Object.values(hyperspeedPresets)[0];

  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg">
        <HyperspeedBackground effectOptions={panel2Preset as Partial<typeof hyperspeedPresets.panelRoadNeon>} />
      </div>
    </div>
  );
}
