using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.AI.OpenAI;
using Azure.Core;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;
using FraudDemo.Infrastructure.Ai;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
    private static readonly string ArbiterModel = "gpt-5.4";

    internal static readonly string ArbiterSystemPrompt = """
        You are a senior fraud review arbiter. You have received the independent assessments
        of three AI fraud investigators (each using a different model) for the same expense case.
        
        Your job is to:
        1. Compare the three verdicts, rationales, and key signals
        2. Identify the main differences and agreements between the models
        3. Make a FINAL decisive recommendation — "Likely" or "Unlikely" (avoid "Inconclusive")
        4. Explain your reasoning, highlighting where models agreed, disagreed, and why you sided
           with one interpretation over another
        
        Be bold and decisive. You are the tiebreaker. Take a clear position.
        
        Reply with a single JSON object — no prose, no markdown fences:
        {
          "finalVerdict": "Likely" | "Unlikely" | "Inconclusive",
          "summary": string (2-3 sentence executive summary),
          "agreements": string[] (points all models agreed on),
          "disagreements": string[] (key differences between models),
          "reasoning": string (why you chose this verdict, under 1500 chars)
        }
        """;

    private readonly IRunRepository _repository;
    private readonly IAiInvestigator _investigator;
    private readonly IOptions<FoundryOptions> _foundryOptions;
    private readonly TokenCredential _credential;
    private readonly ILogger<ConsensusCaseFunction> _logger;

    public ConsensusCaseFunction(IRunRepository repository, IAiInvestigator investigator, IOptions<FoundryOptions> foundryOptions, TokenCredential credential, ILogger<ConsensusCaseFunction> logger)
    {
        _repository = repository;
        _investigator = investigator;
        _foundryOptions = foundryOptions;
        _credential = credential;
        _logger = logger;
    }

    [Function("consensusCase")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/cases/{caseId:guid}/consensus")] HttpRequestData req,
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
            {
                temperature = tempProp.GetSingle();
            }
            if (body.TryGetProperty("allowConfidenceScores", out var confProp) && confProp.ValueKind == JsonValueKind.True)
            {
                allowConfidenceScores = true;
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
            _investigator.InvestigateAsync(run, caseProjection, model, temperature, allowConfidenceScores, cancellationToken)
        ).ToArray();

        var results = await Task.WhenAll(tasks);

        var modelResults = AllModels.Zip(results, (model, result) => new
        {
            model,
            status = result.Status.ToString(),
            verdict = result.Verdict?.ToString(),
            rationale = result.Rationale,
            keySignals = result.KeySignals,
            recommendedAction = result.RecommendedAction,
            unavailableReason = result.UnavailableReason,
            toolTrace = result.ToolTrace?.Select(t => new
            {
                toolName = t.ToolName,
                parameters = t.Parameters,
                responseSummary = t.ResponseSummary,
                responseData = t.ResponseData,
                reasoning = t.Reasoning,
                latencyMs = t.LatencyMs,
                succeeded = t.Succeeded,
            }).ToList(),
        }).ToList();

        // Run arbiter LLM to reason over the 3 results
        object? arbiter = null;
        try
        {
            arbiter = await RunArbiterAsync(modelResults, temperature, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Arbiter reasoning failed, falling back to vote-based consensus");
        }

        // Use arbiter verdict if available, otherwise fall back to vote
        string consensusVerdict;
        if (arbiter is not null)
        {
            var arbiterJson = JsonSerializer.Serialize(arbiter, JsonOptions);
            var arbiterDoc = JsonDocument.Parse(arbiterJson);
            consensusVerdict = arbiterDoc.RootElement.TryGetProperty("finalVerdict", out var fv) ? fv.GetString() ?? "Inconclusive" : "Inconclusive";
        }
        else
        {
            var verdicts = results
                .Where(r => r.Status == Domain.Enums.InvestigationStatus.Succeeded && r.Verdict.HasValue)
                .Select(r => r.Verdict!.Value)
                .ToList();
            if (verdicts.Count == 0)
                consensusVerdict = "Unavailable";
            else
            {
                var likelyCount = verdicts.Count(v => v == Domain.Enums.FraudLikelihood.Likely);
                var unlikelyCount = verdicts.Count(v => v == Domain.Enums.FraudLikelihood.Unlikely);
                consensusVerdict = likelyCount > verdicts.Count / 2 ? "Likely"
                    : unlikelyCount > verdicts.Count / 2 ? "Unlikely" : "Inconclusive";
            }
        }

        var consensus = new
        {
            consensusVerdict,
            modelCount = AllModels.Length,
            succeededCount = results.Count(r => r.Status == Domain.Enums.InvestigationStatus.Succeeded),
            temperature,
            models = modelResults,
            arbiter,
        };

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(consensus, cancellationToken);
        return response;
    }

    private async Task<object?> RunArbiterAsync<T>(List<T> modelResults, float? temperature, CancellationToken cancellationToken)
    {
        var endpoint = _foundryOptions.Value.Endpoint;
        if (string.IsNullOrWhiteSpace(endpoint)) return null;

        var azureClient = new AzureOpenAIClient(new Uri(endpoint), _credential);
        var chat = azureClient.GetChatClient(ArbiterModel);
        IChatClient chatClient = chat.AsIChatClient();

        var agent = new Microsoft.Agents.AI.ChatClientAgent(chatClient, instructions: ArbiterSystemPrompt);

        var prompt = JsonSerializer.Serialize(modelResults, JsonOptions);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(60));

        var agentResponse = await agent.RunAsync(prompt, cancellationToken: cts.Token);
        var json = agentResponse.Text;

        // Strip markdown fences if present
        if (json.Contains("```"))
        {
            var start = json.IndexOf('{');
            var end = json.LastIndexOf('}');
            if (start >= 0 && end > start)
                json = json[start..(end + 1)];
        }

        return JsonSerializer.Deserialize<JsonElement>(json);
    }
}
