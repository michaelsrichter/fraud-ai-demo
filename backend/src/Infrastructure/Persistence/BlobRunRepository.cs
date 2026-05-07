using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure;
using Azure.Core;
using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FraudDemo.Infrastructure.Persistence;

/// <summary>
/// Persists Runs as gzip JSON blobs (research §R3) with ETag-conditioned writes (research §R4).
/// Mirrors a row in the <c>RunIndex</c> table for fast list views.
/// </summary>
public sealed class BlobRunRepository : IRunRepository
{
    private const string BlobContainerName = "runs";
    private const string TableName = "RunIndex";
    private const string IndexPartition = "v1";

    private readonly BlobContainerClient _container;
    private readonly TableClient _table;
    private readonly ILogger<BlobRunRepository> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public BlobRunRepository(IOptions<StorageOptions> storageOptions, TokenCredential credential, ILogger<BlobRunRepository> logger)
    {
        ArgumentNullException.ThrowIfNull(storageOptions);
        ArgumentNullException.ThrowIfNull(credential);
        var opts = storageOptions.Value;
        _logger = logger;

        if (opts.UseDevelopmentStorage)
        {
            // Azurite path — connection strings are allowed in dev only.
            const string devConnection = "UseDevelopmentStorage=true";
            var blobService = new BlobServiceClient(devConnection);
            _container = blobService.GetBlobContainerClient(BlobContainerName);
            _table = new TableClient(devConnection, TableName);
        }
        else
        {
            var blobService = new BlobServiceClient(new Uri(opts.BlobEndpoint), credential);
            _container = blobService.GetBlobContainerClient(BlobContainerName);
            _table = new TableClient(new Uri(opts.TableEndpoint), TableName, credential);
        }

        _container.CreateIfNotExists();
        _table.CreateIfNotExists();
    }

    private static string BlobName(Guid runId) => $"{runId:D}.json.gz";

    public async Task<string> CreateAsync(Run run, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(run);
        var blob = _container.GetBlobClient(BlobName(run.RunId));
        var bytes = SerializeGzip(run);

        var response = await blob.UploadAsync(
            new BinaryData(bytes),
            new BlobUploadOptions
            {
                Conditions = new BlobRequestConditions { IfNoneMatch = new ETag("*") },
                HttpHeaders = new BlobHttpHeaders { ContentEncoding = "gzip", ContentType = "application/json" },
            },
            cancellationToken);

        var etag = response.Value.ETag.ToString();
        await UpsertIndexAsync(run, cancellationToken);
        _logger.LogInformation("Run {RunId} created (etag={ETag}, bytes={Bytes})", run.RunId, etag, bytes.Length);
        return etag;
    }

