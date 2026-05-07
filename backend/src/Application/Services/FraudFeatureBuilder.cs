using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Services;

/// <summary>
/// Pure feature-engineering. Produces the six features per [research.md §R5]:
/// amountZ, amountVsThresholdGap, frequencyZ, vendorRarity, categoryDeviation, weekendSubmission.
/// No ML library dependency lives in this layer (Constitution V).
/// </summary>
public sealed class FraudFeatureBuilder
{
    public const decimal CompanyExpenseThreshold = 1_000m;

    public static readonly string[] FeatureNames =
    {
        "amountZ",
        "amountVsThresholdGap",
        "frequencyZ",
        "vendorRarity",
        "categoryDeviation",
        "weekendSubmission",
    };

    public sealed record FeatureMatrix(
        IReadOnlyList<string> Names,
        IReadOnlyList<float[]> Rows,
        IReadOnlyList<double[]> ZScoreRows);

    public FeatureMatrix Build(
        IReadOnlyList<Employee> employees,
        IReadOnlyList<ExpenseRecord> expenses)
    {
        ArgumentNullException.ThrowIfNull(employees);
        ArgumentNullException.ThrowIfNull(expenses);

        var employeesById = employees.ToDictionary(e => e.EmployeeId);

        // Aggregate per-employee stats
        var amountsByEmployee = expenses
            .GroupBy(e => e.EmployeeId)
            .ToDictionary(g => g.Key, g => g.Select(x => (double)x.Amount).ToArray());

        var frequencyByEmployee = expenses
            .GroupBy(e => e.EmployeeId)
            .ToDictionary(g => g.Key, g => (double)g.Count());

        // Run-level vendor frequency
        var vendorCount = expenses.GroupBy(e => e.Vendor)
            .ToDictionary(g => g.Key, g => g.Count());
        var totalRecords = (double)Math.Max(1, expenses.Count);

        var rows = new float[expenses.Count][];
        var zRows = new double[expenses.Count][];

        // Compute aggregate statistics for the columns that need run-level z-scores.
        var rawAmount = expenses.Select(e => (double)e.Amount).ToArray();
        var (amountMean, amountStd) = MeanStd(rawAmount);
        var rawFrequency = frequencyByEmployee.Values.ToArray();
        var (freqMean, freqStd) = MeanStd(rawFrequency);

        for (var i = 0; i < expenses.Count; i++)
        {
            var rec = expenses[i];
            var emp = employeesById[rec.EmployeeId];

            var amountZ = ZScore((double)rec.Amount, amountMean, amountStd);
            var thresholdGap = (double)(CompanyExpenseThreshold - rec.Amount); // positive = under threshold
            // Highlight tightly-under-threshold submissions (gap small but positive) by mapping to a bell.
            var thresholdSignal = thresholdGap is >= 0 and <= 50 ? 1.0 : 0.0;

            var employeeFrequency = frequencyByEmployee.GetValueOrDefault(rec.EmployeeId, 0d);
            var frequencyZ = ZScore(employeeFrequency, freqMean, freqStd);

            var vendorOccurrences = vendorCount.GetValueOrDefault(rec.Vendor, 1);
            var vendorRarity = -Math.Log(vendorOccurrences / totalRecords);

            var inTypicalCategory = emp.TypicalCategories.Contains(rec.Category) ? 0.0 : 1.0;
            var weekend = rec.SubmittedUtc.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? 1.0 : 0.0;

            rows[i] = new[]
            {
                (float)amountZ,
                (float)thresholdSignal,
                (float)frequencyZ,
                (float)vendorRarity,
                (float)inTypicalCategory,
                (float)weekend,
            };

            zRows[i] = new[]
            {
                amountZ,
                thresholdSignal,
                frequencyZ,
                vendorRarity,
                inTypicalCategory,
                weekend,
            };
        }

        return new FeatureMatrix(FeatureNames, rows, zRows);
    }

    private static (double mean, double std) MeanStd(IReadOnlyList<double> data)
    {
        if (data.Count == 0) return (0d, 1d);
        var mean = data.Average();
        var variance = data.Sum(x => (x - mean) * (x - mean)) / data.Count;
        var std = Math.Sqrt(variance);
        return (mean, std == 0 ? 1d : std);
    }

    private static double ZScore(double value, double mean, double std) =>
        std == 0 ? 0d : (value - mean) / std;
}
