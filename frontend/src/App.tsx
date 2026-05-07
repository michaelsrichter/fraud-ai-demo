import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RunsRoute } from "./routes/RunsRoute";
import { RunDetailRoute } from "./routes/RunDetailRoute";
import { CaseDetailRoute } from "./routes/CaseDetailRoute";
import { HowItWorksRoute } from "./routes/HowItWorksRoute";
import { HomePage } from "./routes/HomePage";
import { ThemeToggle } from "./components/ThemeToggle";
import { TopNav } from "./components/TopNav";
import { ComingSoonLab } from "./components/ComingSoonLab";
import { CreateProfileForm } from "./components/CreateProfileForm";
import { getProfile, type UserProfile } from "./lib/userProfile";

function LabGuard({ children, profile, onProfileCreated }: {
  children: React.ReactNode;
  profile: UserProfile | null;
  onProfileCreated: (p: UserProfile) => void;
}) {
  if (!profile) return <CreateProfileForm onProfileCreated={onProfileCreated} />;
  return <>{children}</>;
}

export function App() {
  const [profile, setProfile] = useState<UserProfile | null>(getProfile());

  return (
    <>
      <TopNav profile={profile} />
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Expenses lab */}
        <Route path="/labs/expenses" element={
          <LabGuard profile={profile} onProfileCreated={setProfile}>
            <RunsRoute />
          </LabGuard>
        } />
        <Route path="/labs/expenses/:runId" element={
          <LabGuard profile={profile} onProfileCreated={setProfile}>
            <RunDetailRoute />
          </LabGuard>
        } />
        <Route path="/labs/expenses/:runId/cases/:caseId" element={
          <LabGuard profile={profile} onProfileCreated={setProfile}>
            <CaseDetailRoute />
          </LabGuard>
        } />

        {/* Backward compat redirects */}
        <Route path="/runs" element={<Navigate to="/labs/expenses" replace />} />
        <Route path="/runs/:runId" element={<Navigate to="/labs/expenses" replace />} />

        {/* Coming soon labs */}
        <Route path="/labs/insurance" element={
          <LabGuard profile={profile} onProfileCreated={setProfile}>
            <ComingSoonLab title="Insurance Claim Fraud" icon="🏥"
              description="Detect fraudulent insurance claims: inflated damage estimates, suspicious claim timing, phantom injuries, and staged accidents." />
          </LabGuard>
        } />
        <Route path="/labs/payments" element={
          <LabGuard profile={profile} onProfileCreated={setProfile}>
            <ComingSoonLab title="Payment Fraud Detection" icon="💳"
              description="Classic credit card fraud detection: unusual transaction amounts, geographic anomalies, velocity checks, and merchant category deviations." />
          </LabGuard>
        } />

        {/* Info pages */}
        <Route path="/how-it-works" element={<HowItWorksRoute />} />
      </Routes>
    </>
  );
}
