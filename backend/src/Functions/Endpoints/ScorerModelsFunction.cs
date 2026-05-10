using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Domain.Configuration;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

/// <summary>Returns the catalog of available ML scoring models and their parameter definitions.</summary>
public sealed class ScorerModelsFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    [Function("getScorers")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "scorers")] HttpRequestData req)
    {
        var registry = ScorerRegistry.Instance;
        var payload = JsonSerializer.Serialize(new { models = registry.AvailableModels }, JsonOptions);
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(payload);
        return response;
    }
}
