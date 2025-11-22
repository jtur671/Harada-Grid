import React from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";

type AuthView = "login" | "signup" | null;

type AppHeaderProps = {
  showBackButton?: boolean;
  onBackClick?: () => void;
  user: User | null;
  isAdmin: boolean;
  onSetAuthView: (view: AuthView) => void;
  onGoToPricing?: () => void;
  onGoToDashboard?: () => void;
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  showBackButton = false,
  onBackClick,
  user,
  isAdmin,
  onSetAuthView,
  onGoToPricing,
  onGoToDashboard,
}) => {
  const isLoggedIn = !!user;

  return (
    <header className="home-nav">
      <div className="home-logo">
        <span className="home-logo-mark">◆</span>
        <span className="home-logo-text">
          Action<span>Maps</span>
        </span>
      </div>

      <nav className="home-nav-actions">
        {showBackButton && onBackClick && (
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
              <span className="home-nav-user-pill">{user.email}</span>
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

