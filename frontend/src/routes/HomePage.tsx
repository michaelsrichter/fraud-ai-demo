import { Link } from "react-router-dom";

const scenarios = [
  {
    path: "/labs/expenses",
    title: "Expense Fraud Detection",
    status: "Active",
    statusColor: "var(--band-low)",
    icon: "💰",
    description: "Generate synthetic expense datasets, inject fraud patterns (threshold gaming, vendor anomaly, unusual frequency), score with ML.NET anomaly detection, and investigate flagged cases with AI agents via Microsoft Foundry.",
    features: ["ML.NET RandomizedPCA", "3 fraud patterns", "AI investigation with GPT-5.4", "Consensus mode", "Feature explanations"],
  },
  {
    path: "/labs/insurance",
    title: "Insurance Claim Fraud",
    status: "Coming Soon",
    statusColor: "var(--band-medium)",
    icon: "🏥",
    description: "Detect fraudulent insurance claims using anomaly patterns: inflated damage estimates, suspicious claim timing, phantom injuries, and staged accidents. Same ML + AI investigation pipeline.",
    features: ["Claim anomaly detection", "Provider network analysis", "Timeline pattern matching", "AI claim review"],
  },
  {
    path: "/labs/payments",
    title: "Payment Fraud Detection",
    status: "Coming Soon",
    statusColor: "var(--band-medium)",
    icon: "💳",
    description: "Classic credit card fraud detection: unusual transaction amounts, geographic anomalies, velocity checks, and merchant category deviations. Real-time scoring with AI-assisted investigation.",
    features: ["Transaction velocity", "Geo-anomaly detection", "Merchant category analysis", "Real-time scoring"],
  },
];

export function HomePage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: "2rem", margin: "24px 0 8px" }}>🔍 AI Fraud Lab</h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", maxWidth: 600, margin: "0 auto" }}>
          Explore how deterministic ML detection and AI-powered investigation work together
          to identify fraud across different domains. Each lab generates synthetic data so you
          can experiment safely.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {scenarios.map((s) => (
          <Link key={s.path} to={s.path} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="panel" style={{ height: "100%", transition: "transform 0.15s", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                <span style={{ fontSize: "2rem" }}>{s.icon}</span>
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: s.status === "Active" ? "var(--badge-low-bg)" : "var(--badge-medium-bg)",
                  color: s.status === "Active" ? "var(--badge-low-fg)" : "var(--badge-medium-fg)",
                }}>
                  {s.status}
                </span>
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>{s.title}</h2>
              <p className="muted" style={{ marginBottom: 12 }}>{s.description}</p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {s.features.map((f) => (
                  <span key={f} style={{
                    fontSize: "0.7rem",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--bg-hover)",
                    color: "var(--text-muted)",
                  }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 32, textAlign: "center" }}>
        <h2>How It Works</h2>
        <p className="muted">
          Each lab uses the same pattern: generate synthetic data → score with ML.NET anomaly detection →
          investigate flagged cases with AI agents (GPT-5.4, GPT-5.3, GPT-5.4-mini) via Microsoft Foundry.
          You can contrast ML and AI approaches, run consensus investigations across all models, and
          tune parameters to see how fraud signals change.
        </p>
        <Link to="/how-it-works">
          <button className="secondary" style={{ marginTop: 8 }}>Learn more →</button>
        </Link>
      </div>
    </div>
  );
}
