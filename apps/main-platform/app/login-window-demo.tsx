"use client";

/**
 * LoginWindowDemo — 顶层窗口编排入口
 *
 * 职责：
 *   1. 维护当前激活窗口（login | product | main | database | macro）
 *   2. 将切换回调分发给子窗口
 *   3. 不包含任何动画或业务逻辑
 *
 * 子窗口位置：
 *   - 第一窗口（登录/介绍）:  ./windows/login/LoginIntroWindow
 *   - 第二窗口（产品介绍）:   ./windows/product/ProductIntroWindow
 *   - 第三窗口（交互对话）:   ./windows/main/MainWindow
 *   - 第四窗口（数据库）:     ./windows/database/DatabaseWindow
 *   - 第五窗口（宏观平台）:   ./windows/macro/MacroWindow
 */

import { useState } from "react";
import { LoginIntroWindow } from "./windows/login/LoginIntroWindow";
import { ProductIntroWindow } from "./windows/product/ProductIntroWindow";
import { MainWindow } from "./windows/main/MainWindow";
import { DatabaseWindow } from "./windows/database/DatabaseWindow";
import { MacroWindow } from "./windows/macro/MacroWindow";

type ActiveWindow = "login" | "product" | "main" | "database" | "macro";

export function LoginWindowDemo() {
  const [activeWindow, setActiveWindow] = useState<ActiveWindow>("login");
  const [loginRenderKey, setLoginRenderKey] = useState(0);

  const handleOpenProduct = () => setActiveWindow("product");
  const handleBackToLogin = () => {
    setActiveWindow("login");
    // Force re-mount so the intro animation replays from scratch.
    setLoginRenderKey((v) => v + 1);
  };
  const handleShoot = () => setActiveWindow("main");
  const handleOpenDatabase = () => setActiveWindow("database");
  const handleOpenMacro = () => setActiveWindow("macro");

  if (activeWindow === "macro") {
    return (
      <MacroWindow
        onBack={handleBackToLogin}
        onNavigateToMain={() => setActiveWindow("main")}
        onOpenDatabase={handleOpenDatabase}
      />
    );
  }

  if (activeWindow === "database") {
    return (
      <DatabaseWindow
        onBack={handleBackToLogin}
        onNavigateToMain={() => setActiveWindow("main")}
        onOpenMacro={handleOpenMacro}
      />
    );
  }

  if (activeWindow === "main") {
    return (
      <MainWindow
        onBack={handleBackToLogin}
        onOpenDatabase={handleOpenDatabase}
        onOpenMacro={handleOpenMacro}
      />
    );
  }

  if (activeWindow === "product") {
    return <ProductIntroWindow onBack={handleBackToLogin} onShoot={handleShoot} />;
  }

  return <LoginIntroWindow key={loginRenderKey} onSignIn={handleOpenProduct} />;
}
