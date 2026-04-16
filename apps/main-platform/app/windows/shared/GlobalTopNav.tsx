"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppRuntime } from "@/app/components/runtime/AppRuntimeProvider";
import { ProfileModalLong } from "./ProfileModalLong";

type WindowKey = "macro" | "database" | "main";

interface GlobalTopNavProps {
  currentWindow: WindowKey;
  onNavigateToMacro?: () => void;
  onNavigateToDatabase?: () => void;
  onNavigateToMain?: () => void;
  onLogout?: () => void;
}

const NAV_ITEMS: Array<{ key: WindowKey; label: string }> = [
  { key: "macro", label: "宏观平台" },
  { key: "database", label: "数据库" },
  { key: "main", label: "交互对话" },
];

export function GlobalTopNav({
  currentWindow,
  onNavigateToMacro,
  onNavigateToDatabase,
  onNavigateToMain,
  onLogout,
}: GlobalTopNavProps) {
  const { avatarDataUrl } = useAppRuntime();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [switchingNavKey, setSwitchingNavKey] = useState<WindowKey | null>(null);
  const switchingTimerRef = useRef<number | null>(null);

  const handleWindowNavigate = useCallback(
    (target: WindowKey) => {
      if (target === currentWindow) return;
      if (target === "macro") onNavigateToMacro?.();
      if (target === "database") onNavigateToDatabase?.();
      if (target === "main") onNavigateToMain?.();
    },
    [currentWindow, onNavigateToDatabase, onNavigateToMacro, onNavigateToMain],
  );

  const closeAllPopups = useCallback(() => {
    setProfileOpen(false);
    setLogoutOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (switchingTimerRef.current !== null) {
        window.clearTimeout(switchingTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <header className="global-top-nav" role="banner" aria-label="全局顶部导航栏">
        <div className="global-top-nav__left">
          <div className="global-top-nav__icon-placeholder" aria-hidden="true" />
          <span className="global-top-nav__thick-separator" aria-hidden="true" />
          <span className="global-top-nav__brand">密态智图</span>
        </div>

        <nav className="global-top-nav__center" aria-label="窗口切换">
          {NAV_ITEMS.map((item, index) => (
            <div key={item.key} className="global-top-nav__nav-item-wrap">
              <button
                type="button"
                className={`global-top-nav__nav-item global-top-nav__nav-item--${item.key}${currentWindow === item.key ? " is-active" : ""}${switchingNavKey === item.key ? " is-switching" : ""}`}
                onClick={() => {
                  setSwitchingNavKey(item.key);
                  if (switchingTimerRef.current !== null) {
                    window.clearTimeout(switchingTimerRef.current);
                  }
                  switchingTimerRef.current = window.setTimeout(() => {
                    setSwitchingNavKey((prev) => (prev === item.key ? null : prev));
                  }, 240);
                  handleWindowNavigate(item.key);
                }}
                aria-current={currentWindow === item.key ? "page" : undefined}
              >
                {item.label}
              </button>
              {index < NAV_ITEMS.length - 1 && <span className="global-top-nav__thin-separator" aria-hidden="true" />}
            </div>
          ))}
        </nav>

        <div className="global-top-nav__right">
          <button
            type="button"
            className="global-top-nav__avatar-btn"
            aria-label="打开用户菜单"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            onClick={() => {
              setLogoutOpen(false);
              setProfileOpen((v) => !v);
            }}
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} className="global-top-nav__avatar-image" alt="用户头像" />
            ) : (
              <span className="global-top-nav__avatar-core" aria-hidden="true" />
            )}
          </button>

          <span className="global-top-nav__thick-separator" aria-hidden="true" />

          <button
            type="button"
            className="global-top-nav__logout-trigger"
            onClick={() => {
              setProfileOpen(false);
              setLogoutOpen(true);
            }}
          >
            退出登录
          </button>
        </div>
      </header>

      {profileOpen && (
        <div className="global-top-nav__overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && closeAllPopups()}>
          <ProfileModalLong onClose={closeAllPopups} />
        </div>
      )}

      {logoutOpen && (
        <div className="global-top-nav__overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && closeAllPopups()}>
          <section className="global-top-nav__logout-modal" role="dialog" aria-modal="true" aria-label="退出登录确认">
            <p className="global-top-nav__logout-title">是否确认退出登录？</p>
            <p className="global-top-nav__logout-subtitle">退出后将返回第一窗口（登录界面）。</p>
            <div className="global-top-nav__logout-actions">
              <button type="button" className="global-top-nav__ghost-btn" onClick={closeAllPopups}>
                取消
              </button>
              <button
                type="button"
                className="global-top-nav__danger-btn"
                onClick={() => {
                  closeAllPopups();
                  onLogout?.();
                }}
              >
                确认退出
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
