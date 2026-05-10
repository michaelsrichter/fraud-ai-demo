using System.Text.Json;
using System.Text.Json.Serialization;
using FraudDemo.Application.Banding;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;

namespace FraudDemo.Infrastructure.Persistence;

/// <summary>
/// Handles backward-compatible deserialization of Run JSON.
/// Legacy runs have a flat "detectionResults" array; new runs have a "modelResults" dictionary.
/// </summary>
public sealed class RunJsonConverter : JsonConverter<Run>
{
    public override Run Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        var root = doc.RootElement;

        var runId = root.GetProperty("runId").GetGuid();
        var ownerId = root.TryGetProperty("ownerId", out var ownerProp) ? ownerProp.GetString() ?? "anonymous" : "anonymous";
        var createdUtc = root.GetProperty("createdUtc").GetDateTimeOffset();
        var configuration = JsonSerializer.Deserialize<SimulationConfiguration>(root.GetProperty("configuration").GetRawText(), options)!;
        var employees = JsonSerializer.Deserialize<List<Employee>>(root.GetProperty("employees").GetRawText(), options)!;
        var expenses = JsonSerializer.Deserialize<List<ExpenseRecord>>(root.GetProperty("expenses").GetRawText(), options)!;

        var investigations = root.TryGetProperty("investigations", out var invProp)
            ? JsonSerializer.Deserialize<Dictionary<Guid, AiInvestigationResult>>(invProp.GetRawText(), options)!
            : new Dictionary<Guid, AiInvestigationResult>();

        Dictionary<string, ModelDetectionResults> modelResults;

        if (root.TryGetProperty("modelResults", out var mrProp) && mrProp.ValueKind == JsonValueKind.Object)
        {
            modelResults = JsonSerializer.Deserialize<Dictionary<string, ModelDetectionResults>>(mrProp.GetRawText(), options)!;
        }
        else if (root.TryGetProperty("detectionResults", out var drProp) && drProp.ValueKind == JsonValueKind.Array)
        {
            // Legacy format: wrap flat array into dictionary under "randomized-pca"
            var detections = JsonSerializer.Deserialize<List<DetectionResult>>(drProp.GetRawText(), options)!;
            var bandCounts = BandingHelpers.Count(detections.Select(d => d.Band));
            modelResults = new Dictionary<string, ModelDetectionResults>
            {
                [ScorerModelId.RandomizedPca] = ModelDetectionResults.Success(ScorerModelId.RandomizedPca, detections, bandCounts),
            };
        }
        else
        {
            modelResults = new Dictionary<string, ModelDetectionResults>();
        }

        var topBandCounts = root.TryGetProperty("bandCounts", out var bcProp)
            ? JsonSerializer.Deserialize<BandCounts>(bcProp.GetRawText(), options)!
            : modelResults.Values.FirstOrDefault(m => m.Status == ModelScoringStatus.Success)?.BandCounts ?? new BandCounts(0, 0, 0);

        return new Run(runId, ownerId, createdUtc, configuration, employees, expenses, modelResults, investigations, topBandCounts);
    }

    public override void Write(Utf8JsonWriter writer, Run value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();

        writer.WriteString("runId", value.RunId);
        writer.WriteString("ownerId", value.OwnerId);
        writer.WriteString("createdUtc", value.CreatedUtc);

        writer.WritePropertyName("configuration");
        JsonSerializer.Serialize(writer, value.Configuration, options);

        writer.WritePropertyName("employees");
        JsonSerializer.Serialize(writer, value.Employees, options);

        writer.WritePropertyName("expenses");
        JsonSerializer.Serialize(writer, value.Expenses, options);

        writer.WritePropertyName("modelResults");
        JsonSerializer.Serialize(writer, value.ModelResults, options);

        // Write backward-compatible detectionResults from primary model
        writer.WritePropertyName("detectionResults");
        JsonSerializer.Serialize(writer, value.DetectionResults, options);

        writer.WritePropertyName("investigations");
        JsonSerializer.Serialize(writer, value.Investigations, options);

        writer.WritePropertyName("bandCounts");
        JsonSerializer.Serialize(writer, value.BandCounts, options);

        writer.WriteEndObject();
    }
}
