using FraudDemo.Domain.Enums;

namespace FraudDemo.Domain.Entities;

public sealed record AiInvestigationResult
{
    public Guid RecordId { get; }
    public Guid RunId { get; }
    public DateTimeOffset RequestedUtc { get; }
    public DateTimeOffset? CompletedUtc { get; }
    public InvestigationStatus Status { get; }
    public FraudLikelihood? Verdict { get; }
    public string? Rationale { get; }
    public IReadOnlyList<string>? KeySignals { get; }
    public string? RecommendedAction { get; }
    public string? UnavailableReason { get; }
    public IReadOnlyList<ToolInvocation>? ToolTrace { get; }
    public string? ModelDeploymentName { get; }
    public AiCostEstimate? CostEstimate { get; }

    public AiInvestigationResult(
        Guid recordId,
        Guid runId,
        DateTimeOffset requestedUtc,
        DateTimeOffset? completedUtc,
        InvestigationStatus status,
        FraudLikelihood? verdict,
        string? rationale,
        IReadOnlyList<string>? keySignals,
        string? recommendedAction,
        string? unavailableReason,
        IReadOnlyList<ToolInvocation>? toolTrace = null,
        string? modelDeploymentName = null,
        AiCostEstimate? costEstimate = null)
    {
        RecordId = recordId;
        RunId = runId;
        RequestedUtc = requestedUtc;
        CompletedUtc = completedUtc;
        Status = status;
        Verdict = verdict;
        Rationale = rationale;
        KeySignals = keySignals;
        RecommendedAction = recommendedAction;
        UnavailableReason = unavailableReason;
        ToolTrace = toolTrace;
        ModelDeploymentName = modelDeploymentName;
        CostEstimate = costEstimate;
    }

    public static AiInvestigationResult Succeeded(
        Guid recordId,
        Guid runId,
        DateTimeOffset requestedUtc,
        DateTimeOffset completedUtc,
        FraudLikelihood verdict,
        string rationale,
        IReadOnlyList<string> keySignals,
        string recommendedAction,
        IReadOnlyList<ToolInvocation>? toolTrace = null,
        string? modelDeploymentName = null,
        AiCostEstimate? costEstimate = null)
    {
        if (recordId == Guid.Empty) throw new ArgumentException("RecordId required.", nameof(recordId));
        if (runId == Guid.Empty) throw new ArgumentException("RunId required.", nameof(runId));
        if (string.IsNullOrWhiteSpace(rationale)) throw new ArgumentException("Rationale required on success.", nameof(rationale));
        if (rationale.Length > 2000) throw new ArgumentException("Rationale must be <= 2000 chars.", nameof(rationale));
        if (string.IsNullOrWhiteSpace(recommendedAction)) throw new ArgumentException("RecommendedAction required.", nameof(recommendedAction));
        ArgumentNullException.ThrowIfNull(keySignals);
        if (keySignals.Count is < 1 or > 10) throw new ArgumentException("KeySignals.Count must be 1..10.", nameof(keySignals));

        return new AiInvestigationResult(
            recordId,
            runId,
            requestedUtc,
            completedUtc,
            InvestigationStatus.Succeeded,
            verdict,
            rationale,
            keySignals,
            recommendedAction,
            null,
                toolTrace,
                modelDeploymentName,
                costEstimate);
    }

    public static AiInvestigationResult Unavailable(
        Guid recordId,
        Guid runId,
        DateTimeOffset requestedUtc,
        string reason,
        string? modelDeploymentName = null,
        AiCostEstimate? costEstimate = null)
    {
        if (recordId == Guid.Empty) throw new ArgumentException("RecordId required.", nameof(recordId));
        if (runId == Guid.Empty) throw new ArgumentException("RunId required.", nameof(runId));
        if (string.IsNullOrWhiteSpace(reason)) throw new ArgumentException("Reason required.", nameof(reason));

        return new AiInvestigationResult(
            recordId,
            runId,
            requestedUtc,
            null,
            InvestigationStatus.Unavailable,
            null,
            null,
            null,
            null,
            reason,
            null,
            modelDeploymentName,
            costEstimate);
    }
}
