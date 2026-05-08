using Microsoft.Extensions.AI;

namespace FraudDemo.Application.Abstractions;

/// <summary>
/// Connects to a Foundry Toolbox MCP endpoint and retrieves available tools
/// (e.g., Code Interpreter) for the AI agent (FR-007, FR-008).
/// </summary>
public interface IFoundryToolboxClient
{
    /// <summary>
    /// Gets the tools available from the Foundry Toolbox.
    /// Returns null if the toolbox is unavailable (FR-009 graceful degradation).
    /// </summary>
    Task<IReadOnlyList<AITool>?> GetToolsAsync(CancellationToken cancellationToken = default);

    /// <summary>Closes the MCP connection cleanly.</summary>
    Task CloseAsync();
}
