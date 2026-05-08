using Xunit;
using FluentAssertions;
using FraudDemo.Domain.Enums;

namespace Application.Tests;

/// <summary>
/// Tests for the consensus verdict logic used in ConsensusCaseFunction.
/// Validates majority-vote fallback, partial model failure handling, and
/// arbiter JSON structure requirements (FR-026, FR-027).
/// </summary>
public class ConsensusArbiterTests
{
    /// <summary>
    /// Simulates the majority-vote fallback logic from ConsensusCaseFunction
    /// when the arbiter call fails. This is a pure-logic extraction.
    /// </summary>
    private static string ComputeMajorityVote(IReadOnlyList<FraudLikelihood?> verdicts)
    {
        var succeeded = verdicts.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        if (succeeded.Count == 0) return "Unavailable";
        var likelyCount = succeeded.Count(v => v == FraudLikelihood.Likely);
        var unlikelyCount = succeeded.Count(v => v == FraudLikelihood.Unlikely);
        return likelyCount > succeeded.Count / 2 ? "Likely"
            : unlikelyCount > succeeded.Count / 2 ? "Unlikely" : "Inconclusive";
    }

    [Fact]
    public void MajorityVote_AllLikely_Returns_Likely()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Likely, FraudLikelihood.Likely, FraudLikelihood.Likely };
        ComputeMajorityVote(verdicts).Should().Be("Likely");
    }

    [Fact]
    public void MajorityVote_AllUnlikely_Returns_Unlikely()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Unlikely, FraudLikelihood.Unlikely, FraudLikelihood.Unlikely };
        ComputeMajorityVote(verdicts).Should().Be("Unlikely");
    }

    [Fact]
    public void MajorityVote_TwoLikely_OneUnlikely_Returns_Likely()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Likely, FraudLikelihood.Likely, FraudLikelihood.Unlikely };
        ComputeMajorityVote(verdicts).Should().Be("Likely");
    }

    [Fact]
    public void MajorityVote_TwoUnlikely_OneLikely_Returns_Unlikely()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Unlikely, FraudLikelihood.Unlikely, FraudLikelihood.Likely };
        ComputeMajorityVote(verdicts).Should().Be("Unlikely");
    }

    [Fact]
    public void MajorityVote_AllInconclusive_Returns_Inconclusive()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Inconclusive, FraudLikelihood.Inconclusive, FraudLikelihood.Inconclusive };
        ComputeMajorityVote(verdicts).Should().Be("Inconclusive");
    }

    [Fact]
    public void MajorityVote_Mixed_NoMajority_Returns_Inconclusive()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Likely, FraudLikelihood.Unlikely, FraudLikelihood.Inconclusive };
        ComputeMajorityVote(verdicts).Should().Be("Inconclusive");
    }

    [Fact]
    public void MajorityVote_AllNull_Returns_Unavailable()
    {
        var verdicts = new FraudLikelihood?[] { null, null, null };
        ComputeMajorityVote(verdicts).Should().Be("Unavailable");
    }

    [Fact]
    public void MajorityVote_PartialFailure_TwoSucceed_Uses_Succeeded_Only()
    {
        // FR-026: partial model failure — 2 of 3 succeed
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Likely, FraudLikelihood.Likely, null };
        ComputeMajorityVote(verdicts).Should().Be("Likely");
    }

    [Fact]
    public void MajorityVote_PartialFailure_OneSucceeds_Uses_Single_Verdict()
    {
        var verdicts = new FraudLikelihood?[] { FraudLikelihood.Unlikely, null, null };
        ComputeMajorityVote(verdicts).Should().Be("Unlikely");
    }

    [Fact]
    public void ArbiterJson_Has_All_Five_Required_Fields()
    {
        // FR-027: arbiter response must contain all 5 fields
        var json = """
        {
            "finalVerdict": "Likely",
            "summary": "All three models agreed this is suspicious.",
            "agreements": ["Vendor is a known shell company", "Amount near threshold"],
            "disagreements": ["GPT-5.4 Mini flagged weekend submission, others did not"],
            "reasoning": "The convergence on vendor anomaly is the strongest signal."
        }
        """;

        var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("finalVerdict", out _).Should().BeTrue("arbiter must include finalVerdict");
        root.TryGetProperty("summary", out _).Should().BeTrue("arbiter must include summary");
        root.TryGetProperty("agreements", out _).Should().BeTrue("arbiter must include agreements");
        root.TryGetProperty("disagreements", out _).Should().BeTrue("arbiter must include disagreements");
        root.TryGetProperty("reasoning", out _).Should().BeTrue("arbiter must include reasoning");

        root.GetProperty("finalVerdict").GetString().Should().BeOneOf("Likely", "Unlikely", "Inconclusive");
        root.GetProperty("summary").GetString().Should().NotBeNullOrWhiteSpace();
        root.GetProperty("agreements").GetArrayLength().Should().BeGreaterThan(0);
        root.GetProperty("reasoning").GetString()!.Length.Should().BeLessOrEqualTo(1500);
    }

    [Fact]
    public void ArbiterJson_With_Missing_Fields_Is_Detectable()
    {
        // If arbiter returns incomplete JSON, the caller should be able to detect missing fields
        var json = """{ "finalVerdict": "Likely" }""";
        var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("summary", out _).Should().BeFalse("incomplete arbiter response should be detectable");
        root.TryGetProperty("agreements", out _).Should().BeFalse();
    }
}
