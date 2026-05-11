import { Link } from "react-router-dom";
import stats from "../generated/stats.json";

interface TimelinePhase {
  day: string;
  date: string;
  spec: string;
  title: string;
  icon: string;
  summary: string;
  highlights: string[];
  color: string;
}

const phases: TimelinePhase[] = [
  {
    day: "Day 1",
    date: "May 6–7",
    spec: "Spec 001",
    title: "From Zero to Fraud Detection",
    icon: "🚀",
    summary:
      "Started with a blank repository and a plain-language description. The AI coding agent built a complete expense fraud detection system — synthetic data generation, ML-based anomaly scoring, AI-powered investigation with structured verdicts, and a full React UI.",
    highlights: [
      "Synthetic data generation with 3 fraud patterns (threshold gaming, unusual frequency, vendor anomaly)",
      "ML.NET Randomized PCA anomaly detection with confidence banding (high / medium / low)",
      "AI investigator via Microsoft Foundry producing structured verdicts with reasoning",
      "Consensus mode: 3 LLMs investigate simultaneously, arbiter synthesizes final verdict",
      "Full React + TypeScript frontend with case lists, scatter plots, and drill-down",
      "Azure Functions backend with Azure Storage persistence",
    ],
    color: "var(--band-low)",
  },
  {
    day: "Day 2",
    date: "May 7",
    spec: "Spec 002",
    title: "Platform & User Management",
    icon: "🏗️",
    summary:
      "The single-page demo evolved into a multi-lab platform with user profiles, admin analytics, and session tracking. The architecture was designed to support multiple fraud domains using the same ML + AI investigation pattern.",
    highlights: [
      "Multi-lab homepage with scenario cards (Expenses active; Insurance & Payments as future labs)",
      "User profiles with localStorage persistence and server-side sync",
      "Admin dashboard with user counts, run metrics, and activity tracking",
      "Microsoft Clarity integration for session recording and heatmaps",
      "Azure Static Web Apps built-in GitHub authentication for admin access",
    ],
    color: "var(--band-medium)",
  },
  {
    day: "Day 3",
    date: "May 8",
    spec: "Specs 003 + 004",
    title: "Agent Tools & Investigation Modes",
    icon: "🧠",
    summary:
      "The most ambitious day — two full feature specs. AI agents gained real tools (data queries and a Python code interpreter), and four distinct investigation modes were built to demonstrate different reasoning strategies.",
    highlights: [
      "Data retrieval tool: agents autonomously query the full dataset during investigation",
      "Python Code Interpreter via Microsoft Foundry's MCP Toolbox for quantitative analysis",
      "Real-time SSE streaming showing the agent's tool calls as they happen",
      "Debate mode: two opposing agents (fraud-leaning vs. legitimacy-leaning) argue before an arbiter",
      "Junior → Senior mode: cost-optimized escalation pipeline mirroring real triage workflows",
      "Prompt transparency: every agent's instructions visible in the UI",
    ],
    color: "var(--band-high)",
  },
  {
    day: "Day 4",
    date: "May 9–10",
    spec: "Spec 005",
    title: "ML Model Depth & Visualization",
    icon: "📊",
    summary:
      "Added analytical depth with multiple ML scoring models, interactive visualizations, and more realistic synthetic data generation. Investigators can now compare how different algorithms flag the same records.",
    highlights: [
      "Three ML models: Randomized PCA, SDCA Logistic Regression, Fast Forest",
      "Tunable model parameters (PCA rank, regularization, tree count) exposed in the UI",
      "Four chart types: scatter plot, band distribution, amount histogram, feature heatmap",
      "Log-normal data distributions with 2–5% legitimate outliers for realism",
      "Per-model switching on every visualization for side-by-side comparison",
      "Comprehensive ML model documentation explaining each algorithm's strengths and trade-offs",
    ],
    color: "var(--link)",
  },
];

const processSteps = [
  {
    step: "1",
    title: "Specify",
    description:
      "Describe what you want in plain language. The AI asks clarifying questions, probes for edge cases, and produces a formal specification with user stories and acceptance criteria.",
  },
  {
    step: "2",
    title: "Plan",
    description:
      "The specification feeds into an implementation plan — architecture decisions, data models, API contracts. A constitution check validates every decision against the project's principles.",
  },
  {
    step: "3",
    title: "Generate Tasks",
    description:
      "The plan is decomposed into dependency-ordered tasks. Each task names exact file paths, specifies what to build, and includes testing requirements.",
  },
  {
    step: "4",
    title: "Implement",
    description:
      "The AI coding agent executes each task — creating files, writing code, running tests, fixing errors. It reads its own specifications and follows its own plan.",
  },
];

