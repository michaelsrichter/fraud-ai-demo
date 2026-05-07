import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";

export function HowItWorksRoute() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <ThemeToggle />
      <Link to="/runs">&larr; Back to demo</Link>
      <h1 style={{ margin: "16px 0" }}>How the Fraud Detection Pipeline Works</h1>

      <div className="panel">
        <h2>Overview</h2>
        <p>
          This demo contrasts two approaches to fraud detection on synthetic expense data:
        </p>
        <ol style={{ lineHeight: 2 }}>
          <li><strong>Deterministic ML detection</strong> — ML.NET's RandomizedPCA anomaly detector scores every record.</li>
          <li><strong>AI agent investigation</strong> — A GPT model via Microsoft Foundry produces a structured verdict with rationale.</li>
        </ol>
        <p className="help">
          Neither system has access to the ground-truth fraud labels during inference. The ML model
          learns from the statistical distribution of the data; the AI agent reasons from the
          case context provided in the prompt.
        </p>
      </div>

      <div className="panel">
        <h2>Step 1: Synthetic Data Generation</h2>
        <p>
          The <strong>FraudInjector</strong> generates a dataset of expense records assigned to
          synthetic employees. A configurable fraction (<em>intensity</em>) of records have fraud
          injected using three distinct patterns:
        </p>
        <table className="feature-table">
          <thead>
            <tr><th>Pattern</th><th>What It Does</th><th>Real-World Analog</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Threshold Gaming</strong></td>
              <td>Amounts cluster within $50 of the $1,000 auto-approval threshold</td>
              <td>Employees splitting expenses to avoid manager review</td>
            </tr>
            <tr>
              <td><strong>Unusual Frequency</strong></td>
              <td>Submissions on weekends and late at night</td>
              <td>After-hours fabrication when oversight is minimal</td>
            </tr>
            <tr>
              <td><strong>Vendor Anomaly</strong></td>
              <td>Payments to shell-company vendors (OffshoreLLC, QuickCash, ShellCorp, etc.)</td>
              <td>Kickback schemes with fictitious suppliers</td>
            </tr>
          </tbody>
        </table>
        <p className="help">
          The three pattern weights are configurable and auto-normalize to sum to 1.0. The demo's
          "Low" preset uses 5% intensity (subtle); "High" presets use 25% (dramatic).
        </p>
      </div>

      <div className="panel">
        <h2>Step 2: ML.NET Anomaly Detection</h2>
        <h2 style={{ fontSize: "0.95rem" }}>Why RandomizedPCA?</h2>
        <p>
          We use <strong>ML.NET's RandomizedPCA (Principal Component Analysis) trainer</strong> for
          unsupervised anomaly detection. This algorithm was chosen because:
        </p>
        <ul>
          <li><strong>No labeled training data needed</strong> — it learns what "normal" looks like from the population distribution alone.</li>
          <li><strong>Fast</strong> — fits and scores 5,000 records in under 1 second.</li>
          <li><strong>Interpretable</strong> — anomaly scores correlate with distance from the learned normal subspace, making high scores explainable.</li>
          <li><strong>GA library</strong> — ML.NET is a production-grade, GA Microsoft library (Constitution principle XII).</li>
        </ul>

        <h2 style={{ fontSize: "0.95rem" }}>The 6-Feature Vector</h2>
        <p>Each expense record is transformed into a 6-dimensional feature vector:</p>
        <table className="feature-table">
          <thead>
            <tr><th>Feature</th><th>Type</th><th>What It Captures</th></tr>
          </thead>
          <tbody>
            <tr><td>amountZ</td><td>Continuous</td><td>Z-score of the expense amount vs. population mean</td></tr>
            <tr><td>amountVsThresholdGap</td><td>Binary (0/1)</td><td>1 if amount is within $50 of the $1,000 policy threshold</td></tr>
            <tr><td>frequencyZ</td><td>Continuous</td><td>Z-score of this employee's submission count vs. average</td></tr>
            <tr><td>vendorRarity</td><td>Continuous</td><td>-log(vendor frequency) — higher = rarer vendor</td></tr>
            <tr><td>categoryDeviation</td><td>Binary (0/1)</td><td>1 if expense category is atypical for this employee</td></tr>
            <tr><td>weekendSubmission</td><td>Binary (0/1)</td><td>1 if submitted on Saturday or Sunday</td></tr>
          </tbody>
        </table>

        <h2 style={{ fontSize: "0.95rem" }}>Scoring & Calibration</h2>
        <p>
          RandomizedPCA projects each record onto a low-rank subspace (rank ≤ 4) and measures
          reconstruction error. Raw scores are calibrated into a [0, 1] confidence using a
          logistic squash: <code>1 / (1 + exp(-6 × (normalized - 0.5)))</code>. This ensures
          the score distribution has meaningful separation between normal and anomalous records.
        </p>

        <h2 style={{ fontSize: "0.95rem" }}>Band Assignment</h2>
        <p>
          Calibrated confidence scores are bucketed into three bands using configurable thresholds
          (default: Low &lt; 0.55, Medium 0.55–0.85, High &gt; 0.85):
        </p>
        <ul>
          <li><span style={{color: "var(--band-high)"}}>High</span> — Strong fraud signal. Very likely anomalous.</li>
          <li><span style={{color: "var(--band-medium)"}}>Medium</span> — Ambiguous signals. Best candidates for AI investigation.</li>
          <li><span style={{color: "var(--band-low)"}}>Low</span> — Likely legitimate. Within normal behavioral patterns.</li>
        </ul>
      </div>

      <div className="panel">
        <h2>Step 3: AI Agent Investigation</h2>
        <p>
          When you click "Investigate with AI," the system constructs a structured 5-section prompt
          containing:
        </p>
        <ol>
          <li><strong>Case under review</strong> — expense amount, vendor, category, detection score, contributing features</li>
          <li><strong>Employee profile</strong> — name, department, role, baseline spend, historical mean/std</li>
          <li><strong>90-day history</strong> — recent submission count, total amount, distinct vendors, top prior scores</li>
          <li><strong>Peer comparison</strong> — median, P75, P95 amounts in the same department × category cohort</li>
          <li><strong>Run context</strong> — dataset size, intensity, band distribution</li>
        </ol>
        <p className="help">
          The AI agent <strong>never receives ground-truth labels</strong> (IsInjectedFraud, InjectedPattern).
          It must reason from the same signals a human investigator would see. You can preview the
          exact prompt sent by clicking "Preview AI prompt" on any case.
        </p>

        <h2 style={{ fontSize: "0.95rem" }}>Decision Framework</h2>
        <p>The AI follows a structured decision framework:</p>
        <ul>
          <li><strong>Likely</strong> — confidence ≥ 0.85 AND at least one strong fraud signal (anomalous vendor, threshold gaming, weekend submission, category deviation)</li>
          <li><strong>Inconclusive</strong> — confidence 0.55–0.85 with mixed or weak signals</li>
          <li><strong>Unlikely</strong> — confidence &lt; 0.55 or no fraud indicators present</li>
        </ul>
      </div>

      <div className="panel">
        <h2>Comparing ML vs. AI</h2>
        <table className="feature-table">
          <thead>
            <tr><th>Aspect</th><th>ML.NET (Deterministic)</th><th>AI Agent (GPT)</th></tr>
          </thead>
          <tbody>
            <tr><td>Speed</td><td>&lt; 1 second for 5,000 records</td><td>5–15 seconds per case</td></tr>
            <tr><td>Cost</td><td>Zero (runs locally)</td><td>~$0.004–$0.013 per call</td></tr>
            <tr><td>Explainability</td><td>Feature z-scores + magnitude bars</td><td>Natural language rationale</td></tr>
            <tr><td>Coverage</td><td>Scores every record automatically</td><td>On-demand, case-by-case</td></tr>
            <tr><td>Consistency</td><td>100% deterministic (same seed = same result)</td><td>Non-deterministic (may vary between calls)</td></tr>
            <tr><td>Best for</td><td>Bulk screening, triage</td><td>Detailed investigation of flagged cases</td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Architecture</h2>
        <p className="muted">
          Backend: .NET 10 Azure Functions (isolated worker) · ML.NET 4.0 RandomizedPCA ·
          Microsoft.Agents.AI 1.0 ChatClientAgent · Azure Storage (gzip JSON blobs + Table index) ·
          VNet-integrated with private endpoints · Managed Identity only
        </p>
        <p className="muted">
          Frontend: React 18 + Vite + TypeScript + TanStack Query + Recharts + Zod ·
          Deployed as Azure Static Web App with linked Function App backend
        </p>
      </div>
    </div>
  );
}
