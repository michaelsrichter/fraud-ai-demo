using FraudDemo.Application.Abstractions;
using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Enums;

namespace FraudDemo.Application.Services;

/// <summary>
/// Synthesizes expense records, optionally injecting fraud per
/// <see cref="SimulationConfiguration.Intensity"/> + <see cref="PatternWeights"/>.
/// </summary>
public sealed class FraudInjector : IFraudInjector
{
    private const decimal CompanyExpenseThreshold = 1_000m; // policy threshold for "threshold gaming"
    private static readonly string[] AnomalousVendors = { "OffshoreLLC", "QuickCash", "ShellCorp", "Untraceable", "GreyMarket" };

    public IReadOnlyList<ExpenseRecord> Generate(
        IReadOnlyList<Employee> employees,
        SimulationConfiguration config,
        DateTimeOffset asOfUtc,
        Random rng)
    {
        ArgumentNullException.ThrowIfNull(employees);
        ArgumentNullException.ThrowIfNull(config);
        ArgumentNullException.ThrowIfNull(rng);
        if (employees.Count == 0) throw new ArgumentException("At least one employee required.", nameof(employees));

        var weights = config.PatternWeights;
        var records = new List<ExpenseRecord>(config.RecordCount);

        var fraudCount = (int)Math.Round(config.RecordCount * (double)config.Intensity);
        // Sample fraud indices uniformly across the run.
        var fraudIndices = new HashSet<int>();
        while (fraudIndices.Count < fraudCount)
        {
            fraudIndices.Add(rng.Next(config.RecordCount));
        }

        // Distribute fraud indices across the three patterns according to weights.
        var fraudList = fraudIndices.OrderBy(i => i).ToList();
        var w1 = (int)Math.Round(fraudList.Count * (double)weights.ThresholdGaming);
        var w2 = (int)Math.Round(fraudList.Count * (double)weights.UnusualFrequency);
        var indexToPattern = new Dictionary<int, FraudPattern>(fraudList.Count);
        for (var i = 0; i < fraudList.Count; i++)
        {
            FraudPattern p = i < w1 ? FraudPattern.ThresholdGaming
                : i < w1 + w2 ? FraudPattern.UnusualFrequency
                : FraudPattern.VendorAnomaly;
            indexToPattern[fraudList[i]] = p;
        }

        for (var i = 0; i < config.RecordCount; i++)
        {
            var employee = employees[rng.Next(employees.Count)];
            ExpenseRecord rec;
            if (indexToPattern.TryGetValue(i, out var pattern))
            {
                rec = pattern switch
                {
                    FraudPattern.ThresholdGaming => GenerateThresholdGaming(employee, asOfUtc, rng),
                    FraudPattern.UnusualFrequency => GenerateUnusualFrequency(employee, asOfUtc, rng),
                    FraudPattern.VendorAnomaly => GenerateVendorAnomaly(employee, asOfUtc, rng),
                    _ => GenerateNormal(employee, asOfUtc, rng),
                };
            }
            else
            {
                rec = GenerateNormal(employee, asOfUtc, rng);
            }
            records.Add(rec);
        }

        return records;
    }

    private static ExpenseRecord GenerateNormal(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        var amount = (decimal)Math.Round(50 + rng.NextDouble() * (double)e.BaselineMonthlyExpense * 0.4, 2);
        var category = e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        var submitted = asOfUtc.AddDays(-rng.Next(0, 90)).AddMinutes(-rng.Next(0, 24 * 60));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, false, null);
    }

    private static ExpenseRecord GenerateThresholdGaming(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        var jitter = (decimal)(rng.NextDouble() * 12 - 1); // -1 .. +11
        var amount = CompanyExpenseThreshold - 1m + jitter; // tightly under the threshold
        if (amount <= 0) amount = 1m;
        var category = e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        var submitted = asOfUtc.AddDays(-rng.Next(0, 90));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, true, FraudPattern.ThresholdGaming);
    }

    private static ExpenseRecord GenerateUnusualFrequency(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        // Weekend + late-night + atypical category + moderate-to-high amount → multi-feature anomaly
        var amount = (decimal)Math.Round(200 + rng.NextDouble() * 600, 2); // $200-$800 (not tiny)
        // Pick a category the employee does NOT normally use (atypical → categoryDeviation=1)
        var allCategories = new[] { "Travel", "Meals", "Lodging", "Office", "Training", "Software", "Conferences", "Equipment", "Communications", "Subscriptions" };
        var atypical = allCategories.Where(c => !e.TypicalCategories.Contains(c)).ToArray();
        var category = atypical.Length > 0 ? atypical[rng.Next(atypical.Length)] : e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        // Choose Saturday or Sunday in the recent past
        var daysBack = rng.Next(0, 90);
        var submitted = asOfUtc.AddDays(-daysBack);
        while (submitted.DayOfWeek != DayOfWeek.Saturday && submitted.DayOfWeek != DayOfWeek.Sunday)
        {
            submitted = submitted.AddDays(-1);
        }
        submitted = submitted.AddHours(rng.Next(22, 26) % 24).AddMinutes(rng.Next(0, 60));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, true, FraudPattern.UnusualFrequency);
    }

    private static ExpenseRecord GenerateVendorAnomaly(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        // Shell-company vendor + high amount + atypical category → multi-feature anomaly
        var vendor = AnomalousVendors[rng.Next(AnomalousVendors.Length)];
        var amount = (decimal)Math.Round(800 + rng.NextDouble() * 4_000, 2); // $800-$4800 (high, triggers amountZ)
        // Pick a category the employee does NOT normally use
        var allCategories = new[] { "Travel", "Meals", "Lodging", "Office", "Training", "Software", "Conferences", "Equipment", "Communications", "Subscriptions" };
        var atypical = allCategories.Where(c => !e.TypicalCategories.Contains(c)).ToArray();
        var category = atypical.Length > 0 ? atypical[rng.Next(atypical.Length)] : e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var submitted = asOfUtc.AddDays(-rng.Next(0, 90)).AddMinutes(-rng.Next(0, 24 * 60));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, true, FraudPattern.VendorAnomaly);
    }
}
