using System.Net;
using System.Text.Json;
using FraudDemo.Application.Services;
using FraudDemo.Functions.ErrorHandling;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

public sealed class InvestigateCaseFunction
{
    private readonly InvestigateCaseHandler _handler;

    public InvestigateCaseFunction(InvestigateCaseHandler handler)
    {
        _handler = handler;
    }

    [Function("investigateCase")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/cases/{caseId:guid}/investigate")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
        string? modelDeploymentName = null;
        float? temperature = null;
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
        }
        catch { /* empty body is fine — use defaults */ }

        var result = await _handler.HandleAsync(new InvestigateCaseRequest(runId, caseId, modelDeploymentName, temperature), cancellationToken);
        if (result.RunNotFound)
        {
            return await req.NotFoundAsync("Run not found", $"No run with id {runId:D}.", cancellationToken);
        }
        if (result.CaseNotFound)
        {
            return await req.NotFoundAsync("Case not found", $"No case with id {caseId:D} in run {runId:D}.", cancellationToken);
        }
        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(result.Investigation, cancellationToken);
        return response;
    }
}
