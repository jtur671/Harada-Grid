import React, { useState } from "react";
import { supabase } from "../supabaseClient";

type AuthView = "login" | "signup" | null;

type AuthModalProps = {
  authView: AuthView;
  onClose: () => void;
};

export const AuthModal: React.FC<AuthModalProps> = ({ authView, onClose }) => {
  const [authError, setAuthError] = useState<string | null>(null);

  if (!authView) return null;

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <div className="auth-card">
        <button
          type="button"
          className="auth-close"
          aria-label="Close"
          onClick={onClose}
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
                  // onAuthStateChange will call loadProjectsForUser and pick builder vs dashboard
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
                  // Switch to signup - this will be handled by parent
                  // We need to pass a switch handler prop
                }}
              >
                Need an account? Sign up
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-title">Sign up</h2>
            <p className="auth-subtitle">
              Create a free Action Maps account so your grids are saved.
            </p>
            {authError && <p className="auth-error">{authError}</p>}
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
                  // Depending on Supabase settings, user may need email confirmation
                  onClose();
                  // new user -> no projects -> builder + modal
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
                  // Switch to login - this will be handled by parent
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

