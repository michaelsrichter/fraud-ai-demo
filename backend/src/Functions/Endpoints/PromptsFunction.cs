using System.Net;
using FraudDemo.Infrastructure.Ai;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// Returns all static prompt constants used across investigation modes.
/// GET /api/prompts
/// </summary>
public sealed class PromptsFunction
{
    [Function("prompts")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "prompts")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        var prompts = new
        {
            baseSystemPrompt = AgentInvestigator.SystemPromptText,
            fraudLeaningBias = AgentInvestigator.FraudLeaningBias,
            nonFraudLeaningBias = AgentInvestigator.NonFraudLeaningBias,
            debateArbiterPrompt = AgentInvestigator.DebateArbiterPrompt,
            juniorConfidenceExtension = AgentInvestigator.JuniorConfidenceExtension,
            seniorPreambleTemplate = AgentInvestigator.SeniorPreambleTemplate,
            consensusArbiterPrompt = ConsensusCaseFunction.ArbiterSystemPrompt,
        };

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(prompts, cancellationToken);
        return response;
    }
}
