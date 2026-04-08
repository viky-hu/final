"use client";

import { useCallback, useMemo, useState } from "react";

type WindowKey = "macro" | "database" | "main";
type ProfileTab = "avatar" | "profile" | "account";

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

const TAB_ITEMS: Array<{ key: ProfileTab; label: string }> = [
  { key: "avatar", label: "头像设置" },
  { key: "profile", label: "个人信息" },
  { key: "account", label: "账号设置" },
];

const AVATAR_PRESETS = ["深蓝", "青绿", "暗红"] as const;

export function GlobalTopNav({
  currentWindow,
  onNavigateToMacro,
  onNavigateToDatabase,
  onNavigateToMain,
  onLogout,
}: GlobalTopNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("avatar");

  const [avatarPreset, setAvatarPreset] = useState<(typeof AVATAR_PRESETS)[number]>("深蓝");
  const [avatarNote, setAvatarNote] = useState("保持专业、简洁");
  const [displayName, setDisplayName] = useState("管理员");
  const [jobTitle, setJobTitle] = useState("平台运营负责人");
  const [email, setEmail] = useState("admin@mitu.app");
  const [enable2FA, setEnable2FA] = useState(true);
  const [allowEmailNotice, setAllowEmailNotice] = useState(true);
  const [saveHint, setSaveHint] = useState("");

  const activeHint = useMemo(() => {
    if (!saveHint) return "";
    return `${saveHint}（已保存）`;
  }, [saveHint]);

  const handleWindowNavigate = useCallback(
    (target: WindowKey) => {
      if (target === currentWindow) return;
      if (target === "macro") onNavigateToMacro?.();
      if (target === "database") onNavigateToDatabase?.();
      if (target === "main") onNavigateToMain?.();
    },
    [currentWindow, onNavigateToDatabase, onNavigateToMacro, onNavigateToMain],
  );

  const handleSave = useCallback(
    (label: string) => {
      setSaveHint(label);
      window.setTimeout(() => {
        setSaveHint((prev) => (prev === label ? "" : prev));
      }, 1600);
    },
    [],
  );

  const closeAllPopups = useCallback(() => {
    setProfileOpen(false);
    setLogoutOpen(false);
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
                className={`global-top-nav__nav-item global-top-nav__nav-item--${item.key}${currentWindow === item.key ? " is-active" : ""}`}
                onClick={() => handleWindowNavigate(item.key)}
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
            <span className="global-top-nav__avatar-core" aria-hidden="true" />
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
          <section className="global-top-nav__profile-modal" role="dialog" aria-modal="true" aria-label="用户设置">
            <div className="global-top-nav__profile-tabs" role="tablist" aria-label="用户设置分栏">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  className={`global-top-nav__profile-tab${activeTab === tab.key ? " is-active" : ""}`}
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="global-top-nav__profile-content">
              {activeTab === "avatar" && (
                <div className="global-top-nav__panel">
                  <h3 className="global-top-nav__panel-title">头像设置</h3>
                  <p className="global-top-nav__panel-subtitle">选择当前账号在系统内的头像风格。</p>
                  <div className="global-top-nav__preset-row" role="radiogroup" aria-label="头像风格">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        role="radio"
                        aria-checked={avatarPreset === preset}
                        className={`global-top-nav__preset-btn${avatarPreset === preset ? " is-active" : ""}`}
                        onClick={() => setAvatarPreset(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <label className="global-top-nav__field-label" htmlFor="avatar-note-input">
                    头像说明
                  </label>
                  <input
                    id="avatar-note-input"
                    className="global-top-nav__field-input"
                    value={avatarNote}
                    onChange={(e) => setAvatarNote(e.target.value)}
                  />
                  <button type="button" className="global-top-nav__save-btn" onClick={() => handleSave("头像设置")}>
                    保存头像设置
                  </button>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="global-top-nav__panel">
                  <h3 className="global-top-nav__panel-title">个人信息</h3>
                  <p className="global-top-nav__panel-subtitle">维护账号基础信息，用于界面标识与审计记录。</p>
                  <label className="global-top-nav__field-label" htmlFor="display-name-input">
                    显示名称
                  </label>
                  <input
                    id="display-name-input"
                    className="global-top-nav__field-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <label className="global-top-nav__field-label" htmlFor="job-title-input">
                    职位
                  </label>
                  <input
                    id="job-title-input"
                    className="global-top-nav__field-input"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                  <label className="global-top-nav__field-label" htmlFor="email-input">
                    邮箱
                  </label>
                  <input
                    id="email-input"
                    className="global-top-nav__field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button type="button" className="global-top-nav__save-btn" onClick={() => handleSave("个人信息")}>
                    保存个人信息
                  </button>
                </div>
              )}

              {activeTab === "account" && (
                <div className="global-top-nav__panel">
                  <h3 className="global-top-nav__panel-title">账号设置</h3>
                  <p className="global-top-nav__panel-subtitle">调整账号安全与通知策略。</p>
                  <label className="global-top-nav__checkbox-line">
                    <input
                      type="checkbox"
                      checked={enable2FA}
                      onChange={(e) => setEnable2FA(e.target.checked)}
                    />
                    <span>启用双重验证</span>
                  </label>
                  <label className="global-top-nav__checkbox-line">
                    <input
                      type="checkbox"
                      checked={allowEmailNotice}
                      onChange={(e) => setAllowEmailNotice(e.target.checked)}
                    />
                    <span>启用邮件通知</span>
                  </label>
                  <button type="button" className="global-top-nav__save-btn" onClick={() => handleSave("账号设置")}>
                    保存账号设置
                  </button>
                </div>
              )}

              <div className="global-top-nav__panel-footer">
                <span className="global-top-nav__save-hint" aria-live="polite">
                  {activeHint}
                </span>
                <button type="button" className="global-top-nav__ghost-btn" onClick={closeAllPopups}>
                  关闭
                </button>
              </div>
            </div>
          </section>
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
