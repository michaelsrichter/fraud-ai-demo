import { Link, useLocation } from "react-router-dom";
import type { UserProfile } from "../lib/userProfile";
import { useEffect, useState } from "react";

interface Props {
  profile: UserProfile | null;
}

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/labs/expenses", label: "Expenses" },
  { path: "/labs/insurance", label: "Insurance", badge: "Soon" },
  { path: "/labs/payments", label: "Payments", badge: "Soon" },
];

export function TopNav({ profile }: Props) {
  const location = useLocation();
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      gap: 0,
      padding: "0 16px",
      height: 48,
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <Link to="/" style={{ fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", color: "var(--text)", marginRight: 24 }}>
        🔍 AI Fraud Lab
      </Link>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--text)" : "var(--text-muted)",
                background: isActive ? "var(--bg-hover)" : "transparent",
              }}
            >
              {item.label}
              {item.badge && (
                <span style={{
                  marginLeft: 4,
                  fontSize: "0.6rem",
                  padding: "1px 5px",
                  borderRadius: 999,
                  background: "var(--btn-secondary)",
                  color: "white",
                  verticalAlign: "middle",
                }}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a href="https://github.com/michaelsrichter/fraud-ai-demo" target="_blank" rel="noopener noreferrer"
          title="GitHub" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "1.1rem", lineHeight: 1 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
        <a href="https://www.linkedin.com/in/mikerichter/" target="_blank" rel="noopener noreferrer"
          title="LinkedIn" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "1.1rem", lineHeight: 1 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
          </svg>
        </a>
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {theme === "dark" ? "☀️" : "🌙"} {theme === "dark" ? "Light" : "Dark"}
        </button>
        {profile && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {profile.name}
            {profile.company && <span className="muted"> · {profile.company}</span>}
          </div>
        )}
      </div>
    </nav>
  );
}
