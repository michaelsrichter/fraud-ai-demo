import { Link, useLocation } from "react-router-dom";
import type { UserProfile } from "../lib/userProfile";

interface Props {
  profile: UserProfile | null;
}

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/labs/expenses", label: "Expenses" },
  { path: "/labs/insurance", label: "Insurance", badge: "Soon" },
  { path: "/labs/payments", label: "Payments", badge: "Soon" },
  { path: "/how-it-works", label: "How It Works" },
];

export function TopNav({ profile }: Props) {
  const location = useLocation();

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
      {profile && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {profile.name}
          {profile.company && <span className="muted"> · {profile.company}</span>}
        </div>
      )}
    </nav>
  );
}
