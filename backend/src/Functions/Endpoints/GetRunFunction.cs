using System.Net;
using FraudDemo.Application.Abstractions;
using FraudDemo.Functions.ErrorHandling;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

public sealed class GetRunFunction
{
    private readonly IRunRepository _repository;

    public GetRunFunction(IRunRepository repository)
    {
        _repository = repository;
    }

    [Function("getRun")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "runs/{runId:guid}")] HttpRequestData req,
        Guid runId,
        CancellationToken cancellationToken)
    {
        var loaded = await _repository.LoadAsync(runId, cancellationToken);
        if (loaded is null)
        {
            return await req.NotFoundAsync("Run not found", $"No run with id {runId:D}.", cancellationToken);
        }
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("ETag", loaded.ETag);
        await response.WriteAsJsonAsync(loaded.Run, cancellationToken);
        return response;
    }
}
