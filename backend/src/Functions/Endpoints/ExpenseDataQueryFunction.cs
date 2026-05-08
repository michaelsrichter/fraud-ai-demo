using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Dtos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// POST /api/runs/{runId}/tools/expenses/query — Lab-specific data retrieval tool (FR-003).
/// Loads the Run from blob storage and returns filtered expense data.
/// </summary>
public sealed class ExpenseDataQueryFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly IRunRepository _repository;
    private readonly IRunDataQueryService _queryService;

    public ExpenseDataQueryFunction(IRunRepository repository, IRunDataQueryService queryService)
    {
        _repository = repository;
        _queryService = queryService;
    }

    [Function("expenseDataQuery")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "runs/{runId:guid}/tools/expenses/query")] HttpRequestData req,
        Guid runId,
        CancellationToken cancellationToken)
    {
        var loaded = await _repository.LoadAsync(runId, cancellationToken);
        if (loaded is null)
        {
            return req.CreateResponse(HttpStatusCode.NotFound);
        }

        RunDataQuery query;
        try
        {
            query = await JsonSerializer.DeserializeAsync<RunDataQuery>(req.Body, JsonOptions, cancellationToken) ?? new RunDataQuery();
        }
        catch
        {
            query = new RunDataQuery();
        }

        var result = _queryService.Query(loaded.Run, query);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(result, cancellationToken);
        return response;
    }
}
