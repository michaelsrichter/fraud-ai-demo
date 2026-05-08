import { useState } from "react";

interface Props {
  labName: string;
}

export function HowItWorksPanel({ labName }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (labName !== "expenses") return null;

  return (
    <div className="panel">
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 style={{ margin: 0 }}>How It Works</h2>
        <span style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>{isOpen ? "▾" : "▸"}</span>
      </div>
      {isOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 6px" }}>Overview</h3>
            <p className="help" style={{ margin: 0 }}>
              This lab contrasts two approaches to fraud detection on synthetic expense data:
              (1) <strong>Deterministic ML detection</strong> via ML.NET's RandomizedPCA, and
              (2) <strong>AI agent investigation</strong> via GPT models through Microsoft Foundry.
              Neither system has access to the ground-truth fraud labels during inference.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 6px" }}>Step 1: Synthetic Data Generation</h3>
            <p className="help" style={{ margin: "0 0 8px" }}>
              The <strong>FraudInjector</strong> generates expense records assigned to synthetic employees.
              A configurable fraction (<em>intensity</em>) of records have fraud injected using three patterns:
            </p>
            <table className="feature-table">
              <thead><tr><th>Pattern</th><th>What It Does</th><th>Real-World Analog</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Threshold Gaming</strong></td>
                  <td>Amounts cluster within $50 of the $1,000 auto-approval threshold</td>
                  <td>Splitting expenses to avoid manager review</td>
                </tr>
                <tr>
                  <td><strong>Unusual Frequency</strong></td>
                  <td>Submissions on weekends and late at night</td>
                  <td>After-hours fabrication</td>
                </tr>
                <tr>
                  <td><strong>Vendor Anomaly</strong></td>
                  <td>Payments to shell-company vendors</td>
                  <td>Kickback schemes with fictitious suppliers</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 6px" }}>Step 2: ML.NET Anomaly Detection</h3>
            <p className="help" style={{ margin: "0 0 8px" }}>
              <strong>RandomizedPCA</strong> (unsupervised) learns "normal" from the population distribution.
              Each record is transformed into a 6-feature vector:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 4, fontSize: "0.78rem" }}>
              <span><strong>amountZ</strong> — expense amount z-score</span>
              <span><strong>thresholdGap</strong> — within $50 of $1,000?</span>
              <span><strong>frequencyZ</strong> — submission count z-score</span>
              <span><strong>vendorRarity</strong> — -log(vendor frequency)</span>
              <span><strong>categoryDeviation</strong> — atypical category?</span>
              <span><strong>weekendSubmission</strong> — submitted on weekend?</span>
            </div>
            <p className="help" style={{ margin: "8px 0 0" }}>
              Scores are calibrated to [0,1] and bucketed: <span style={{color: "var(--band-high)"}}>High</span> &gt; 0.85,
              <span style={{color: "var(--band-medium)"}}> Medium</span> 0.55–0.85,
              <span style={{color: "var(--band-low)"}}> Low</span> &lt; 0.55.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 6px" }}>Step 3: AI Agent Investigation</h3>
            <p className="help" style={{ margin: "0 0 8px" }}>
              When you investigate a case, the system sends a structured prompt (employee profile, 90-day
              history, peer comparison, feature z-scores) to an AI model. The agent is instructed to be
              <strong> bold and decisive</strong> — favoring a clear "Likely" or "Unlikely" verdict because
              the AI is specifically consulted on cases where the ML model was inconclusive. In{" "}
              <strong>Consensus mode</strong>, all 3 models run simultaneously, then a senior arbiter model
              analyzes the differences and makes a final call.
            </p>
            <p className="help" style={{ margin: "4px 0 0", fontSize: "0.75rem" }}>
              <strong>Decision framework:</strong> "Likely" if any strong fraud signal is present;
              "Unlikely" if no indicators are found; "Inconclusive" only as a rare last resort
              when signals are truly balanced in both directions.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", margin: "0 0 6px" }}>ML vs. AI Comparison</h3>
            <table className="feature-table">
              <thead><tr><th>Aspect</th><th>ML.NET</th><th>AI Agent</th></tr></thead>
              <tbody>
                <tr><td>Speed</td><td>&lt; 1s for 5,000 records</td><td>5–15s per case</td></tr>
                <tr><td>Coverage</td><td>All records automatically</td><td>On-demand per case</td></tr>
                <tr><td>Consistency</td><td>100% deterministic</td><td>Non-deterministic</td></tr>
                <tr><td>Explainability</td><td>Feature z-scores</td><td>Natural language rationale</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
