import { Link } from "react-router-dom";

interface Props {
  title: string;
  icon: string;
  description: string;
}

export function ComingSoonLab({ title, icon, description }: Props) {
  return (
    <div style={{ maxWidth: 600, margin: "60px auto", padding: 24, textAlign: "center" }}>
      <div className="panel">
        <span style={{ fontSize: "3rem" }}>{icon}</span>
        <h1 style={{ margin: "16px 0 8px" }}>{title}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>{description}</p>
        <span className="badge badge-medium" style={{ fontSize: "0.85rem", padding: "4px 12px" }}>Coming Soon</span>
        <p className="help" style={{ marginTop: 16 }}>
          This lab is under development. It will follow the same ML + AI investigation pattern
          as the Expense Fraud lab — synthetic data generation, anomaly scoring, and AI-powered
          case investigation with model selection.
        </p>
        <Link to="/">
          <button className="secondary" style={{ marginTop: 12 }}>← Back to Home</button>
        </Link>
      </div>
    </div>
  );
}
