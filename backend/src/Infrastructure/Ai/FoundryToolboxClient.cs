using Azure.Core;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;

namespace FraudDemo.Infrastructure.Ai;

/// <summary>
/// Connects to the Foundry Toolbox MCP endpoint to retrieve Code Interpreter
/// and other tools (FR-007, FR-008). Auth via DefaultAzureCredential with
/// bearer token injection. Graceful degradation on failure (FR-009).
///
/// Key Foundry Toolbox requirements (from MS docs):
/// - Required header: Foundry-Features: Toolboxes=V1Preview
/// - Consumer endpoint (uses default_version): {project}/toolboxes/{name}/mcp?api-version=v1
/// - Foundry MCP server does NOT implement ping or prompts/list (500 errors)
/// </summary>
public sealed class FoundryToolboxClient : IFoundryToolboxClient, IAsyncDisposable
{
    private static readonly string[] AiScope = ["https://ai.azure.com/.default"];

    private readonly FoundryOptions _options;
    private readonly TokenCredential _credential;
    private readonly ILogger<FoundryToolboxClient> _logger;

    private McpClient? _mcpClient;
    private readonly SemaphoreSlim _connectLock = new(1, 1);

    public FoundryToolboxClient(
        IOptions<FoundryOptions> options,
        TokenCredential credential,
        ILogger<FoundryToolboxClient> logger)
    {
        _options = options.Value;
        _credential = credential;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AITool>?> GetToolsAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ProjectEndpoint))
        {
            _logger.LogWarning("Foundry ProjectEndpoint not configured — toolbox unavailable");
            return null;
        }

        try
        {
            await _connectLock.WaitAsync(cancellationToken);
            try
            {
                if (_mcpClient is null)
                {
                    var toolboxUrl = BuildToolboxUrl();
                    _logger.LogInformation("Connecting to Foundry Toolbox MCP: {Url}", toolboxUrl);

                    // Get bearer token for Foundry auth (scope: https://ai.azure.com/.default)
                    var tokenRequest = new TokenRequestContext(AiScope);
                    var token = await _credential.GetTokenAsync(tokenRequest, cancellationToken);

                    var transport = new HttpClientTransport(new HttpClientTransportOptions
                    {
                        Endpoint = new Uri(toolboxUrl),
                        AdditionalHeaders = new Dictionary<string, string>
                        {
                            ["Authorization"] = $"Bearer {token.Token}",
                            // Required by Foundry Toolbox API — calls fail without this header
                            ["Foundry-Features"] = "Toolboxes=V1Preview",
                        },
                        // Code Interpreter sandbox spin-up can take 90s+; extend connection timeout
                        ConnectionTimeout = TimeSpan.FromSeconds(180),
                    });

                    // Foundry Toolbox MCP server does not implement prompts/list or ping;
                    // disable capabilities that would trigger those calls.
                    var clientOptions = new McpClientOptions
                    {
                        ClientInfo = new Implementation { Name = "fraud-demo-agent", Version = "1.0" },
                        Capabilities = new ClientCapabilities(),
                    };

                    _mcpClient = await McpClient.CreateAsync(transport, clientOptions, cancellationToken: cancellationToken);
                    _logger.LogInformation("Connected to Foundry Toolbox: {Server}", _mcpClient.ServerInfo?.Name ?? "unknown");
                }

                var tools = await _mcpClient.ListToolsAsync(cancellationToken: cancellationToken);
                _logger.LogInformation("Retrieved {Count} tools from Foundry Toolbox", tools.Count);
                return tools.Cast<AITool>().ToList();
            }
            finally
            {
                _connectLock.Release();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to Foundry Toolbox — returning null (graceful degradation)");
            return null;
        }
    }

    public async Task CloseAsync()
    {
        if (_mcpClient is not null)
        {
            await _mcpClient.DisposeAsync();
            _mcpClient = null;
        }
    }

    public async ValueTask DisposeAsync()
    {
        await CloseAsync();
        _connectLock.Dispose();
    }

    /// <summary>
    /// Builds the consumer MCP endpoint URL. Uses the versionless consumer pattern
    /// ({project}/toolboxes/{name}/mcp) which always serves the default_version.
    /// </summary>
    private string BuildToolboxUrl()
    {
        var endpoint = _options.ProjectEndpoint.TrimEnd('/');
        return $"{endpoint}/toolboxes/{_options.ToolboxName}/mcp?api-version=v1";
    }
}
