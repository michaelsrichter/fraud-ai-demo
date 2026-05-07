using System.Net;
using FraudDemo.Application.Abstractions;
using FraudDemo.Functions.ErrorHandling;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

public sealed class DeleteRunFunction
{
    private readonly IRunRepository _repository;

    public DeleteRunFunction(IRunRepository repository)
    {
        _repository = repository;
    }

    [Function("deleteRun")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "runs/{runId:guid}")] HttpRequestData req,
        Guid runId,
        CancellationToken cancellationToken)
    {
        var deleted = await _repository.DeleteAsync(runId, cancellationToken);
        if (!deleted)
        {
            return await req.NotFoundAsync("Run not found", $"No run with id {runId:D}.", cancellationToken);
        }
        return req.CreateResponse(HttpStatusCode.NoContent);
    }
}
