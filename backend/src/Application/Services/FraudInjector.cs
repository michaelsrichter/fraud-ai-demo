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
        // Log-normal distribution centered on employee baseline (FR-008)
        var baseline = (double)e.BaselineMonthlyExpense;
        var sigma = 0.5;
        var logMean = Math.Log(baseline * 0.3) - 0.5 * sigma * sigma;
        var amount = (decimal)Math.Round(Math.Max(5, Math.Exp(logMean + sigma * BoxMullerNormal(rng))), 2);

        // 2-5% extreme outlier injection (FR-009) — legitimate large expenses
        if (rng.NextDouble() < 0.03) // ~3% outlier rate
        {
            var multiplier = 3.0 + rng.NextDouble() * 5.0; // 3x-8x
            amount = (decimal)Math.Round((double)amount * multiplier, 2);
        }

        var category = e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        var submitted = asOfUtc.AddDays(-rng.Next(0, 90)).AddMinutes(-rng.Next(0, 24 * 60));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, false, null);
    }

    /// <summary>Box-Muller transform: generates a standard normal variate from uniform random.</summary>
    private static double BoxMullerNormal(Random rng)
    {
        var u1 = 1.0 - rng.NextDouble(); // avoid log(0)
        var u2 = rng.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    }

    private static ExpenseRecord GenerateThresholdGaming(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        // Wider jitter (-50 to +50) for subtler signal (FR-010)
        var jitter = (decimal)(rng.NextDouble() * 100 - 50); // -50 .. +50
        var amount = CompanyExpenseThreshold - 1m + jitter;
        // Occasionally generate sub-threshold amounts ($800-$950) to blend with legitimate
        if (rng.NextDouble() < 0.25)
            amount = (decimal)Math.Round(800 + rng.NextDouble() * 150, 2);
        if (amount <= 0) amount = 1m;
        var category = e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        var submitted = asOfUtc.AddDays(-rng.Next(0, 90));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, true, FraudPattern.ThresholdGaming);
    }

    private static ExpenseRecord GenerateUnusualFrequency(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        // Subtler signals: 70% weekend / 30% weekday, 20% typical category (FR-010)
        var amount = (decimal)Math.Round(200 + rng.NextDouble() * 600, 2); // $200-$800
        var allCategories = new[] { "Travel", "Meals", "Lodging", "Office", "Training", "Software", "Conferences", "Equipment", "Communications", "Subscriptions" };
        string category;
        if (rng.NextDouble() < 0.20) // 20% chance: use typical category (subtler)
        {
            category = e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        }
        else
        {
            var atypical = allCategories.Where(c => !e.TypicalCategories.Contains(c)).ToArray();
            category = atypical.Length > 0 ? atypical[rng.Next(atypical.Length)] : e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        }
        var vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        var daysBack = rng.Next(0, 90);
        var submitted = asOfUtc.AddDays(-daysBack);

        if (rng.NextDouble() < 0.70) // 70% weekend
        {
            while (submitted.DayOfWeek != DayOfWeek.Saturday && submitted.DayOfWeek != DayOfWeek.Sunday)
                submitted = submitted.AddDays(-1);
        }
        // else 30% weekday — keep as-is (may already be weekday)
        submitted = submitted.AddHours(rng.Next(22, 26) % 24).AddMinutes(rng.Next(0, 60));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, true, FraudPattern.UnusualFrequency);
    }

    private static ExpenseRecord GenerateVendorAnomaly(Employee e, DateTimeOffset asOfUtc, Random rng)
    {
        // Mix in legitimate-range amounts and occasional known vendors (FR-010)
        string vendor;
        if (rng.NextDouble() < 0.15) // 15% chance: use a known vendor (subtler signal)
            vendor = e.TypicalVendors[rng.Next(e.TypicalVendors.Count)];
        else
            vendor = AnomalousVendors[rng.Next(AnomalousVendors.Length)];

        decimal amount;
        if (rng.NextDouble() < 0.35) // 35% chance: legitimate-range amount ($200-$500)
            amount = (decimal)Math.Round(200 + rng.NextDouble() * 300, 2);
        else
            amount = (decimal)Math.Round(800 + rng.NextDouble() * 4_000, 2); // $800-$4800

        var allCategories = new[] { "Travel", "Meals", "Lodging", "Office", "Training", "Software", "Conferences", "Equipment", "Communications", "Subscriptions" };
        var atypical = allCategories.Where(c => !e.TypicalCategories.Contains(c)).ToArray();
        var category = atypical.Length > 0 ? atypical[rng.Next(atypical.Length)] : e.TypicalCategories[rng.Next(e.TypicalCategories.Count)];
        var submitted = asOfUtc.AddDays(-rng.Next(0, 90)).AddMinutes(-rng.Next(0, 24 * 60));
        return new ExpenseRecord(Guid.NewGuid(), e.EmployeeId, submitted, amount, category, vendor, true, FraudPattern.VendorAnomaly);
    }
}
