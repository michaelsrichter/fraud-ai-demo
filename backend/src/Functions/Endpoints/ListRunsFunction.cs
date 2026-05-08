using System.Net;
using FraudDemo.Application.Abstractions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

public sealed class ListRunsFunction
{
    private readonly IRunRepository _repository;

    public ListRunsFunction(IRunRepository repository)
    {
        _repository = repository;
    }

    [Function("listRuns")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "runs")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var take = int.TryParse(query["take"], out var t) ? Math.Clamp(t, 1, 200) : 50;
        var token = query["continuationToken"];
        var ownerId = req.Headers.TryGetValues("X-User-Id", out var ids) ? ids.FirstOrDefault() : null;

        var page = await _repository.ListAsync(take, token, ownerId, cancellationToken);
        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { items = page.Items, continuationToken = page.ContinuationToken }, cancellationToken);
        return response;
    }
}
