using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Core;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Projections;
using FraudDemo.Infrastructure.Ai;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// Runs a Junior → Senior investigation: a cheap model reviews first, then escalates
/// to a premium model if confidence is below the threshold (0.85).
/// POST /api/runs/{runId}/cases/{caseId}/junior-senior
/// </summary>
public sealed class JuniorSeniorCaseFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private const string JuniorModel = "gpt-5.4-mini";
    private const string SeniorModel = "gpt-5.4";
    private const float EscalationThreshold = 0.85f;

    private readonly IRunRepository _repository;
    private readonly IAiInvestigator _investigator;
    private readonly IOptions<FoundryOptions> _foundryOptions;
    private readonly ILogger<JuniorSeniorCaseFunction> _logger;

    public JuniorSeniorCaseFunction(
        IRunRepository repository,
        IAiInvestigator investigator,
        IOptions<FoundryOptions> foundryOptions,
        ILogger<JuniorSeniorCaseFunction> logger)
    {
        _repository = repository;
        _investigator = investigator;
        _foundryOptions = foundryOptions;
        _logger = logger;
    }

    [Function("juniorSeniorCase")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/cases/{caseId:guid}/junior-senior")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
        float? temperature = null;
        bool allowConfidenceScores = false;
        try
        {
            var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body, cancellationToken: cancellationToken);
            if (body.TryGetProperty("temperature", out var tempProp) && tempProp.ValueKind == JsonValueKind.Number)
                temperature = tempProp.GetSingle();
            if (body.TryGetProperty("allowConfidenceScores", out var confProp) && confProp.ValueKind == JsonValueKind.True)
                allowConfidenceScores = true;
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

        // Step 1: Run junior agent with confidence-score-extended prompt (FR-021)
        var juniorPrompt = AgentInvestigator.SystemPromptText + AgentInvestigator.JuniorConfidenceExtension;
        var juniorResult = await _investigator.InvestigateAsync(
            run, caseProjection, JuniorModel, temperature, allowConfidenceScores, cancellationToken,
            systemPromptOverride: juniorPrompt);

        // Parse confidence score from the junior's rationale or structured output
        var confidenceScore = ExtractConfidenceScore(juniorResult);

        _logger.LogInformation("Junior investigation complete: verdict={Verdict}, confidence={Confidence}, threshold={Threshold}",
            juniorResult.Verdict, confidenceScore, EscalationThreshold);

        // Step 2: Decide whether to escalate (FR-022, FR-023, FR-025)
        bool escalated = confidenceScore <= EscalationThreshold;
        object? seniorResponse = null;
        Domain.Entities.AiCostEstimate? seniorCostEstimate = null;
        string finalVerdict;

        if (!escalated)
        {
            // High confidence — return junior result directly (FR-022)
            finalVerdict = juniorResult.Verdict?.ToString() ?? "Inconclusive";
        }
        else
        {
            // Low confidence — escalate to senior (FR-023, FR-024)
            _logger.LogInformation("Escalating to senior agent: confidence {Confidence} <= threshold {Threshold}",
                confidenceScore, EscalationThreshold);

            var juniorFindings = JsonSerializer.Serialize(new
            {
                verdict = juniorResult.Verdict?.ToString(),
                rationale = juniorResult.Rationale,
                keySignals = juniorResult.KeySignals,
                recommendedAction = juniorResult.RecommendedAction,
                confidenceScore,
            }, JsonOptions);

            var seniorPrompt = AgentInvestigator.SystemPromptText + "\n\n" +
                string.Format(AgentInvestigator.SeniorPreambleTemplate, juniorFindings);

            try
            {
                var seniorResult = await _investigator.InvestigateAsync(
                    run, caseProjection, SeniorModel, temperature, allowConfidenceScores, cancellationToken,
                    systemPromptOverride: seniorPrompt);

                seniorResponse = new
                {
                    model = SeniorModel,
                    status = seniorResult.Status.ToString(),
                    verdict = seniorResult.Verdict?.ToString(),
                    rationale = seniorResult.Rationale,
                    keySignals = seniorResult.KeySignals,
                    recommendedAction = seniorResult.RecommendedAction,
                    costEstimate = seniorResult.CostEstimate,
                    toolTrace = seniorResult.ToolTrace?.Select(t => new
                    {
                        toolName = t.ToolName,
                        parameters = t.Parameters,
                        responseSummary = t.ResponseSummary,
                        responseData = t.ResponseData,
                        reasoning = t.Reasoning,
                        latencyMs = t.LatencyMs,
                        succeeded = t.Succeeded,
                    }).ToList(),
                };

                seniorCostEstimate = seniorResult.CostEstimate;

                finalVerdict = seniorResult.Status == Domain.Enums.InvestigationStatus.Succeeded
                    ? seniorResult.Verdict?.ToString() ?? "Inconclusive"
                    : juniorResult.Verdict?.ToString() ?? "Inconclusive";
            }
            catch (Exception ex)
            {
                // Senior unavailable — fall back to junior result (edge case from spec)
                _logger.LogWarning(ex, "Senior agent failed during escalation, falling back to junior result");
                finalVerdict = juniorResult.Verdict?.ToString() ?? "Inconclusive";
            }
        }

        var totalCostEstimate = AiCostEstimator.Sum(
            "junior-senior-total",
            new[] { juniorResult.CostEstimate, seniorCostEstimate });

        var juniorSeniorResponse = new
        {
            finalVerdict,
            escalated,
            confidenceScore,
            escalationThreshold = EscalationThreshold,
            temperature,
            costEstimate = totalCostEstimate,
            junior = new
            {
                model = JuniorModel,
                status = juniorResult.Status.ToString(),
                verdict = juniorResult.Verdict?.ToString(),
                rationale = juniorResult.Rationale,
                keySignals = juniorResult.KeySignals,
                recommendedAction = juniorResult.RecommendedAction,
                confidenceScore,
                costEstimate = juniorResult.CostEstimate,
                toolTrace = juniorResult.ToolTrace?.Select(t => new
                {
                    toolName = t.ToolName,
                    parameters = t.Parameters,
                    responseSummary = t.ResponseSummary,
                    responseData = t.ResponseData,
                    reasoning = t.Reasoning,
                    latencyMs = t.LatencyMs,
                    succeeded = t.Succeeded,
                }).ToList(),
            },
            senior = seniorResponse,
        };

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(juniorSeniorResponse, cancellationToken);
        return response;
    }

    /// <summary>
    /// Extracts the confidence score from the AI's JSON response embedded in the rationale
    /// or from the structured output. Falls back to 0.5 if not parseable.
    /// </summary>
    private static float ExtractConfidenceScore(Domain.Entities.AiInvestigationResult result)
    {
        if (result.Status != Domain.Enums.InvestigationStatus.Succeeded)
            return 0f;

        // The junior agent is instructed to include confidenceScore in its JSON output.
        // Since we parse the JSON into AiInvestigationResult (which lacks this field),
        // we look for it in the rationale text as a fallback pattern.
        var rationale = result.Rationale ?? "";

        // Try to find "confidenceScore": X.XX pattern in the text
        var patterns = new[] { "\"confidenceScore\":", "confidenceScore:", "confidence:" };
        foreach (var pattern in patterns)
        {
            var idx = rationale.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                var numStart = idx + pattern.Length;
                var numEnd = numStart;
                while (numEnd < rationale.Length && (char.IsDigit(rationale[numEnd]) || rationale[numEnd] == '.' || rationale[numEnd] == ' '))
                    numEnd++;
                if (float.TryParse(rationale[numStart..numEnd].Trim(), out var score) && score >= 0f && score <= 1f)
                    return score;
            }
        }

        // Heuristic fallback: map verdict to confidence
        return result.Verdict switch
        {
            Domain.Enums.FraudLikelihood.Likely => 0.7f,
            Domain.Enums.FraudLikelihood.Unlikely => 0.7f,
            Domain.Enums.FraudLikelihood.Inconclusive => 0.4f,
            _ => 0.5f,
        };
    }
}
