using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// Runs all deployed models simultaneously on the same case and returns a consensus verdict.
/// POST /api/runs/{runId}/cases/{caseId}/consensus
/// </summary>
public sealed class ConsensusCaseFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private static readonly string[] AllModels = { "gpt-5.4", "gpt-5.3-chat", "gpt-5.4-mini" };

    private readonly IRunRepository _repository;
    private readonly IAiInvestigator _investigator;

    public ConsensusCaseFunction(IRunRepository repository, IAiInvestigator investigator)
    {
        _repository = repository;
        _investigator = investigator;
    }

    [Function("consensusCase")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/cases/{caseId:guid}/consensus")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
        float? temperature = null;
        try
        {
            var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body, cancellationToken: cancellationToken);
            if (body.TryGetProperty("temperature", out var tempProp) && tempProp.ValueKind == JsonValueKind.Number)
            {
                temperature = tempProp.GetSingle();
            }
        }
        catch { /* empty body is fine */ }

        var loaded = await _repository.LoadAsync(runId, cancellationToken);
        if (loaded is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            return notFound;
        }
        var run = loaded.Run;
        var expense = run.Expenses.FirstOrDefault(e => e.RecordId == caseId);
        if (expense is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            return notFound;
        }
        var employee = run.Employees.First(e => e.EmployeeId == expense.EmployeeId);
        var detection = run.DetectionResults.First(d => d.RecordId == expense.RecordId);
        run.Investigations.TryGetValue(expense.RecordId, out var existing);
        var caseProjection = new Case(expense, employee, detection, existing);

        // Run all models in parallel
        var tasks = AllModels.Select(model =>
            _investigator.InvestigateAsync(run, caseProjection, model, temperature, cancellationToken)
        ).ToArray();

        var results = await Task.WhenAll(tasks);

        // Compute consensus
        var verdicts = results
            .Where(r => r.Status == Domain.Enums.InvestigationStatus.Succeeded && r.Verdict.HasValue)
            .Select(r => r.Verdict!.Value)
            .ToList();

        string consensusVerdict;
        if (verdicts.Count == 0)
        {
            consensusVerdict = "Unavailable";
        }
        else
        {
            var likelyCount = verdicts.Count(v => v == Domain.Enums.FraudLikelihood.Likely);
            var unlikelyCount = verdicts.Count(v => v == Domain.Enums.FraudLikelihood.Unlikely);
            var inconclusiveCount = verdicts.Count(v => v == Domain.Enums.FraudLikelihood.Inconclusive);

            if (likelyCount > verdicts.Count / 2) consensusVerdict = "Likely";
            else if (unlikelyCount > verdicts.Count / 2) consensusVerdict = "Unlikely";
            else consensusVerdict = "Inconclusive";
        }

        var modelResults = AllModels.Zip(results, (model, result) => new
        {
            model,
            status = result.Status.ToString(),
            verdict = result.Verdict?.ToString(),
            rationale = result.Rationale,
            keySignals = result.KeySignals,
            recommendedAction = result.RecommendedAction,
            unavailableReason = result.UnavailableReason,
        });

        var consensus = new
        {
            consensusVerdict,
            modelCount = AllModels.Length,
            succeededCount = results.Count(r => r.Status == Domain.Enums.InvestigationStatus.Succeeded),
            temperature,
            models = modelResults,
        };

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(consensus, cancellationToken);
        return response;
    }
}
