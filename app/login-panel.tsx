"use client";

import { FormEvent, useState } from "react";
import { appBasePath, assetUrl } from "./assets";
import { isSupabaseConfigured, supabase } from "./supabase";

export function PasswordRecoveryPanel({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase!.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onComplete();
  };

  return (
    <main className="login-shell recovery-shell">
      <section className="login-story" aria-label="EUROPLUS password recovery">
        <div className="login-logo-card"><img src={assetUrl("/europlus-logo-red.png")} alt="EUROPLUS" /></div>
        <div className="login-story-copy"><p>SECURE ACCOUNT RECOVERY</p><h1>Choose a new password for Work Command.</h1><span>The reset link has confirmed your identity. Your new password will apply immediately.</span></div>
      </section>
      <section className="login-entry">
        <div className="login-form-wrap">
          <p className="login-kicker">ACCOUNT SECURITY</p>
          <h2>Reset password.</h2>
          <p className="login-intro">Use a unique password with at least 8 characters.</p>
          <form onSubmit={updatePassword}>
            <label><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
            <label><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
            {message && <p className="login-message" role="status">{message}</p>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "Updating…" : "Save new password"}<span>→</span></button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function LoginPanel({ onPreview }: { onPreview?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase connection details still need to be added.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(
        error.message === "Invalid login credentials"
          ? "The email or password is incorrect."
          : error.message,
      );
    }
  };

  const resetPassword = async () => {
    if (!supabase || !email) {
      setMessage("Enter your email first, then choose Forgot password.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${appBasePath}/`,
    });
    setLoading(false);
    setMessage(
      error ? error.message : "A secure password reset link has been emailed to you.",
    );
  };

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="EUROPLUS Work Command introduction">
        <div className="login-logo-card">
          <img src={assetUrl("/europlus-logo-red.png")} alt="EUROPLUS" />
        </div>
        <div className="login-story-copy">
          <p>PRIVATE OPERATIONS WORKSPACE</p>
          <h1>One command centre for every EUROPLUS handoff.</h1>
          <span>
            Inquiries, PI approvals, supplier payments, production and shipment
            readiness—clear to the whole team.
          </span>
        </div>
        <div className="login-flow" aria-label="EUROPLUS workflow">
          {["Inquiry", "PI", "Order", "Payment", "Production", "Shipment"].map(
            (step, index) => (
              <span key={step}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                {step}
              </span>
            ),
          )}
        </div>
        <footer>
          <span>20 years together.</span>
          <span>Now working as one team.</span>
        </footer>
      </section>

      <section className="login-entry">
        <div className="login-form-wrap">
          <div className="login-mobile-logo">
            <img src={assetUrl("/europlus-logo-red.png")} alt="EUROPLUS" />
          </div>
          <p className="login-kicker">EUROPLUS · WORK COMMAND</p>
          <h2>Welcome back.</h2>
          <p className="login-intro">Sign in with your company account to continue.</p>

          <form onSubmit={signIn}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <div className="login-options">
              <span>Secure team access</span>
              <button type="button" onClick={resetPassword}>
                Forgot password?
              </button>
            </div>
            {message && <p className="login-message" role="status">{message}</p>}
            {!isSupabaseConfigured && (
              <p className="login-setup-note" role="status">
                Login design is ready. Add the Supabase project URL and publishable
                key to activate secure sign-in.
              </p>
            )}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Enter Work Command"}
              <span>→</span>
            </button>
            {onPreview && (
              <button className="demo-entry" type="button" onClick={onPreview}>
                View demo workspace
                <span>Sample data only</span>
              </button>
            )}
          </form>

          <div className="login-security">
            <span aria-hidden="true">◆</span>
            <p>
              <strong>Protected workspace</strong>
              Access and edits are recorded against each signed-in team member.
            </p>
          </div>
        </div>
        <footer className="login-entry-footer">
          <span>Redberry Operations</span>
          <span>EUROPLUS · Authorised users only</span>
        </footer>
      </section>
    </main>
  );
}
