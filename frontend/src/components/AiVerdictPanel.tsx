import { useState } from "react";
import type { AiInvestigationResult } from "../api/runsClient";
import type { InvestigationMode } from "../api/runsClient";
import { ModeTabBar } from "./ModeTabBar";
import { SingleAgentPanel } from "./SingleAgentPanel";
import { ConsensusPanel } from "./ConsensusPanel";
import { DebatePanel } from "./DebatePanel";
import { JuniorSeniorPanel } from "./JuniorSeniorPanel";

interface Props {
  investigation: AiInvestigationResult | null | undefined;
  isLoading: boolean;
  onInvestigate: (modelDeploymentName: string, temperature?: number, allowConfidenceScores?: boolean) => void;
  runId: string;
  caseId: string;
}

export function AiVerdictPanel({ investigation, isLoading, onInvestigate, runId, caseId }: Props) {
  const [activeMode, setActiveMode] = useState<InvestigationMode>("single");

  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: "1.5rem" }}>🤖</span>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>AI Investigation</h2>
          <p className="help" style={{ margin: "2px 0 0", fontSize: "0.78rem" }}>
            Choose an investigation strategy below, then run the AI agent on this case.
          </p>
        </div>
      </div>
      <ModeTabBar activeMode={activeMode} onModeChange={setActiveMode} />

      {activeMode === "single" && (
        <SingleAgentPanel
          investigation={investigation}
          isLoading={isLoading}
          onInvestigate={onInvestigate}
          runId={runId}
          caseId={caseId}
        />
      )}

      {activeMode === "consensus" && (
        <ConsensusPanel runId={runId} caseId={caseId} />
      )}

      {activeMode === "debate" && (
        <DebatePanel runId={runId} caseId={caseId} />
      )}

      {activeMode === "junior-senior" && (
        <JuniorSeniorPanel runId={runId} caseId={caseId} />
      )}
    </div>
  );
}
