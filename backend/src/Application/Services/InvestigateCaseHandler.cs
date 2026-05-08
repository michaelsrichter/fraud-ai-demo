using FraudDemo.Application.Abstractions;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;
using Microsoft.Extensions.Logging;

namespace FraudDemo.Application.Services;

public sealed record InvestigateCaseRequest(Guid RunId, Guid CaseId, string? ModelDeploymentName = null, float? Temperature = null, bool AllowConfidenceScores = false);

public sealed class InvestigateCaseHandler
{
    private const int EtagRetryAttempts = 1;

    private readonly IRunRepository _repository;
    private readonly IAiInvestigator _investigator;
    private readonly IClock _clock;
    private readonly ILogger<InvestigateCaseHandler> _logger;

    public InvestigateCaseHandler(
        IRunRepository repository,
        IAiInvestigator investigator,
        IClock clock,
        ILogger<InvestigateCaseHandler> logger)
    {
        _repository = repository;
        _investigator = investigator;
        _clock = clock;
        _logger = logger;
    }

    public sealed record Result(AiInvestigationResult Investigation, bool Persisted, bool RunNotFound, bool CaseNotFound);

    public async Task<Result> HandleAsync(InvestigateCaseRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var loaded = await _repository.LoadAsync(request.RunId, cancellationToken);
        if (loaded is null)
        {
            return new Result(
                AiInvestigationResult.Unavailable(Guid.NewGuid(), request.RunId, _clock.UtcNow, "run-not-found"),
                Persisted: false,
                RunNotFound: true,
                CaseNotFound: false);
        }

        var run = loaded.Run;
        var expense = run.Expenses.FirstOrDefault(e => e.RecordId == request.CaseId);
        if (expense is null)
        {
            return new Result(
                AiInvestigationResult.Unavailable(request.CaseId, request.RunId, _clock.UtcNow, "case-not-found"),
                Persisted: false,
                RunNotFound: false,
                CaseNotFound: true);
        }

        var employee = run.Employees.First(e => e.EmployeeId == expense.EmployeeId);
        var detection = run.DetectionResults.First(d => d.RecordId == expense.RecordId);
        run.Investigations.TryGetValue(expense.RecordId, out var existing);
        var caseUnderReview = new Case(expense, employee, detection, existing);

        var investigation = await _investigator.InvestigateAsync(run, caseUnderReview, request.ModelDeploymentName, request.Temperature, request.AllowConfidenceScores, cancellationToken);

        if (investigation.Status == Domain.Enums.InvestigationStatus.Unavailable)
        {
            _logger.LogInformation("Investigation unavailable for run {RunId} case {CaseId}: {Reason}",
                request.RunId, request.CaseId, investigation.UnavailableReason);
            return new Result(investigation, Persisted: false, RunNotFound: false, CaseNotFound: false);
        }

        var etag = loaded.ETag;
        var currentRun = run;
        for (var attempt = 0; attempt <= EtagRetryAttempts; attempt++)
        {
            var updatedInvestigations = new Dictionary<Guid, AiInvestigationResult>(currentRun.Investigations)
            {
                [expense.RecordId] = investigation,
            };
            var updatedRun = currentRun.WithInvestigations(updatedInvestigations);

            var newEtag = await _repository.UpdateAsync(updatedRun, etag, cancellationToken);
            if (newEtag is not null)
            {
                _logger.LogInformation("Investigation persisted for run {RunId} case {CaseId} (attempt {Attempt})",
                    request.RunId, request.CaseId, attempt + 1);
                return new Result(investigation, Persisted: true, RunNotFound: false, CaseNotFound: false);
            }

            // ETag mismatch — reload and retry once. The investigation always attaches to the originating runId.
            var reloaded = await _repository.LoadAsync(request.RunId, cancellationToken);
            if (reloaded is null)
            {
                return new Result(investigation, Persisted: false, RunNotFound: true, CaseNotFound: false);
            }
            currentRun = reloaded.Run;
            etag = reloaded.ETag;
        }

        _logger.LogWarning("Investigation could not be persisted for run {RunId} after retries", request.RunId);
        return new Result(investigation, Persisted: false, RunNotFound: false, CaseNotFound: false);
    }
}
