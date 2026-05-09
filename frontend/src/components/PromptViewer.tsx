import { useState } from "react";

interface PromptSection {
  label: string;
  content: string;
}

interface Props {
  sections: PromptSection[];
}

export function PromptViewer({ sections }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (sections.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="secondary"
        style={{ fontSize: "0.8rem" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "Hide prompts" : "View agent prompts"}
      </button>

      {isOpen && (
        <div style={{
          marginTop: 8,
          background: "var(--bg)",
          borderRadius: 6,
          padding: 12,
          maxHeight: 500,
          overflow: "auto",
        }}>
          {sections.map((section, i) => (
            <div key={i} style={{ marginBottom: i < sections.length - 1 ? 16 : 0 }}>
              <h4 style={{
                fontSize: "0.8rem",
                margin: "0 0 6px",
                color: section.label.toLowerCase().includes("bias") || section.label.toLowerCase().includes("advocate")
                  ? "var(--band-medium)"
                  : section.label.toLowerCase().includes("arbiter") || section.label.toLowerCase().includes("judge")
                    ? "var(--btn-primary)"
                    : "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: section.label.toLowerCase().includes("bias") || section.label.toLowerCase().includes("advocate")
                    ? "var(--band-medium)"
                    : section.label.toLowerCase().includes("arbiter") || section.label.toLowerCase().includes("judge")
                      ? "var(--btn-primary)"
                      : "var(--text-muted)",
                }} />
                {section.label}
              </h4>
              <pre style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.72rem",
                lineHeight: 1.5,
                color: "var(--text-muted)",
                margin: 0,
                padding: "8px 10px",
                background: "var(--bg-surface)",
                borderRadius: 4,
                border: "1px solid var(--border)",
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                maxHeight: 300,
                overflow: "auto",
              }}>
                {section.content.trim()}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
