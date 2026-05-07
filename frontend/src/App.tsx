import { Navigate, Route, Routes } from "react-router-dom";
import { RunsRoute } from "./routes/RunsRoute";
import { RunDetailRoute } from "./routes/RunDetailRoute";
import { CaseDetailRoute } from "./routes/CaseDetailRoute";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/runs" replace />} />
      <Route path="/runs" element={<RunsRoute />} />
      <Route path="/runs/:runId" element={<RunDetailRoute />} />
      <Route path="/runs/:runId/cases/:caseId" element={<CaseDetailRoute />} />
    </Routes>
  );
}
