namespace FraudDemo.Application.Configuration;

public sealed class StorageOptions
{
    public string BlobEndpoint { get; set; } = string.Empty;
    public string TableEndpoint { get; set; } = string.Empty;
    public bool UseDevelopmentStorage { get; set; }
}

public sealed class FoundryOptions
{
    public string Endpoint { get; set; } = string.Empty;
    public string ModelDeploymentName { get; set; } = "gpt-fraud-investigator";
    public string ProjectEndpoint { get; set; } = string.Empty;
    public string ToolboxName { get; set; } = "fraud-ai-tools";
    public string ToolboxVersion { get; set; } = "1";
}

public sealed class AgentToolOptions
{
    public int MaxToolCalls { get; set; } = 10;
    public int ToolTimeoutSeconds { get; set; } = 60;
}

public sealed class DetectionOptions
{
    public decimal DefaultLowThreshold { get; set; } = 0.55m;
    public decimal DefaultHighThreshold { get; set; } = 0.85m;
}
