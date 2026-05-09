using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Application.Services;
using FraudDemo.Domain.Entities;
using FraudDemo.Functions.ErrorHandling;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// SSE streaming variant of the investigation endpoint (FR-017, FR-018).
/// Streams tool_call events in real time, then emits a complete or error event.
/// </summary>
public sealed class InvestigateCaseStreamFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly InvestigateCaseHandler _handler;

    public InvestigateCaseStreamFunction(InvestigateCaseHandler handler)
    {
        _handler = handler;
    }

    [Function("investigateCaseStream")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/cases/{caseId:guid}/investigate/stream")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
        string? modelDeploymentName = null;
        float? temperature = null;
        bool allowConfidenceScores = false;
        try
        {
            var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body, cancellationToken: cancellationToken);
            if (body.TryGetProperty("modelDeploymentName", out var modelProp) && modelProp.ValueKind == JsonValueKind.String)
            {
                modelDeploymentName = modelProp.GetString();
            }
            if (body.TryGetProperty("temperature", out var tempProp) && tempProp.ValueKind == JsonValueKind.Number)
            {
                temperature = tempProp.GetSingle();
            }
            if (body.TryGetProperty("allowConfidenceScores", out var confProp) && confProp.ValueKind == JsonValueKind.True)
            {
                allowConfidenceScores = true;
            }
        }
        catch { /* empty body is fine — use defaults */ }

        // Set up SSE response headers
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "text/event-stream");
        response.Headers.Add("Cache-Control", "no-cache");
        response.Headers.Add("Connection", "keep-alive");

        var stream = response.Body;

        // Create progress callback that streams tool_call events
        var progress = new Progress<ToolInvocation>(invocation =>
        {
            // Fire-and-forget write to the SSE stream (Progress<T> posts to the sync context)
            _ = SseHelper.WriteSseEventAsync(stream, "tool_call", invocation, JsonOptions, CancellationToken.None);
        });

        var request = new InvestigateCaseRequest(runId, caseId, modelDeploymentName, temperature, allowConfidenceScores);
        var result = await _handler.HandleAsync(request, cancellationToken, progress);

        if (result.RunNotFound)
        {
            return await req.NotFoundAsync("Run not found", $"No run with id {runId:D}.", cancellationToken);
        }
        if (result.CaseNotFound)
        {
            return await req.NotFoundAsync("Case not found", $"No case with id {caseId:D} in run {runId:D}.", cancellationToken);
        }

        // Write terminal event — complete or error
        if (result.Investigation.Status == Domain.Enums.InvestigationStatus.Succeeded)
        {
            await SseHelper.WriteSseEventAsync(stream, "complete", result.Investigation, JsonOptions, cancellationToken);
        }
        else
        {
            await SseHelper.WriteSseEventAsync(stream, "error", result.Investigation, JsonOptions, cancellationToken);
        }

        return response;
    }
}
