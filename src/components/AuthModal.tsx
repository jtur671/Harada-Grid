import React, { useState } from "react";
import { supabase } from "../supabaseClient";

type AuthView = "login" | "signup" | null;

type AuthModalProps = {
  authView: AuthView;
  onClose: () => void;
  onSwitchView: (view: "login" | "signup") => void;
};

type PasswordRequirements = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

const validatePassword = (password: string): PasswordRequirements => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

const isPasswordValid = (requirements: PasswordRequirements): boolean => {
  return (
    requirements.minLength &&
    requirements.hasUppercase &&
    requirements.hasLowercase &&
    requirements.hasNumber &&
    requirements.hasSpecial
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({
  authView,
  onClose,
  onSwitchView,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  if (!authView) return null;

  const handleClose = () => {
    setAuthError(null);
    setPassword("");
    setPasswordRequirements({
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false,
    });
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        setAuthError(error.message);
      } else {
        // Supabase will redirect to Google, then back to our app
        // onAuthStateChange in App.tsx will handle the session
        onClose();
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      setAuthError("Failed to initiate Google sign-in. Please try again.");
    }
  };

  const titleId = `auth-title-${authView}`;
  const errorId = `auth-error-${authView}`;

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
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
            <h2 id={titleId} className="auth-title">
              Log in
            </h2>
            <p className="auth-subtitle">
              Log in to access your saved Action Maps.
            </p>

            {authError && (
              <p id={errorId} className="auth-error" role="alert">
                {authError}
              </p>
            )}

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
              <label htmlFor="login-email" className="auth-field">
                <span>Email</span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-describedby={authError ? errorId : undefined}
                />
              </label>

              <label htmlFor="login-password" className="auth-field">
                <span>Password</span>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  aria-describedby={authError ? errorId : undefined}
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
                  setPassword("");
                  setPasswordRequirements({
                    minLength: false,
                    hasUppercase: false,
                    hasLowercase: false,
                    hasNumber: false,
                    hasSpecial: false,
                  });
                  onSwitchView("signup");
                }}
              >
                Need an account? Sign up
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 id={titleId} className="auth-title">
              Create your account
            </h2>
            <p className="auth-subtitle">
              Save your Action Maps and sync across devices.
            </p>

            {authError && (
              <p id={errorId} className="auth-error" role="alert">
                {authError}
              </p>
            )}

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
                const passwordValue = (formData.get("password") as string)?.trim();
                const confirm = (formData.get("confirm") as string)?.trim();

                if (!email || !passwordValue) {
                  setAuthError("Please fill in all fields.");
                  return;
                }

                // Validate password complexity
                const requirements = validatePassword(passwordValue);
                if (!isPasswordValid(requirements)) {
                  setAuthError("Password does not meet complexity requirements.");
                  return;
                }

                if (passwordValue !== confirm) {
                  setAuthError("Passwords do not match.");
                  return;
                }

                const { error } = await supabase.auth.signUp({
                  email,
                  password: passwordValue,
                  options: {
                    emailRedirectTo: window.location.origin,
                  },
                });

                if (error) {
                  setAuthError(error.message);
                } else {
                  // Go back to login so they can sign in
                  onSwitchView("login");
                }
              }}
            >
              <label htmlFor="signup-email" className="auth-field">
                <span>Email</span>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-describedby={authError ? errorId : undefined}
                />
              </label>

              <label htmlFor="signup-password" className="auth-field">
                <span>Password</span>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    const newPassword = e.target.value;
                    setPassword(newPassword);
                    setPasswordRequirements(validatePassword(newPassword));
                  }}
                  aria-describedby={authError ? errorId : undefined}
                />
                {password && (
                  <div className="password-requirements" role="list">
                    <div className={`password-requirement ${passwordRequirements.minLength ? "met" : "unmet"}`} role="listitem">
                      <span className="requirement-icon">
                        {passwordRequirements.minLength ? "✓" : "✗"}
                      </span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`password-requirement ${passwordRequirements.hasUppercase ? "met" : "unmet"}`} role="listitem">
                      <span className="requirement-icon">
                        {passwordRequirements.hasUppercase ? "✓" : "✗"}
                      </span>
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`password-requirement ${passwordRequirements.hasLowercase ? "met" : "unmet"}`} role="listitem">
                      <span className="requirement-icon">
                        {passwordRequirements.hasLowercase ? "✓" : "✗"}
                      </span>
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`password-requirement ${passwordRequirements.hasNumber ? "met" : "unmet"}`} role="listitem">
                      <span className="requirement-icon">
                        {passwordRequirements.hasNumber ? "✓" : "✗"}
                      </span>
                      <span>One number</span>
                    </div>
                    <div className={`password-requirement ${passwordRequirements.hasSpecial ? "met" : "unmet"}`} role="listitem">
                      <span className="requirement-icon">
                        {passwordRequirements.hasSpecial ? "✓" : "✗"}
                      </span>
                      <span>One special character (!@#$%^&*...)</span>
                    </div>
                  </div>
                )}
              </label>

              <label htmlFor="signup-confirm" className="auth-field">
                <span>Confirm password</span>
                <input
                  id="signup-confirm"
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  aria-describedby={authError ? errorId : undefined}
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
                  setPassword("");
                  setPasswordRequirements({
                    minLength: false,
                    hasUppercase: false,
                    hasLowercase: false,
                    hasNumber: false,
                    hasSpecial: false,
                  });
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
