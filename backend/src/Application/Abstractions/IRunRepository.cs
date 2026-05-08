using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;

namespace FraudDemo.Application.Abstractions;

public sealed record RunListPage(IReadOnlyList<RunSummary> Items, string? ContinuationToken);

public sealed record RunWithEtag(Run Run, string ETag);

/// <summary>Persistence seam for Runs (research §R3, §R4).</summary>
public interface IRunRepository
{
    Task<string> CreateAsync(Run run, CancellationToken cancellationToken);

    Task<RunWithEtag?> LoadAsync(Guid runId, CancellationToken cancellationToken);

    /// <summary>Conditional save (ETag). Returns the new ETag, or null on precondition failure.</summary>
    Task<string?> UpdateAsync(Run run, string ifMatchEtag, CancellationToken cancellationToken);

    Task<RunListPage> ListAsync(int take, string? continuationToken, string? ownerId, CancellationToken cancellationToken);

    Task<bool> DeleteAsync(Guid runId, CancellationToken cancellationToken);
}
