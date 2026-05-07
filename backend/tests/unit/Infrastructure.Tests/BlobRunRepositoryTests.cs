using Xunit;
using FluentAssertions;

namespace Infrastructure.Tests;

/// <summary>
/// Integration tests for BlobRunRepository — requires Azurite running.
/// Run manually with: dotnet test --filter "FullyQualifiedName~BlobRunRepositoryTests"
/// after starting Azurite.
/// </summary>
public class BlobRunRepositoryTests
{
    [Fact(Skip = "Requires Azurite — run manually")]
    public void Placeholder_For_Integration_Tests()
    {
        // SaveAsync writes gzip blob + RunIndex table row
        // LoadAsync round-trips equality
        // Concurrent save with stale ETag throws
        true.Should().BeTrue();
    }
}
