"use client";

import { useState } from "react";

interface LoginFormProps {
  onSignIn: () => void;
}

export function LoginForm({ onSignIn }: LoginFormProps) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <form className="svg-login-form" onClick={(e) => e.stopPropagation()}>
      <div className="svg-field">
        <input type="email" placeholder=" " id="sv-email" autoComplete="email" required />
        <label htmlFor="sv-email">邮箱</label>
      </div>
      <div className="svg-field svg-field-pwd">
        <input
          type={showPwd ? "text" : "password"}
          placeholder=" "
          id="sv-pwd"
          autoComplete="current-password"
          required
        />
        <label htmlFor="sv-pwd">密码</label>
        <button
          type="button"
          className="svg-toggle-pwd"
          onClick={() => setShowPwd((v) => !v)}
        >
          {showPwd ? "隐藏" : "显示"}
        </button>
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
        还没有账号？<a href="#register">立即注册</a>
      </p>
    </form>
  );
}
