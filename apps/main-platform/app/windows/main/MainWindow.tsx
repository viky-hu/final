"use client";

import { useState, useCallback } from "react";
import { DotGrid } from "./components/DotGrid";
import { StaggeredMenu } from "./components/StaggeredMenu";
import { ChatCanvasLines } from "./components/ChatCanvasLines";
import { ChatInteractionPanel } from "./components/ChatInteractionPanel";
import { TraceWindow } from "./components/TraceWindow";
import type { StaggeredMenuItem } from "./components/StaggeredMenu";

interface MainWindowProps {
  onBack?: () => void;
  onOpenDatabase?: () => void;
}

export function MainWindow({ onBack, onOpenDatabase }: MainWindowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [traceMsgId, setTraceMsgId] = useState<string | null>(null);

  const handleOpenTrace = useCallback((msgId: string) => {
    setTraceMsgId(msgId);
  }, []);

  const handleCloseTrace = useCallback(() => {
    setTraceMsgId(null);
  }, []);

  const menuItems: StaggeredMenuItem[] = [
    {
      label: "返回初始界面",
      ariaLabel: "返回初始界面",
      link: "#",
      onClick: onBack,
    },
    {
      label: "交互对话",
      ariaLabel: "交互对话",
      link: "#",
    },
    {
      label: "数据库",
      ariaLabel: "数据库",
      link: "#",
      onClick: onOpenDatabase,
    },
    {
      label: "宏观平台",
      ariaLabel: "宏观平台",
      link: "#",
    },
  ];

  return (
    <div className="main-window-page">
      {/* DotGrid: z-index 0, full-screen background */}
      <div className="main-window-dotgrid-bg">
        <DotGrid
          dotSize={4}
          gap={20}
          baseColor="#6b6b6b"
          activeColor="#27FF64"
          proximity={150}
          speedTrigger={100}
          shockRadius={250}
          shockStrength={5}
          maxSpeed={5000}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      {/* ChatCanvasLines: z-index 5, SVG canvas layer between dotgrid and menu */}
      <div className="main-window-canvas-layer">
        <ChatCanvasLines
          menuOpen={isMenuOpen}
          onComplete={() => setCanvasReady(true)}
        />
      </div>

      {/* ChatInteractionPanel: z-index 6, interactive chat layer above canvas, pointer-events on children only */}
      <ChatInteractionPanel
        menuOpen={isMenuOpen}
        canvasReady={canvasReady}
        onOpenTrace={handleOpenTrace}
      />

      {/* TraceWindow: z-index 200, full-screen overlay, mounted only when a trace is active */}
      {traceMsgId && (
        <TraceWindow msgId={traceMsgId} onClose={handleCloseTrace} />
      )}

      {/* StaggeredMenu: z-index 10, foreground overlay */}
      <div className="main-window-menu-layer">
        <StaggeredMenu
          position="right"
          items={menuItems}
          displayItemNumbering={true}
          menuButtonColor="#fff"
          openMenuButtonColor="#fff"
          changeMenuColorOnOpen={true}
          colors={["#9EF2B2", "#27FF64"]}
          accentColor="#27FF64"
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => setIsMenuOpen(false)}
        />
      </div>
    </div>
  );
}
