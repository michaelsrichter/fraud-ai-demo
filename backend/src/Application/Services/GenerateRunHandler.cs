using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Banding;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace FraudDemo.Application.Services;

/// <summary>Orchestrates: validate config → generate employees → inject expenses → score → band → persist.</summary>
public sealed class GenerateRunHandler
{
    private readonly IClock _clock;
    private readonly IRandomSource _random;
    private readonly IEmployeeGenerator _employees;
    private readonly IFraudInjector _injector;
    private readonly IEnumerable<IAnomalyScorer> _scorers;
    private readonly IRunRepository _repository;
    private readonly ILogger<GenerateRunHandler> _logger;

    public GenerateRunHandler(
        IClock clock,
        IRandomSource random,
        IEmployeeGenerator employees,
        IFraudInjector injector,
        IEnumerable<IAnomalyScorer> scorers,
        IRunRepository repository,
        ILogger<GenerateRunHandler> logger)
    {
        _clock = clock;
        _random = random;
        _employees = employees;
        _injector = injector;
        _scorers = scorers;
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

        var scorerLookup = _scorers.ToDictionary(s => s.ModelId);
        var modelResults = new Dictionary<string, ModelDetectionResults>();

        foreach (var selection in config.Scorers)
        {
            if (!scorerLookup.TryGetValue(selection.ModelId, out var scorer))
            {
                _logger.LogWarning("Scorer {ModelId} not registered, skipping", selection.ModelId);
                modelResults[selection.ModelId] = ModelDetectionResults.Error(selection.ModelId, $"Scorer '{selection.ModelId}' not registered.");
                continue;
            }

            try
            {
                var overrides = selection.Parameters.Count > 0 ? new Dictionary<string, double>(selection.Parameters) : null;
                var detections = scorer.Score(employees, expenses, config.Thresholds, config.Seed, overrides);
                var bandCounts = BandingHelpers.Count(detections.Select(d => d.Band));
                modelResults[selection.ModelId] = ModelDetectionResults.Success(selection.ModelId, detections, bandCounts);
                _logger.LogInformation("Scorer {ModelId} completed: high={High}, medium={Medium}, low={Low}",
                    selection.ModelId, bandCounts.High, bandCounts.Medium, bandCounts.Low);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Scorer {ModelId} failed", selection.ModelId);
                modelResults[selection.ModelId] = ModelDetectionResults.Error(selection.ModelId, ex.Message);
            }
        }

        var primaryModel = modelResults.Values.FirstOrDefault(m => m.Status == ModelScoringStatus.Success);
        var bandCoundsTotal = primaryModel?.BandCounts ?? new BandCounts(0, 0, 0);

        var run = new Run(
            runId: Guid.NewGuid(),
            ownerId: string.IsNullOrWhiteSpace(ownerId) ? "anonymous" : ownerId,
            createdUtc: now,
            configuration: config,
            employees: employees,
            expenses: expenses,
            modelResults: modelResults,
            investigations: new Dictionary<Guid, AiInvestigationResult>(),
            bandCounts: bandCoundsTotal);

        await _repository.CreateAsync(run, cancellationToken);
        _logger.LogInformation("Run {RunId} persisted (high={High}, medium={Medium}, low={Low})",
            run.RunId, bandCoundsTotal.High, bandCoundsTotal.Medium, bandCoundsTotal.Low);
        return run;
    }
}
