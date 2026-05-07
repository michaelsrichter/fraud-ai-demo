import { useState } from "react";
import { createProfile, type UserProfile } from "../lib/userProfile";

interface Props {
  onProfileCreated: (profile: UserProfile) => void;
}

export function CreateProfileForm({ onProfileCreated }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const profile = createProfile({ name: name.trim(), role: role.trim(), company: company.trim(), location: location.trim() });
    onProfileCreated(profile);
  };

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 24 }}>
      <div className="panel">
        <h1>Welcome to AI Fraud Lab</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Create a profile to access the fraud investigation labs. Your profile is stored
          locally in your browser — no sign-in required.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
            {error && <span className="error">{error}</span>}
          </div>
          <div className="field">
            <label>Role</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Fraud Analyst, Data Scientist" />
          </div>
          <div className="field">
            <label>Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your organization" />
          </div>
          <div className="field">
            <label>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Seattle, WA" />
          </div>
          <button type="submit" style={{ marginTop: 8, width: "100%" }}>Enter the Lab</button>
        </form>
      </div>
    </div>
  );
}
