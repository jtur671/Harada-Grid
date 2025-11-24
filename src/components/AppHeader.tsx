import React from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";

type AuthView = "login" | "signup" | null;

type AppHeaderProps = {
  showBackButton?: boolean;
  onBackClick?: () => void;
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  onSetAuthView: (view: AuthView) => void;
  onGoToHome?: () => void;
  onGoToPricing?: () => void;
  onGoToDashboard?: () => void;
  onGoToSupport?: () => void;
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  showBackButton = false,
  onBackClick,
  user,
  isAdmin,
  isPro = false,
  onSetAuthView,
  onGoToHome,
  onGoToPricing,
  onGoToDashboard,
  onGoToSupport,
}) => {
  const isLoggedIn = !!user;

  return (
    <header className="home-nav">
      <div 
        className="home-logo" 
        onClick={onGoToHome}
        style={{ cursor: onGoToHome ? "pointer" : "default" }}
        role={onGoToHome ? "button" : undefined}
        tabIndex={onGoToHome ? 0 : undefined}
        onKeyDown={onGoToHome ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onGoToHome();
          }
        } : undefined}
      >
        <span className="home-logo-mark">◆</span>
        <span className="home-logo-text">
          Action<span>Maps</span>
        </span>
      </div>

      <nav className="home-nav-actions">
        {/* Only show back button when NOT logged in (for marketing pages) */}
        {showBackButton && onBackClick && !isLoggedIn && (
          <button
            type="button"
            className="home-nav-link"
            onClick={onBackClick}
          >
            ← Back
          </button>
        )}

        {/* Pricing link */}
        {onGoToPricing && (
          <button
            type="button"
            className="home-nav-link"
            onClick={onGoToPricing}
          >
            Pricing
          </button>
        )}

        {/* Support link */}
        {onGoToSupport && (
          <button
            type="button"
            className="home-nav-link"
            onClick={onGoToSupport}
          >
            Support
          </button>
        )}

        {/* Dashboard link, only when logged in */}
        {isLoggedIn && onGoToDashboard && (
          <button
            type="button"
            className="home-nav-link"
            onClick={onGoToDashboard}
          >
            My maps
          </button>
        )}

        {isLoggedIn && user?.email ? (
          <>
            {isAdmin && <span className="home-nav-user-pill">Admin</span>}
            {!isAdmin && (
              <div className="home-nav-user-info">
                <span className="home-nav-user-pill">{user.email}</span>
                {isPro && <span className="home-nav-pro-badge">Pro</span>}
              </div>
            )}
            <button
              type="button"
              className="home-nav-link"
              onClick={() => supabase.auth.signOut()}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="home-nav-link"
              onClick={() => onSetAuthView("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className="home-nav-cta"
              onClick={() => onSetAuthView("signup")}
            >
              Sign up
            </button>
          </>
        )}
      </nav>
    </header>
  );
};

