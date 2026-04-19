"use client";

import { useEffect, useRef, useState } from "react";

interface LoginFormProps {
  onSignIn: () => void;
}

interface PasswordToggleButtonProps {
  visible: boolean;
  onToggle: () => void;
}

function PasswordToggleButton({ visible, onToggle }: PasswordToggleButtonProps) {
  return (
    <button
      type="button"
      className="svg-toggle-pwd"
      onClick={onToggle}
      aria-label={visible ? "隐藏密码" : "显示密码"}
      title={visible ? "隐藏密码" : "显示密码"}
    >
      <span className="svg-eye-icon" aria-hidden="true">
        <svg className="svg-eye-icon-svg" viewBox="0 0 24 24" fill="none" focusable="false">
          <path d="M1.5 12C3.84 7.78 7.56 5.67 12 5.67C16.44 5.67 20.16 7.78 22.5 12C20.16 16.22 16.44 18.33 12 18.33C7.56 18.33 3.84 16.22 1.5 12Z" />
          <circle cx="12" cy="12" r="3.1" />
          <line
            x1="4.2"
            y1="19.3"
            x2="19.8"
            y2="4.7"
            className={visible ? "svg-eye-icon-slash is-hidden" : "svg-eye-icon-slash"}
          />
        </svg>
      </span>
    </button>
  );
}

export function LoginForm({ onSignIn }: LoginFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [activeMode, setActiveMode] = useState<"login" | "register">("login");
  const [isApplyingRegister, setIsApplyingRegister] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);
  const [showRegisterConfirmPwd, setShowRegisterConfirmPwd] = useState(false);

  useEffect(() => {
    const formEl = formRef.current;
    if (!formEl) return;

    const clearInputs = () => {
      const inputs = formEl.querySelectorAll<HTMLInputElement>("input");
      inputs.forEach((input) => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
          return;
        }
        input.value = "";
      });
    };

    clearInputs();
    const timeoutId = window.setTimeout(clearInputs, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleSwitchToRegister = () => {
    setActiveMode("register");
    setShowPwd(false);
  };

  const handleBackToLogin = () => {
    setActiveMode("login");
    setIsApplyingRegister(false);
    setShowRegisterPwd(false);
    setShowRegisterConfirmPwd(false);
  };

  const handleApplyRegister = () => {
    setIsApplyingRegister(true);
  };

  return (
    <form ref={formRef} className="svg-login-form" autoComplete="off" onClick={(e) => e.stopPropagation()}>
      <div className="svg-form-switcher">
        <section className={`svg-form-panel ${activeMode === "register" ? "is-active" : "is-inactive"}`}>
          <div className="svg-field">
            <input type="text" placeholder=" " id="sv-register-account" autoComplete="off" required />
            <label htmlFor="sv-register-account">账号</label>
          </div>
          <div className="svg-field svg-field-pwd">
            <input
              type={showRegisterPwd ? "text" : "password"}
              placeholder=" "
              id="sv-register-pwd"
              autoComplete="new-password"
              required
            />
            <label htmlFor="sv-register-pwd">密码</label>
            <PasswordToggleButton visible={showRegisterPwd} onToggle={() => setShowRegisterPwd((v) => !v)} />
          </div>
          <div className="svg-field svg-field-pwd">
            <input
              type={showRegisterConfirmPwd ? "text" : "password"}
              placeholder=" "
              id="sv-register-confirm-pwd"
              autoComplete="new-password"
              required
            />
            <label htmlFor="sv-register-confirm-pwd">确认密码</label>
            <PasswordToggleButton
              visible={showRegisterConfirmPwd}
              onToggle={() => setShowRegisterConfirmPwd((v) => !v)}
            />
          </div>
          <div className="svg-form-actions">
            <button
              type="button"
              className="svg-submit"
              onClick={handleApplyRegister}
              disabled={isApplyingRegister}
            >
              {isApplyingRegister ? "申请中……" : "申请注册"}
            </button>
            <button type="button" className="svg-submit svg-submit-secondary" onClick={handleBackToLogin}>
              返回登录
            </button>
          </div>
        </section>

        <section className={`svg-form-panel ${activeMode === "login" ? "is-active" : "is-inactive"}`}>
          <div className="svg-field">
            <input type="email" placeholder=" " id="sv-email" autoComplete="off" required />
            <label htmlFor="sv-email">邮箱</label>
          </div>
          <div className="svg-field svg-field-pwd">
            <input
              type={showPwd ? "text" : "password"}
              placeholder=" "
              id="sv-pwd"
              autoComplete="new-password"
              required
            />
            <label htmlFor="sv-pwd">密码</label>
            <PasswordToggleButton visible={showPwd} onToggle={() => setShowPwd((v) => !v)} />
          </div>
          <div className="svg-form-row">
            <label className="svg-checkbox">
              <input type="checkbox" />
              <span>记住我</span>
            </label>
            <a href="#forgot">忘记密码？</a>
          </div>
          <button type="button" className="svg-submit" onClick={onSignIn}>
            登录
          </button>
          <p className="svg-register">
            还没有账号？
            <button type="button" className="svg-inline-link" onClick={handleSwitchToRegister}>
              立即注册
            </button>
          </p>
        </section>
      </div>
    </form>
  );
}
