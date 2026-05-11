import { useState, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RunsRoute } from "./routes/RunsRoute";
import { RunDetailRoute } from "./routes/RunDetailRoute";
import { CaseDetailRoute } from "./routes/CaseDetailRoute";
import { HomePage } from "./routes/HomePage";
import { AdminRoute } from "./routes/AdminRoute";
import { BuildStoryRoute } from "./routes/BuildStoryRoute";
import { TopNav } from "./components/TopNav";
import { CreateProfileForm } from "./components/CreateProfileForm";
import { Footer } from "./components/Footer";
import { getProfile, type UserProfile } from "./lib/userProfile";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

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

  const handleProfileCreated = (p: UserProfile) => {
    setProfile(p);
    // Sync profile to server
    fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    }).catch(() => { /* best-effort */ });
  };

  return (
    <>
      <ScrollToTop />
      <TopNav profile={profile} />
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Expenses lab */}
        <Route path="/labs/expenses" element={
          <LabGuard profile={profile} onProfileCreated={handleProfileCreated}>
            <RunsRoute />
          </LabGuard>
        } />
        <Route path="/labs/expenses/:runId" element={
          <LabGuard profile={profile} onProfileCreated={handleProfileCreated}>
            <RunDetailRoute />
          </LabGuard>
        } />
        <Route path="/labs/expenses/:runId/cases/:caseId" element={
          <LabGuard profile={profile} onProfileCreated={handleProfileCreated}>
            <CaseDetailRoute />
          </LabGuard>
        } />

        {/* Backward compat redirects */}
        <Route path="/runs" element={<Navigate to="/labs/expenses" replace />} />
        <Route path="/runs/:runId" element={<Navigate to="/labs/expenses" replace />} />

        {/* Info pages — redirect old how-it-works to expenses lab */}
        <Route path="/how-it-works" element={<Navigate to="/labs/expenses" replace />} />

        {/* Story */}
        <Route path="/story" element={<BuildStoryRoute />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
      <Footer />
    </>
  );
}
