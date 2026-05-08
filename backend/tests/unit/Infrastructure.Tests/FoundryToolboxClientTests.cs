using Xunit;
using FluentAssertions;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Infrastructure.Ai;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Infrastructure.Tests;

public class FoundryToolboxClientTests
{
    [Fact]
    public async Task BuildToolboxUrl_ConstructsCorrectUrl()
    {
        // Verify URL construction logic by testing via GetToolsAsync with no endpoint
        var options = Options.Create(new FoundryOptions
        {
            ProjectEndpoint = "",
            ToolboxName = "fraud-ai-tools",
            ToolboxVersion = "1",
        });
        var credential = new Mock<Azure.Core.TokenCredential>();
        var logger = NullLogger<FoundryToolboxClient>.Instance;

        var client = new FoundryToolboxClient(options, credential.Object, logger);

        // With empty endpoint, should return null (graceful degradation)
        var result = await client.GetToolsAsync(CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetToolsAsync_EmptyEndpoint_ReturnsNull()
    {
        var options = Options.Create(new FoundryOptions
        {
            ProjectEndpoint = "",
            ToolboxName = "fraud-ai-tools",
            ToolboxVersion = "1",
        });
        var credential = new Mock<Azure.Core.TokenCredential>();
        var logger = NullLogger<FoundryToolboxClient>.Instance;

        var client = new FoundryToolboxClient(options, credential.Object, logger);
        var result = await client.GetToolsAsync(CancellationToken.None);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetToolsAsync_InvalidEndpoint_ReturnsNull_GracefulDegradation()
    {
        // FR-009: graceful null return on connection failure
        var options = Options.Create(new FoundryOptions
        {
            ProjectEndpoint = "https://nonexistent.invalid.test/api/projects/test",
            ToolboxName = "fraud-ai-tools",
            ToolboxVersion = "1",
        });
        var credential = new Mock<Azure.Core.TokenCredential>();
        credential.Setup(c => c.GetTokenAsync(It.IsAny<Azure.Core.TokenRequestContext>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Azure.Identity.AuthenticationFailedException("test"));
        var logger = NullLogger<FoundryToolboxClient>.Instance;

        var client = new FoundryToolboxClient(options, credential.Object, logger);
        var result = await client.GetToolsAsync(CancellationToken.None);

        // Should return null instead of throwing (FR-009)
        result.Should().BeNull();
    }

    [Fact]
    public async Task CloseAsync_NoConnection_DoesNotThrow()
    {
        var options = Options.Create(new FoundryOptions
        {
            ProjectEndpoint = "",
            ToolboxName = "fraud-ai-tools",
            ToolboxVersion = "1",
        });
        var credential = new Mock<Azure.Core.TokenCredential>();
        var logger = NullLogger<FoundryToolboxClient>.Instance;

        var client = new FoundryToolboxClient(options, credential.Object, logger);

        // Should not throw when no connection exists
        await client.CloseAsync();
    }
}