const domainExamples = [
  {
    icon: "🏥",
    domain: "Insurance Claims",
    description:
      "Pattern detection across claim histories, provider networks, and policy timelines. AI agents that cross-reference medical codes, review claimant histories, and flag coordinated schemes.",
  },
  {
    icon: "💳",
    domain: "Payment Fraud",
    description:
      "Real-time transaction scoring with multiple models, velocity analysis, geographic anomaly detection. AI investigation of flagged transactions with full account history access.",
  },
  {
    icon: "⚕️",
    domain: "Healthcare Fraud",
    description:
      "Provider billing pattern analysis, upcoding detection, phantom patient identification. Multiple ML models trained on different signal types with AI-powered case synthesis.",
  },
  {
    icon: "📋",
    domain: "Tax Fraud",
    description:
      "Return anomaly scoring, deduction pattern analysis, entity relationship mapping. AI agents that reason about complex corporate structures and financial flows.",
  },
];

export function BuildStoryRoute() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 64px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 24px" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8, letterSpacing: 1 }}>
          FOR FRAUD EXAMINERS & INVESTIGATORS
        </p>
        <h1 style={{ fontSize: "2.2rem", margin: "0 0 16px", lineHeight: 1.25 }}>
          How We Built an AI Fraud Detection App in 4 Days
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", maxWidth: 700, margin: "0 auto 24px", lineHeight: 1.7 }}>
          One person. Four days. A fully functional fraud detection platform with machine learning
          scoring, multi-model AI investigation, interactive visualizations, and cloud deployment —
          built entirely with agentic coding.
        </p>
      </div>

      {/* Context callout */}
      <div
        className="panel"
        style={{
          borderLeft: "4px solid var(--link)",
          marginBottom: 32,
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: "0.9rem" }}>
          <strong>A note on the use case:</strong> The expense fraud scenario in this demo is
          intentionally simplified. Real expense fraud is far more nuanced, and you know that
          better than anyone. But the point isn't the complexity of the use case — it's{" "}
          <strong>how fast a domain-specific fraud investigation tool can go from idea to working
          software</strong> when AI is writing the code.
        </p>
      </div>

      {/* Timeline */}
      <h2 style={{ fontSize: "1.5rem", margin: "40px 0 24px", textAlign: "center" }}>
        The Build Timeline
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {phases.map((phase) => (
          <div
            key={phase.spec}
            className="panel"
            style={{ borderLeft: `4px solid ${phase.color}`, position: "relative" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "1.8rem" }}>{phase.icon}</span>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "var(--bg-hover)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {phase.day} · {phase.date}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "var(--bg)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {phase.spec}
                  </span>
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: "1.15rem" }}>{phase.title}</h3>
              </div>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: "0 0 12px" }}>
              {phase.summary}
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                display: "grid",
                gap: 6,
              }}
            >
              {phase.highlights.map((h, i) => (
                <li
                  key={i}
                  style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}
                >
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* The Process */}
      <h2 style={{ fontSize: "1.5rem", margin: "48px 0 8px", textAlign: "center" }}>
        The Agentic Coding Process
      </h2>
      <p
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          maxWidth: 600,
          margin: "0 auto 24px",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
      >
        Every feature was built using Spec Kit — a structured workflow that guides AI coding agents
        through a disciplined spec → plan → tasks → implementation pipeline.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {processSteps.map((s) => (
          <div key={s.step} className="panel" style={{ textAlign: "center" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--btn-primary)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1rem",
                margin: "0 auto 10px",
              }}
            >
              {s.step}
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>{s.title}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.6, margin: 0 }}>
              {s.description}
            </p>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 24, borderLeft: "4px solid var(--band-medium)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Why This Matters</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 }}>
          The key insight is that <strong>the specifications are the product, not the code</strong>.
          The AI writes the code, but the human shapes the intent. Every feature started as a
          conversation — a clarifying question answered, a requirement refined, an edge case
          identified. This means a fraud examiner who understands investigation workflows can
          describe what they need, and the tooling to build it already exists. The bottleneck
          isn't programming skill — it's domain expertise. And that's something fraud professionals
          have in abundance.
        </p>
      </div>

      {/* Stats */}
      <h2 style={{ fontSize: "1.5rem", margin: "48px 0 16px", textAlign: "center" }}>
        By the Numbers
      </h2>
      <div className="panel">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 16,
            textAlign: "center",
          }}
        >
          <NumBox value="4" label="Days" />
          <NumBox value={String(stats.specCount)} label="Feature Specs" />
          <NumBox value={String(stats.totalCommits)} label="Commits" />
          <NumBox value={stats.linesOfCode.toLocaleString()} label="Lines of Code" />
          <NumBox value={String(stats.totalTests)} label="Unit Tests" />
          <NumBox value="3" label="ML Models" />
          <NumBox value="4" label="AI Investigation Modes" />
          <NumBox value="5" label="Azure Services" />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
            marginTop: 16,
          }}
        >
          <StatRow label="Backend (C#)" value={`${stats.backendLoc.toLocaleString()} lines`} />
          <StatRow label="Frontend (TypeScript)" value={`${stats.frontendLoc.toLocaleString()} lines`} />
          <StatRow label="Backend Tests" value={`${stats.backendTests} xUnit`} />
          <StatRow label="Frontend Tests" value={`${stats.frontendTests} Vitest`} />
          <StatRow label="Bicep IaC Modules" value="6 modules" />
          <StatRow label="System Prompts" value="7 prompts" />
        </div>
        <p className="muted" style={{ textAlign: "center", marginTop: 10, fontSize: "0.72rem" }}>
          Stats auto-generated at build time · First commit: {stats.firstCommitDate}
        </p>
      </div>

      {/* What This Means */}
      <h2 style={{ fontSize: "1.5rem", margin: "48px 0 8px", textAlign: "center" }}>
        What This Means for Fraud Professionals
      </h2>
      <p
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          maxWidth: 650,
          margin: "0 auto 24px",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
      >
        The expense use case is simple. The capability is not. Imagine these same patterns — multiple
        ML models, tool-augmented AI agents, adversarial reasoning, escalation pipelines — applied
        to your domain:
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {domainExamples.map((d) => (
          <div key={d.domain} className="panel">
            <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>{d.icon}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: "0.95rem" }}>{d.domain}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.6, margin: 0 }}>
              {d.description}
            </p>
          </div>
        ))}
      </div>

      {/* Speed section */}
      <div className="panel" style={{ marginTop: 24, borderLeft: "4px solid var(--band-low)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>Speed Changes Everything</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: "0 0 12px" }}>
          Traditional software development for a custom fraud investigation tool might take months.
          This project compressed that into days. That speed means:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 4 }}>
            <strong>Rapid prototyping</strong> — Test a hypothesis about a fraud pattern by building
            a working detector in days, not quarters.
          </li>
          <li style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 4 }}>
            <strong>Domain-specific tooling</strong> — Instead of adapting generic software to your
            workflow, describe your workflow and get purpose-built tools.
          </li>
          <li style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 4 }}>
            <strong>Iterative refinement</strong> — Build version one, test with real investigators,
            iterate. Each cycle takes days, not months.
          </li>
        </ul>
      </div>

      {/* Closing */}
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: "1rem", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 20px" }}>
          The future of fraud investigation tooling isn't buying off-the-shelf software and hoping
          it fits. It's describing exactly what you need and watching it get built.
        </p>
        <Link to="/labs/expenses">
          <button style={{ padding: "14px 32px", fontSize: "1.05rem", fontWeight: 600 }}>
            ⚡ Try the Expense Fraud Lab
          </button>
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="muted" style={{ textAlign: "center", marginTop: 32, fontSize: "0.75rem" }}>
        All data is synthetic — no real transactions or individuals are represented.
        This is a demonstration of capabilities, not a production fraud detection system.
      </p>
    </div>
  );
}

function NumBox({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 8px",
        borderRadius: 4,
        background: "var(--bg)",
      }}
    >
      <span style={{ fontWeight: 500, fontSize: "0.8rem" }}>{label}</span>
      <span className="muted" style={{ fontSize: "0.75rem" }}>{value}</span>
    </div>
  );
}
