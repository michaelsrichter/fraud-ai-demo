using Xunit;
using FluentAssertions;
using FraudDemo.Infrastructure.Ai;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;
using FraudDemo.Domain.Projections;

namespace Infrastructure.Tests;

public class AgentInvestigatorTests
{
    private static Run MakeRun()
    {
        var emp = new Employee(Guid.NewGuid(), "Test User", "Sales", "IC", 2000m,
            new[] { "Travel" }, new[] { "AcmeAir" });
        var expense = new ExpenseRecord(Guid.NewGuid(), emp.EmployeeId,
            DateTimeOffset.UtcNow.AddDays(-5), 950m, "Travel", "OffshoreLLC", true, FraudPattern.VendorAnomaly);
        var detection = new DetectionResult(expense.RecordId, 0.9, 0.92,
            ConfidenceBand.High, new[] { new FeatureContribution("vendorRarity", 3.5f, 3.5) });
        return new Run(Guid.NewGuid(), "test-owner", DateTimeOffset.UtcNow,
            new SimulationConfiguration(100, 10, 0.15m,
                new PatternWeights(0.34m, 0.33m, 0.33m),
                BandThresholds.Default, 42, "test"),
            Enumerable.Range(0, 9).Select(_ => new Employee(Guid.NewGuid(), "Extra", "Sales", "IC", 1000m, new[] { "Travel" }, new[] { "AcmeAir" })).Prepend(emp).ToList(), new[] { expense }, new[] { detection },
            new Dictionary<Guid, AiInvestigationResult>(),
            new BandCounts(5, 10, 85));
    }

    [Fact]
    public void BuildPrompt_Never_Includes_InjectedFraud_Fields()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var employee = run.Employees[0];
        var detection = run.DetectionResults[0];
        var c = new Case(expense, employee, detection, null);

        var prompt = AgentInvestigator.BuildPrompt(run, c);

        prompt.Should().NotContainEquivalentOf("isInjectedFraud");
        prompt.Should().NotContainEquivalentOf("injectedPattern");
        prompt.Should().NotContainEquivalentOf("OffshoreLLC".ToLower() + "fraud");
    }

    [Fact]
    public void BuildPrompt_Contains_All_Five_Sections()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var employee = run.Employees[0];
        var detection = run.DetectionResults[0];
        var c = new Case(expense, employee, detection, null);

        var prompt = AgentInvestigator.BuildPrompt(run, c);

        prompt.Should().Contain("=== 1. CASE UNDER REVIEW ===");
        prompt.Should().Contain("=== 2. EMPLOYEE PROFILE ===");
        prompt.Should().Contain("=== 3. RECENT 90-DAY HISTORY ===");
        prompt.Should().Contain("=== 4. PEER COMPARISON");
        prompt.Should().Contain("=== 5. RUN CONTEXT ===");
    }

    [Fact]
    public void BuildPrompt_Contains_Case_Details()
    {
        var run = MakeRun();
        var expense = run.Expenses[0];
        var employee = run.Employees[0];
        var detection = run.DetectionResults[0];
        var c = new Case(expense, employee, detection, null);

        var prompt = AgentInvestigator.BuildPrompt(run, c);

        prompt.Should().Contain(expense.RecordId.ToString("D"));
        prompt.Should().Contain("950.00");
        prompt.Should().Contain(employee.Name);
        prompt.Should().Contain(employee.Department);
        prompt.Should().Contain("vendorRarity");
    }

    [Fact]
    public void SystemPrompt_Contains_Bold_And_Decisive_Language()
    {
        // FR-028: system prompt must instruct models to be bold and decisive
        var prompt = AgentInvestigator.SystemPromptText;

        prompt.Should().ContainAny("bold", "Bold", "BOLD");
        prompt.Should().ContainAny("decisive", "Decisive", "DECISIVE");
    }

    [Fact]
    public void SystemPrompt_Discourages_Inconclusive_Verdict()
    {
        // FR-028: Inconclusive should be rare last resort
        var prompt = AgentInvestigator.SystemPromptText;

        // Must mention Inconclusive in a discouraging context
        prompt.Should().Contain("Inconclusive");
        // Should contain language indicating it's a last resort
        prompt.Should().ContainAny("last resort", "rare", "ONLY");
    }

    [Fact]
    public void SystemPrompt_Prefers_Likely_Or_Unlikely_Over_Inconclusive()
    {
        // FR-028: The prompt should frame Likely/Unlikely as the expected outcomes
        var prompt = AgentInvestigator.SystemPromptText;

        prompt.Should().Contain("Likely");
        prompt.Should().Contain("Unlikely");
        // Should indicate that the AI is consulted because ML was inconclusive
        prompt.Should().ContainAny("inconclusive", "ambiguous", "tie");
    }

    [Fact]
    public void SystemPrompt_Describes_DataRetrieval_Tool()
    {
        // FR-014: system prompt must describe the query_expense_data tool
        var prompt = AgentInvestigator.SystemPromptText;
        prompt.Should().Contain("query_expense_data");
        prompt.Should().Contain("AVAILABLE TOOLS");
        prompt.Should().Contain("TOOL USAGE GUIDANCE");
    }

    [Fact]
    public void SystemPrompt_Describes_CodeInterpreter_Tool()
    {
        // FR-014: system prompt must describe the code_interpreter tool
        var prompt = AgentInvestigator.SystemPromptText;
        prompt.Should().Contain("code_interpreter");
        prompt.Should().Contain("Python");
    }

    [Fact]
    public void SystemPrompt_Encourages_Tool_Use()
    {
        // FR-015: system prompt must encourage tool use
        var prompt = AgentInvestigator.SystemPromptText;
        prompt.Should().Contain("ALWAYS use");
        prompt.Should().Contain("USE THEM");
    }
}
