namespace FraudDemo.Application.Dtos;

/// <summary>Serialization DTO for ToolInvocation to the frontend.</summary>
public sealed record ToolInvocationDto(
    string ToolName,
    string Parameters,
    string ResponseSummary,
    string? ResponseData,
    string? Reasoning,
    long LatencyMs,
    bool Succeeded);
