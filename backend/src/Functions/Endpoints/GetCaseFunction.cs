using System.Net;
using FraudDemo.Application.Abstractions;
using FraudDemo.Domain.Projections;
using FraudDemo.Functions.ErrorHandling;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

public sealed class GetCaseFunction
{
    private readonly IRunRepository _repository;

    public GetCaseFunction(IRunRepository repository)
    {
        _repository = repository;
    }

    [Function("getCase")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "runs/{runId:guid}/cases/{caseId:guid}")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
        var loaded = await _repository.LoadAsync(runId, cancellationToken);
        if (loaded is null)
        {
            return await req.NotFoundAsync("Run not found", $"No run with id {runId:D}.", cancellationToken);
        }
        var run = loaded.Run;
        var expense = run.Expenses.FirstOrDefault(e => e.RecordId == caseId);
        if (expense is null)
        {
            return await req.NotFoundAsync("Case not found", $"No case with id {caseId:D} in run {runId:D}.", cancellationToken);
        }
        var employee = run.Employees.First(e => e.EmployeeId == expense.EmployeeId);
        var detection = run.DetectionResults.First(d => d.RecordId == expense.RecordId);
        run.Investigations.TryGetValue(expense.RecordId, out var investigation);
        var caseDto = new Case(expense, employee, detection, investigation);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(caseDto, cancellationToken);
        return response;
    }
}
