using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Banding;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace FraudDemo.Application.Services;

/// <summary>Orchestrates: validate config → generate employees → inject expenses → score → band → persist.</summary>
public sealed class GenerateRunHandler
{
    private readonly IClock _clock;
    private readonly IRandomSource _random;
    private readonly IEmployeeGenerator _employees;
    private readonly IFraudInjector _injector;
    private readonly IAnomalyScorer _scorer;
    private readonly IRunRepository _repository;
    private readonly ILogger<GenerateRunHandler> _logger;

    public GenerateRunHandler(
        IClock clock,
        IRandomSource random,
        IEmployeeGenerator employees,
        IFraudInjector injector,
        IAnomalyScorer scorer,
        IRunRepository repository,
        ILogger<GenerateRunHandler> logger)
    {
        _clock = clock;
        _random = random;
        _employees = employees;
        _injector = injector;
        _scorer = scorer;
        _repository = repository;
        _logger = logger;
    }

    public async Task<Run> HandleAsync(SimulationConfiguration config, string ownerId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(config);
        var rng = _random.ForRun(config.Seed);
        var now = _clock.UtcNow;

        _logger.LogInformation("Data generation started: records={Records}, employees={Employees}, intensity={Intensity}",
            config.RecordCount, config.EmployeeCount, config.Intensity);

        var employees = _employees.Generate(config.EmployeeCount, rng);
        var expenses = _injector.Generate(employees, config, now, rng);
        var detections = _scorer.Score(employees, expenses, config.Thresholds, config.Seed);
        var bandCounts = BandingHelpers.Count(detections.Select(d => d.Band));

        var run = new Run(
            runId: Guid.NewGuid(),
            ownerId: string.IsNullOrWhiteSpace(ownerId) ? "anonymous" : ownerId,
            createdUtc: now,
            configuration: config,
            employees: employees,
            expenses: expenses,
            detectionResults: detections,
            investigations: new Dictionary<Guid, AiInvestigationResult>(),
            bandCounts: bandCounts);

        await _repository.CreateAsync(run, cancellationToken);
        _logger.LogInformation("Run {RunId} persisted (high={High}, medium={Medium}, low={Low})",
            run.RunId, bandCounts.High, bandCounts.Medium, bandCounts.Low);
        return run;
    }
}
