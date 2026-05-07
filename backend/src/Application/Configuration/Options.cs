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
}

public sealed class DetectionOptions
{
    public decimal DefaultLowThreshold { get; set; } = 0.55m;
    public decimal DefaultHighThreshold { get; set; } = 0.85m;
}
