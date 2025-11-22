import React, { useState } from "react";
import { supabase } from "../supabaseClient";

type AuthView = "login" | "signup" | null;

type AuthModalProps = {
  authView: AuthView;
  onClose: () => void;
  onSwitchView: (view: "login" | "signup") => void;
};

export const AuthModal: React.FC<AuthModalProps> = ({
  authView,
  onClose,
  onSwitchView,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);

  if (!authView) return null;

  const handleClose = () => {
    setAuthError(null);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // optional: redirect back to app root
      // options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      // Supabase will redirect; when it comes back, onAuthStateChange handles the rest
      onClose();
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <div className="auth-card">
        <button
          type="button"
          className="auth-close"
          aria-label="Close"
          onClick={handleClose}
        >
          ×
        </button>

        {authView === "login" ? (
          <>
            <h2 className="auth-title">Log in</h2>
            <p className="auth-subtitle">
              Log in to access your saved Action Maps.
            </p>

            {authError && <p className="auth-error">{authError}</p>}

            {/* Google sign-in */}
            <button
              type="button"
              className="auth-social-btn"
              onClick={handleGoogleSignIn}
            >
              <span className="auth-social-icon">G</span>
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Email/password login */}
            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(null);

                const formData = new FormData(e.currentTarget);
                const email = (formData.get("email") as string)?.trim();
                const password = (formData.get("password") as string)?.trim();
                if (!email || !password) return;

                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });

                if (error) {
                  setAuthError(error.message);
                } else {
                  onClose();
                }
              }}
            >
              <label className="auth-field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>

              <button type="submit" className="auth-submit">
                Log in
              </button>

              <button
                type="button"
                className="auth-switch"
                onClick={() => {
                  setAuthError(null);
                  onSwitchView("signup");
                }}
              >
                Need an account? Sign up
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">
              Save your Action Maps and sync across devices.
            </p>

            {authError && <p className="auth-error">{authError}</p>}

            {/* Google sign-up (same OAuth flow) */}
            <button
              type="button"
              className="auth-social-btn"
              onClick={handleGoogleSignIn}
            >
              <span className="auth-social-icon">G</span>
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Email/password sign-up */}
            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(null);

                const formData = new FormData(e.currentTarget);
                const email = (formData.get("email") as string)?.trim();
                const password = (formData.get("password") as string)?.trim();
                const confirm = (formData.get("confirm") as string)?.trim();

                if (!email || !password || password !== confirm) {
                  if (password !== confirm) {
                    setAuthError("Passwords do not match.");
                  }
                  return;
                }

                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                });

                if (error) {
                  setAuthError(error.message);
                } else {
                  // Go back to login so they can sign in
                  onSwitchView("login");
                }
              }}
            >
              <label className="auth-field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </label>

              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </label>

              <button type="submit" className="auth-submit">
                Create account
              </button>

              <button
                type="button"
                className="auth-switch"
                onClick={() => {
                  setAuthError(null);
                  onSwitchView("login");
                }}
              >
                Already have an account? Log in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