    public async Task<RunWithEtag?> LoadAsync(Guid runId, CancellationToken cancellationToken)
    {
        var blob = _container.GetBlobClient(BlobName(runId));
        try
        {
            var dl = await blob.DownloadContentAsync(cancellationToken);
            var run = DeserializeGzip(dl.Value.Content.ToArray());
            return new RunWithEtag(run, dl.Value.Details.ETag.ToString());
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task<string?> UpdateAsync(Run run, string ifMatchEtag, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(run);
        var blob = _container.GetBlobClient(BlobName(run.RunId));
        var bytes = SerializeGzip(run);
        try
        {
            var response = await blob.UploadAsync(
                new BinaryData(bytes),
                new BlobUploadOptions
                {
                    Conditions = new BlobRequestConditions { IfMatch = new ETag(ifMatchEtag) },
                    HttpHeaders = new BlobHttpHeaders { ContentEncoding = "gzip", ContentType = "application/json" },
                },
                cancellationToken);
            await UpsertIndexAsync(run, cancellationToken);
            return response.Value.ETag.ToString();
        }
        catch (RequestFailedException ex) when (ex.Status == 412)
        {
            _logger.LogWarning("Run {RunId} update rejected by ETag precondition", run.RunId);
            return null;
        }
    }

    public async Task<RunListPage> ListAsync(int take, string? continuationToken, CancellationToken cancellationToken)
    {
        var pageable = _table.QueryAsync<RunIndexEntity>(
            filter: $"PartitionKey eq '{IndexPartition}'",
            maxPerPage: take,
            cancellationToken: cancellationToken);

        var items = new List<RunSummary>(take);
        string? next = null;
        await foreach (var page in pageable.AsPages(continuationToken).WithCancellation(cancellationToken))
        {
            foreach (var row in page.Values)
            {
                items.Add(row.ToSummary());
                if (items.Count >= take) break;
            }
            if (items.Count >= take)
            {
                next = page.ContinuationToken;
                break;
            }
        }
        // Newest first
        items = items.OrderByDescending(r => r.CreatedUtc).ToList();
        return new RunListPage(items, next);
    }

    public async Task<bool> DeleteAsync(Guid runId, CancellationToken cancellationToken)
    {
        var blob = _container.GetBlobClient(BlobName(runId));
        try
        {
            await blob.DeleteIfExistsAsync(cancellationToken: cancellationToken);
            await _table.DeleteEntityAsync(IndexPartition, runId.ToString("D"), cancellationToken: cancellationToken);
            _logger.LogInformation("Run {RunId} deleted", runId);
            return true;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return false;
        }
    }

    private async Task UpsertIndexAsync(Run run, CancellationToken cancellationToken)
    {
        var summary = new RunSummary(
            run.RunId,
            run.CreatedUtc,
            run.Expenses.Count,
            run.BandCounts,
            run.Configuration.Intensity,
            run.Configuration.PatternWeights,
            run.Investigations.Count);
        var entity = RunIndexEntity.From(summary);
        await _table.UpsertEntityAsync(entity, TableUpdateMode.Replace, cancellationToken);
    }

    private static byte[] SerializeGzip(Run run)
    {
        using var ms = new MemoryStream();
        using (var gz = new GZipStream(ms, CompressionLevel.Fastest, leaveOpen: true))
        {
            JsonSerializer.Serialize(gz, run, JsonOptions);
        }
        return ms.ToArray();
    }

    private static Run DeserializeGzip(byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        using var gz = new GZipStream(ms, CompressionMode.Decompress);
        var run = JsonSerializer.Deserialize<Run>(gz, JsonOptions);
        return run ?? throw new InvalidDataException("Run deserialization returned null.");
    }

    private sealed class RunIndexEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = IndexPartition;
        public string RowKey { get; set; } = string.Empty;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string CreatedUtc { get; set; } = string.Empty;
        public int RecordCount { get; set; }
        public int High { get; set; }
        public int Medium { get; set; }
        public int Low { get; set; }
        public double Intensity { get; set; }
        public double Wt { get; set; }
        public double Wf { get; set; }
        public double Wv { get; set; }
        public int InvestigationCount { get; set; }
        public string SummaryJson { get; set; } = string.Empty;

        public static RunIndexEntity From(RunSummary s) => new()
        {
            PartitionKey = IndexPartition,
            RowKey = s.RunId.ToString("D"),
            CreatedUtc = s.CreatedUtc.ToString("O"),
            RecordCount = s.RecordCount,
            High = s.BandCounts.High,
            Medium = s.BandCounts.Medium,
            Low = s.BandCounts.Low,
            Intensity = (double)s.Intensity,
            Wt = (double)s.PatternWeights.ThresholdGaming,
            Wf = (double)s.PatternWeights.UnusualFrequency,
            Wv = (double)s.PatternWeights.VendorAnomaly,
            InvestigationCount = s.InvestigationCount,
            SummaryJson = JsonSerializer.Serialize(s, JsonOptions),
        };

        public RunSummary ToSummary() => JsonSerializer.Deserialize<RunSummary>(SummaryJson, JsonOptions)!;
    }
}
