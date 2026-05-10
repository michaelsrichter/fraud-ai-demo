import { Link } from "react-router-dom";
import stats from "../generated/stats.json";

const features = [
  {
    icon: "🤖",
    title: "Multiple ML Scoring Models",
    description: "Three ML.NET models — Randomized PCA, SDCA Logistic Regression, and Fast Forest — score independently on the same dataset. Compare how different algorithms flag the same records.",
    tags: ["ML.NET", "Randomized PCA", "SDCA", "Fast Forest"],
  },
  {
    icon: "🧠",
    title: "Multiple LLMs",
    description: "Choose from multiple Microsoft Foundry models at investigation time. Compare how GPT-5.4, GPT-5.3, and other models reason about the same fraud case.",
    tags: ["Microsoft Foundry", "GPT-5.4", "GPT-5.3", "Model Selection"],
  },
  {
    icon: "🔍",
    title: "AI Investigation Modes",
    description: "Four agent modes: Single Agent, Consensus (multi-model vote), Debate (adversarial agents + arbiter), and Junior → Senior (escalation pipeline).",
    tags: ["Single Agent", "Consensus", "Debate", "Junior → Senior"],
  },
  {
    icon: "🛠️",
    title: "Agents with Tools",
    description: "AI agents use structured tools — employee history lookup, expense data queries, vendor analysis, and pattern matching — to investigate cases with real data access.",
    tags: ["Tool-augmented", "Structured Output", "Microsoft Agent Framework"],
  },
  {
    icon: "📊",
    title: "Synthetic Data Generation",
    description: "Log-normal expense distributions, 2-5% legitimate outliers, three fraud patterns (threshold gaming, unusual frequency, vendor anomaly) with configurable intensity.",
    tags: ["Log-normal", "3 Fraud Patterns", "Configurable", "Seeded"],
  },
  {
    icon: "📈",
    title: "Interactive Visualizations",
    description: "Four chart types via tabbed navigation — scatter plots, band distribution, amount histograms, and feature contribution heatmaps — with per-model switching.",
    tags: ["Recharts", "Heatmap", "Histogram", "Model Selector"],
  },
  {
    icon: "☁️",
    title: "Cloud-Native Architecture",
    description: "Azure Functions (isolated worker), Azure Static Web Apps, Azure Blob/Table Storage, Azure AI Foundry. Infrastructure-as-Code with Bicep. One-command deploy via azd.",
    tags: [".NET 10", "React", "Bicep", "azd up"],
  },
  {
    icon: "✨",
    title: "Vibe Coded",
    description: "Built entirely with agentic coding — GitHub Copilot with Claude Opus, guided by Spec Kit for structured spec → plan → tasks → implementation workflows.",
    tags: ["GitHub Copilot", "Claude Opus", "Spec Kit", "Agentic Coding"],
  },
];

const frameworks = [
  { name: ".NET 10", role: "Backend runtime" },
  { name: "Azure Functions", role: "Serverless API" },
  { name: "ML.NET 4.0", role: "Anomaly detection" },
  { name: "Microsoft Agent Framework", role: "AI orchestration" },
  { name: "React 19", role: "Frontend UI" },
  { name: "Vite", role: "Build tool" },
  { name: "TanStack Query", role: "Data fetching" },
  { name: "Recharts", role: "Visualizations" },
  { name: "Zod", role: "Schema validation" },
  { name: "Bicep", role: "Infrastructure-as-Code" },
  { name: "xUnit + NSubstitute", role: "Backend testing" },
  { name: "Vitest + Testing Library", role: "Frontend testing" },
];

export function HomePage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
        <h1 style={{ fontSize: "2.4rem", margin: "0 0 12px", lineHeight: 1.2 }}>
          🔍 AI Fraud Detection Demo
        </h1>
        <p style={{ fontSize: "1.15rem", color: "var(--text-muted)", maxWidth: 700, margin: "0 auto 24px" }}>
          Explore how deterministic ML scoring and AI-powered investigation work together to detect
          expense fraud. Generate synthetic data, compare scoring models, and investigate flagged
          cases with multi-modal AI agents.
        </p>
        <Link to="/labs/expenses">
          <button style={{ padding: "14px 32px", fontSize: "1.1rem", fontWeight: 600 }}>
            ⚡ Launch Expense Fraud Lab
          </button>
        </Link>
      </div>

      {/* Feature Grid */}
      <h2 style={{ textAlign: "center", margin: "32px 0 16px", fontSize: "1.4rem" }}>Capabilities</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {features.map((f) => (
          <div key={f.title} className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{f.icon}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>{f.title}</h3>
            <p className="muted" style={{ fontSize: "0.85rem", flex: 1 }}>{f.description}</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
              {f.tags.map((t) => (
                <span key={t} style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: 4, background: "var(--bg-hover)", color: "var(--text-muted)" }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="panel" style={{ marginTop: 32 }}>
        <h2 style={{ textAlign: "center", margin: "0 0 16px", fontSize: "1.2rem" }}>Project Stats</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, textAlign: "center" }}>
          <StatBox label="Days of Development" value={String(stats.daysSinceFirstCommit)} />
          <StatBox label="Commits" value={String(stats.totalCommits)} />
          <StatBox label="Lines of Code" value={stats.linesOfCode.toLocaleString()} />
          <StatBox label="Unit Tests" value={String(stats.totalTests)} />
          <StatBox label="Feature Specs" value={String(stats.specCount)} />
          <StatBox label="Backend (C#)" value={`${stats.backendLoc.toLocaleString()} LOC`} />
          <StatBox label="Frontend (TS)" value={`${stats.frontendLoc.toLocaleString()} LOC`} />
          <StatBox label="Backend Tests" value={`${stats.backendTests} xUnit`} />
          <StatBox label="Frontend Tests" value={`${stats.frontendTests} Vitest`} />
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 8, fontSize: "0.72rem" }}>
          Stats auto-generated at build time · First commit: {stats.firstCommitDate}
        </p>
      </div>

      {/* Frameworks */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ textAlign: "center", margin: "0 0 12px", fontSize: "1.2rem" }}>Built With</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
          {frameworks.map((fw) => (
            <div key={fw.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderRadius: 4, background: "var(--bg)" }}>
              <span style={{ fontWeight: 500, fontSize: "0.82rem" }}>{fw.name}</span>
              <span className="muted" style={{ fontSize: "0.72rem" }}>{fw.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 16 }}>
        <div className="panel">
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>About the Developer</h2>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            <strong>Mike Richter</strong> — Principal Partner Solution Architect at Microsoft.
            This project demonstrates how modern AI-powered fraud detection systems can be rapidly
            prototyped using agentic coding workflows, Azure AI services, and open-source ML libraries.
          </p>
        </div>
        <div className="panel">
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>Open Source</h2>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            This project is open source under the <strong>MIT License</strong> — the most permissive
            open-source license. Fork it, modify it, use it commercially. Contributions welcome.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <a href="https://github.com/michaelsrichter/fraud-ai-demo" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: 4, background: "var(--bg)", textDecoration: "none", color: "var(--text)" }}>
              📦 GitHub Repo
            </a>
            <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: 4, background: "var(--bg)", textDecoration: "none", color: "var(--text)" }}>
              📄 MIT License
            </a>
            <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: 4, background: "var(--bg)", textDecoration: "none", color: "var(--text)" }}>
              🤝 Code of Conduct
            </a>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="muted" style={{ textAlign: "center", marginTop: 24, fontSize: "0.75rem" }}>
        All data is synthetic — no real transactions or individuals are represented.
        This is a demonstration project, not a production fraud detection system.
      </p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
