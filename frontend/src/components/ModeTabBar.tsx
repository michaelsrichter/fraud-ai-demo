import { useState } from "react";
import type { InvestigationMode } from "../api/runsClient";
import { INVESTIGATION_MODES } from "../api/runsClient";

interface Props {
  activeMode: InvestigationMode;
  onModeChange: (mode: InvestigationMode) => void;
}

const MODE_COLORS: Record<InvestigationMode, string> = {
  single: "var(--btn-primary)",
  consensus: "var(--band-medium)",
  debate: "var(--band-high)",
  "junior-senior": "var(--band-low)",
};

export function ModeTabBar({ activeMode, onModeChange }: Props) {
  const [hoveredMode, setHoveredMode] = useState<InvestigationMode | null>(null);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      gap: 8,
      marginBottom: 20,
    }}>
      {INVESTIGATION_MODES.map((mode) => {
        const isActive = mode.key === activeMode;
        const isHovered = hoveredMode === mode.key;
        const accentColor = MODE_COLORS[mode.key];
        return (
          <button
            key={mode.key}
            onClick={() => onModeChange(mode.key)}
            onMouseEnter={() => setHoveredMode(mode.key)}
            onMouseLeave={() => setHoveredMode(null)}
            data-mode={mode.key}
            style={{
              padding: "12px 10px",
              border: isActive ? `2px solid ${accentColor}` : "2px solid var(--border)",
              background: isActive ? "var(--bg-surface)" : isHovered ? "var(--bg-hover, var(--bg-surface))" : "transparent",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s ease",
              borderRadius: 8,
              transform: isHovered && !isActive ? "translateY(-2px)" : "none",
              boxShadow: isActive
                ? `0 2px 8px ${accentColor}33`
                : isHovered
                  ? "0 4px 12px rgba(0,0,0,0.15)"
                  : "none",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{mode.icon}</div>
            <div style={{
              fontSize: "0.85rem",
              fontWeight: isActive ? 700 : 600,
              color: isActive ? accentColor : isHovered ? "var(--text)" : "var(--text)",
              marginBottom: 4,
            }}>
              {mode.label}
            </div>
            <div style={{
              fontSize: "0.72rem",
              color: isActive || isHovered ? "var(--text-muted)" : "var(--text-muted)",
              lineHeight: 1.4,
              opacity: isActive || isHovered ? 1 : 0.7,
            }}>
              {mode.description}
            </div>
            {isActive && (
              <div style={{
                marginTop: 6,
                height: 3,
                borderRadius: 2,
                background: accentColor,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
