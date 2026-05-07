import { useEffect, useState } from "react";

interface ProfileRow {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  createdAt: string;
  lastSeenUtc: string;
  expenseLabRuns: number;
  insuranceLabRuns: number;
  paymentLabRuns: number;
  aiInvestigations: number;
}

export function AdminRoute() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profiles")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setProfiles(data.profiles ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalRuns = profiles.reduce((s, p) => s + p.expenseLabRuns + p.insuranceLabRuns + p.paymentLabRuns, 0);
  const totalInvestigations = profiles.reduce((s, p) => s + p.aiInvestigations, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>Admin Dashboard</h1>
      <p className="help">
        User profiles and activity tracking. This page requires the "admin" role via
        Azure Static Web Apps built-in authentication.
      </p>

      {loading && <p className="muted">Loading profiles…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div className="panel" style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{profiles.length}</div>
              <div className="muted">Users</div>
            </div>
            <div className="panel" style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{totalRuns}</div>
              <div className="muted">Total Runs</div>
            </div>
            <div className="panel" style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{totalInvestigations}</div>
              <div className="muted">AI Investigations</div>
            </div>
          </div>

          <div className="panel">
            <h2>User Profiles</h2>
            <table className="feature-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Expense Runs</th>
                  <th>Insurance</th>
                  <th>Payments</th>
                  <th>AI Inv.</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 && (
                  <tr><td colSpan={9} className="muted" style={{ textAlign: "center" }}>No profiles yet</td></tr>
                )}
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name || "—"}</strong></td>
                    <td>{p.role || "—"}</td>
                    <td>{p.company || "—"}</td>
                    <td>{p.location || "—"}</td>
                    <td>{p.expenseLabRuns}</td>
                    <td>{p.insuranceLabRuns}</td>
                    <td>{p.paymentLabRuns}</td>
                    <td>{p.aiInvestigations}</td>
                    <td className="muted" style={{ fontSize: "0.75rem" }}>
                      {p.lastSeenUtc ? new Date(p.lastSeenUtc).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
