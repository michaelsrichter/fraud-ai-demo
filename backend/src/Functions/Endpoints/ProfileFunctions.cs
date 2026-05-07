using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure;
using Azure.Core;
using Azure.Data.Tables;
using FraudDemo.Application.Configuration;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FraudDemo.Functions.Endpoints;

/// <summary>
/// User profile management — stored in Azure Table Storage.
/// POST /api/profiles — create/update profile
/// GET /api/profiles — admin: list all profiles
/// POST /api/profiles/activity — track activity
/// </summary>
public sealed class ProfileFunctions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly TableClient _table;
    private readonly ILogger<ProfileFunctions> _logger;

    public ProfileFunctions(IOptions<StorageOptions> storageOptions, TokenCredential credential, ILogger<ProfileFunctions> logger)
    {
        var opts = storageOptions.Value;
        _logger = logger;

        if (opts.UseDevelopmentStorage)
        {
            _table = new TableClient("UseDevelopmentStorage=true", "UserProfiles");
        }
        else
        {
            _table = new TableClient(new Uri(opts.TableEndpoint), "UserProfiles", credential);
        }
        _table.CreateIfNotExists();
    }

    [Function("upsertProfile")]
    public async Task<HttpResponseData> UpsertProfileAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "profiles")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body, JsonOptions, cancellationToken);
        var userId = body.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
        if (string.IsNullOrWhiteSpace(userId))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            return bad;
        }

        var entity = new TableEntity("profiles", userId)
        {
            ["Name"] = body.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
            ["Role"] = body.TryGetProperty("role", out var r) ? r.GetString() ?? "" : "",
            ["Company"] = body.TryGetProperty("company", out var c) ? c.GetString() ?? "" : "",
            ["Location"] = body.TryGetProperty("location", out var l) ? l.GetString() ?? "" : "",
            ["CreatedAt"] = body.TryGetProperty("createdAt", out var ca) ? ca.GetString() ?? "" : "",
            ["LastSeenUtc"] = DateTimeOffset.UtcNow.ToString("O"),
            ["ExpenseLabRuns"] = 0,
            ["InsuranceLabRuns"] = 0,
            ["PaymentLabRuns"] = 0,
            ["AiInvestigations"] = 0,
        };

        // Try to merge (preserve activity counts if profile already exists)
        try
        {
            var existing = await _table.GetEntityAsync<TableEntity>("profiles", userId, cancellationToken: cancellationToken);
            entity["ExpenseLabRuns"] = existing.Value.GetInt32("ExpenseLabRuns") ?? 0;
            entity["InsuranceLabRuns"] = existing.Value.GetInt32("InsuranceLabRuns") ?? 0;
            entity["PaymentLabRuns"] = existing.Value.GetInt32("PaymentLabRuns") ?? 0;
            entity["AiInvestigations"] = existing.Value.GetInt32("AiInvestigations") ?? 0;
        }
        catch (RequestFailedException ex) when (ex.Status == 404) { /* new profile */ }

        await _table.UpsertEntityAsync(entity, TableUpdateMode.Replace, cancellationToken);
        _logger.LogInformation("Profile upserted: {UserId}", userId);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { id = userId, status = "ok" }, cancellationToken);
        return response;
    }

    [Function("trackActivity")]
    public async Task<HttpResponseData> TrackActivityAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "profiles/activity")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body, JsonOptions, cancellationToken);
        var userId = body.TryGetProperty("userId", out var idProp) ? idProp.GetString() ?? "" : "";
        var activity = body.TryGetProperty("activity", out var actProp) ? actProp.GetString() ?? "" : "";

        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(activity))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            return bad;
        }

        try
        {
            var existing = await _table.GetEntityAsync<TableEntity>("profiles", userId, cancellationToken: cancellationToken);
            var entity = existing.Value;
            entity["LastSeenUtc"] = DateTimeOffset.UtcNow.ToString("O");

            var column = activity switch
            {
                "expense-run" => "ExpenseLabRuns",
                "insurance-run" => "InsuranceLabRuns",
                "payment-run" => "PaymentLabRuns",
                "ai-investigation" => "AiInvestigations",
                _ => null,
            };

            if (column is not null)
            {
                var current = entity.GetInt32(column) ?? 0;
                entity[column] = current + 1;
            }

            await _table.UpdateEntityAsync(entity, entity.ETag, TableUpdateMode.Replace, cancellationToken);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            // Profile doesn't exist yet — ignore
        }

        var response = req.CreateResponse(HttpStatusCode.NoContent);
        return response;
    }

    [Function("listProfiles")]
    public async Task<HttpResponseData> ListProfilesAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "profiles")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        var profiles = new List<object>();
        await foreach (var entity in _table.QueryAsync<TableEntity>(filter: "PartitionKey eq 'profiles'", cancellationToken: cancellationToken))
        {
            profiles.Add(new
            {
                id = entity.RowKey,
                name = entity.GetString("Name"),
                role = entity.GetString("Role"),
                company = entity.GetString("Company"),
                location = entity.GetString("Location"),
                createdAt = entity.GetString("CreatedAt"),
                lastSeenUtc = entity.GetString("LastSeenUtc"),
                expenseLabRuns = entity.GetInt32("ExpenseLabRuns") ?? 0,
                insuranceLabRuns = entity.GetInt32("InsuranceLabRuns") ?? 0,
                paymentLabRuns = entity.GetInt32("PaymentLabRuns") ?? 0,
                aiInvestigations = entity.GetInt32("AiInvestigations") ?? 0,
            });
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { profiles, count = profiles.Count }, cancellationToken);
        return response;
    }
}
