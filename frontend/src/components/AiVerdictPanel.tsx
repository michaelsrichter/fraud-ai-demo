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
      <h2>AI Investigation</h2>
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
