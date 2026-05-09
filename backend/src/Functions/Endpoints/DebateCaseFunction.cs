using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.AI.OpenAI;
using Azure.Core;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Domain.Projections;
using FraudDemo.Infrastructure.Ai;
using Microsoft.Agents.AI;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// Runs a Debate investigation: two opposing agents (fraud-leaning vs non-fraud-leaning)
/// review the same case in parallel, then an arbiter evaluates both arguments.
/// POST /api/runs/{runId}/cases/{caseId}/debate
/// </summary>
public sealed class DebateCaseFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly IRunRepository _repository;
    private readonly IAiInvestigator _investigator;
    private readonly IOptions<FoundryOptions> _foundryOptions;
    private readonly TokenCredential _credential;
    private readonly ILogger<DebateCaseFunction> _logger;

    public DebateCaseFunction(
        IRunRepository repository,
        IAiInvestigator investigator,
        IOptions<FoundryOptions> foundryOptions,
        TokenCredential credential,
        ILogger<DebateCaseFunction> logger)
    {
        _repository = repository;
        _investigator = investigator;
        _foundryOptions = foundryOptions;
        _credential = credential;
        _logger = logger;
    }

    [Function("debateCase")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/cases/{caseId:guid}/debate")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
        string? model = null;
        float? temperature = null;
        bool allowConfidenceScores = false;
        try
        {
            var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body, cancellationToken: cancellationToken);
            if (body.TryGetProperty("model", out var modelProp) && modelProp.ValueKind == JsonValueKind.String)
                model = modelProp.GetString();
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

        // Build biased system prompts by prepending bias to the base prompt
        var fraudLeaningPrompt = AgentInvestigator.FraudLeaningBias + AgentInvestigator.SystemPromptText;
        var nonFraudLeaningPrompt = AgentInvestigator.NonFraudLeaningBias + AgentInvestigator.SystemPromptText;

        // Run both debate agents in parallel (FR-013)
        var fraudLeaningTask = _investigator.InvestigateAsync(
            run, caseProjection, model, temperature, allowConfidenceScores, cancellationToken,
            systemPromptOverride: fraudLeaningPrompt);
        var nonFraudLeaningTask = _investigator.InvestigateAsync(
            run, caseProjection, model, temperature, allowConfidenceScores, cancellationToken,
            systemPromptOverride: nonFraudLeaningPrompt);

        var results = await Task.WhenAll(fraudLeaningTask, nonFraudLeaningTask);
        var fraudResult = results[0];
        var nonFraudResult = results[1];

        var agentFindings = new[]
        {
            new
            {
                role = "Fraud Advocate",
                status = fraudResult.Status.ToString(),
                verdict = fraudResult.Verdict?.ToString(),
                rationale = fraudResult.Rationale,
                keySignals = fraudResult.KeySignals,
                recommendedAction = fraudResult.RecommendedAction,
            },
            new
            {
                role = "Defense Advocate",
                status = nonFraudResult.Status.ToString(),
                verdict = nonFraudResult.Verdict?.ToString(),
                rationale = nonFraudResult.Rationale,
                keySignals = nonFraudResult.KeySignals,
                recommendedAction = nonFraudResult.RecommendedAction,
            },
        };

        // Run arbiter (FR-014) — follows ConsensusCaseFunction.RunArbiterAsync pattern
        object? arbiter = null;
        string finalVerdict;
        try
        {
            arbiter = await RunArbiterAsync(agentFindings, temperature, cancellationToken);
            if (arbiter is not null)
            {
                var arbiterJson = JsonSerializer.Serialize(arbiter, JsonOptions);
                var arbiterDoc = JsonDocument.Parse(arbiterJson);
                finalVerdict = arbiterDoc.RootElement.TryGetProperty("finalVerdict", out var fv)
                    ? fv.GetString() ?? "Inconclusive"
                    : "Inconclusive";
            }
            else
            {
                finalVerdict = fraudResult.Verdict?.ToString() ?? "Inconclusive";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Debate arbiter reasoning failed");
            finalVerdict = fraudResult.Verdict?.ToString() ?? "Inconclusive";
        }

        var debateResponse = new
        {
            finalVerdict,
            temperature,
            model = model ?? "default",
            fraudLeaning = MapAgentResult(fraudResult),
            nonFraudLeaning = MapAgentResult(nonFraudResult),
            arbiter,
        };

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(debateResponse, cancellationToken);
        return response;
    }

    private static object MapAgentResult(Domain.Entities.AiInvestigationResult result)
    {
        return new
        {
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
        };
    }

    private async Task<object?> RunArbiterAsync<T>(T[] agentFindings, float? temperature, CancellationToken cancellationToken)
    {
        var endpoint = _foundryOptions.Value.Endpoint;
        if (string.IsNullOrWhiteSpace(endpoint)) return null;

        var azureClient = new AzureOpenAIClient(new Uri(endpoint), _credential);
        var chat = azureClient.GetChatClient("gpt-5.4");
        IChatClient chatClient = chat.AsIChatClient();

        var agent = new ChatClientAgent(chatClient, instructions: AgentInvestigator.DebateArbiterPrompt);
        var prompt = JsonSerializer.Serialize(agentFindings, JsonOptions);

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
