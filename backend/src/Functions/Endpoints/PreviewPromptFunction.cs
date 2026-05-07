using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Application.Abstractions;
using FraudDemo.Domain.Projections;
using FraudDemo.Infrastructure.Ai;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

public sealed class PreviewPromptFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly IRunRepository _repository;

    public PreviewPromptFunction(IRunRepository repository)
    {
        _repository = repository;
    }

    [Function("previewPrompt")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "runs/{runId:guid}/cases/{caseId:guid}/prompt")] HttpRequestData req,
        Guid runId,
        Guid caseId,
        CancellationToken cancellationToken)
    {
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
        run.Investigations.TryGetValue(expense.RecordId, out var investigation);
        var caseProjection = new Case(expense, employee, detection, investigation);

        var systemPrompt = AgentInvestigator.SystemPromptText;
        var userPrompt = AgentInvestigator.BuildPrompt(run, caseProjection);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { systemPrompt, userPrompt }, cancellationToken);
        return response;
    }
}
