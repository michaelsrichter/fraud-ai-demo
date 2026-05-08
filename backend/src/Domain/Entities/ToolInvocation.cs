namespace FraudDemo.Domain.Entities;

/// <summary>
/// A single tool call made by an agent during an AI investigation.
/// Captures the tool name, parameters, response, latency, and the agent's reasoning.
/// </summary>
public sealed record ToolInvocation
{
    public string ToolName { get; }
    public string Parameters { get; }
    public string ResponseSummary { get; }
    public string? ResponseData { get; }
    public string? Reasoning { get; }
    public long LatencyMs { get; }
    public bool Succeeded { get; }

    public ToolInvocation(
        string toolName,
        string parameters,
        string responseSummary,
        string? responseData,
        string? reasoning,
        long latencyMs,
        bool succeeded)
    {
        if (string.IsNullOrWhiteSpace(toolName)) throw new ArgumentException("ToolName required.", nameof(toolName));
        if (string.IsNullOrWhiteSpace(parameters)) throw new ArgumentException("Parameters required.", nameof(parameters));
        if (string.IsNullOrWhiteSpace(responseSummary)) throw new ArgumentException("ResponseSummary required.", nameof(responseSummary));
        if (latencyMs < 0) throw new ArgumentOutOfRangeException(nameof(latencyMs), "LatencyMs must be >= 0.");

        ToolName = toolName;
        Parameters = parameters;
        ResponseSummary = responseSummary;
        ResponseData = responseData;
        Reasoning = reasoning;
        LatencyMs = latencyMs;
        Succeeded = succeeded;
    }
}
