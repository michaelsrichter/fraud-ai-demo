import type { InvestigationMode } from "../api/runsClient";
import { INVESTIGATION_MODES } from "../api/runsClient";

interface Props {
  activeMode: InvestigationMode;
  onModeChange: (mode: InvestigationMode) => void;
}

export function ModeTabBar({ activeMode, onModeChange }: Props) {
  return (
    <div style={{
      display: "flex",
      gap: 2,
      marginBottom: 16,
      borderBottom: "2px solid var(--border)",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {INVESTIGATION_MODES.map((mode) => {
        const isActive = mode.key === activeMode;
        return (
          <button
            key={mode.key}
            onClick={() => onModeChange(mode.key)}
            data-mode={mode.key}
            style={{
              flex: "1 1 0",
              padding: "8px 6px",
              border: "none",
              borderBottom: isActive ? "3px solid var(--btn-primary)" : "3px solid transparent",
              background: isActive ? "var(--bg-surface)" : "transparent",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.15s ease",
              borderRadius: "6px 6px 0 0",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{mode.icon}</div>
            <div style={{
              fontSize: "0.72rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "var(--text)" : "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {mode.label}
            </div>
            <div style={{
              fontSize: "0.6rem",
              color: "var(--text-muted)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}>
              {mode.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
