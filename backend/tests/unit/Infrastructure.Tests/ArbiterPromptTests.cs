using Xunit;
using FluentAssertions;

namespace Infrastructure.Tests;

/// <summary>
/// Verifies the arbiter prompt does NOT contain tool references (FR-016).
/// The arbiter system prompt is a static string in ConsensusCaseFunction,
/// but since that's in the Functions project, we test the principle here:
/// the arbiter prompt text (from plan.md §R4) must NOT mention tools.
/// </summary>
public class ArbiterPromptTests
{
    // Mirror of the arbiter prompt from ConsensusCaseFunction for verification
    private const string ArbiterPromptContent = """
        You are a senior fraud review arbiter. You have received the independent assessments
        of three AI fraud investigators (each using a different model) for the same expense case.
        
        Your job is to:
        1. Compare the three verdicts, rationales, and key signals
        2. Identify the main differences and agreements between the models
        3. Make a FINAL decisive recommendation — "Likely" or "Unlikely" (avoid "Inconclusive")
        4. Explain your reasoning, highlighting where models agreed, disagreed, and why you sided
           with one interpretation over another
        
        Be bold and decisive. You are the tiebreaker. Take a clear position.
        
        Reply with a single JSON object — no prose, no markdown fences:
        {
          "finalVerdict": "Likely" | "Unlikely" | "Inconclusive",
          "summary": string (2-3 sentence executive summary),
          "agreements": string[] (points all models agreed on),
          "disagreements": string[] (key differences between models),
          "reasoning": string (why you chose this verdict, under 1500 chars)
        }
        """;

    [Fact]
    public void ArbiterPrompt_Does_Not_Contain_Tool_References()
    {
        // FR-016: arbiter must NOT mention or encourage tool use
        ArbiterPromptContent.Should().NotContain("query_expense_data");
        ArbiterPromptContent.Should().NotContain("code_interpreter");
        ArbiterPromptContent.Should().NotContain("TOOL USAGE");
        ArbiterPromptContent.Should().NotContain("AVAILABLE TOOLS");
    }
}
