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
        <label htmlFor="sv-email">Email</label>
      </div>
      <div className="svg-field svg-field-pwd">
        <input
          type={showPwd ? "text" : "password"}
          placeholder=" "
          id="sv-pwd"
          autoComplete="current-password"
          required
        />
        <label htmlFor="sv-pwd">Password</label>
        <button
          type="button"
          className="svg-toggle-pwd"
          onClick={() => setShowPwd((v) => !v)}
        >
          {showPwd ? "Hide" : "Show"}
        </button>
      </div>
      <div className="svg-form-row">
        <label className="svg-checkbox">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>
        <a href="#forgot">Forgot?</a>
      </div>
      <button type="button" className="svg-submit" onClick={onSignIn}>
        Sign in
      </button>
      <p className="svg-register">
        No account? <a href="#register">Create one</a>
      </p>
    </form>
  );
}
