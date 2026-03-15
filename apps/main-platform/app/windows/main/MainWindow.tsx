"use client";

import { DotGrid } from "./components/DotGrid";
import { StaggeredMenu } from "./components/StaggeredMenu";
import type { StaggeredMenuItem } from "./components/StaggeredMenu";

interface MainWindowProps {
  onBack?: () => void;
}

export function MainWindow({ onBack }: MainWindowProps) {
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
    },
    {
      label: "宏观平台",
      ariaLabel: "宏观平台",
      link: "#",
    },
  ];

  return (
    <div className="main-window-page">
      {/* DotGrid: full-screen background */}
      <div className="main-window-dotgrid-bg">
        <DotGrid
          dotSize={4}
          gap={20}
          baseColor="#27FF64"
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

      {/* StaggeredMenu: foreground overlay */}
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
        />
      </div>
    </div>
  );
}
