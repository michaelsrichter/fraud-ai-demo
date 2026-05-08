using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Dtos;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Services;

/// <summary>
/// Pure filter + aggregation logic for the Expenses lab data retrieval tool (FR-001–FR-006).
/// Strips IsInjectedFraud/InjectedPattern per FR-005.
/// </summary>
public sealed class RunDataQueryService : IRunDataQueryService
{
    public RunDataQueryResult Query(Run run, RunDataQuery query)
    {
        ArgumentNullException.ThrowIfNull(run);
        ArgumentNullException.ThrowIfNull(query);

        var detMap = new Dictionary<Guid, DetectionResult>();
        foreach (var d in run.DetectionResults)
            detMap[d.RecordId] = d;

        var empMap = new Dictionary<Guid, Employee>();
        foreach (var e in run.Employees)
            empMap[e.EmployeeId] = e;

        // Apply filters (AND logic)
        var filtered = run.Expenses.AsEnumerable();

        if (query.EmployeeId.HasValue)
            filtered = filtered.Where(e => e.EmployeeId == query.EmployeeId.Value);

        if (!string.IsNullOrWhiteSpace(query.Vendor))
            filtered = filtered.Where(e => e.Vendor.Contains(query.Vendor, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(query.Category))
            filtered = filtered.Where(e => e.Category.Equals(query.Category, StringComparison.OrdinalIgnoreCase));

        if (query.Band.HasValue)
            filtered = filtered.Where(e => detMap.TryGetValue(e.RecordId, out var d) && d.Band == query.Band.Value);

        if (query.DateRangeStart.HasValue)
            filtered = filtered.Where(e => e.SubmittedUtc >= query.DateRangeStart.Value);

        if (query.DateRangeEnd.HasValue)
            filtered = filtered.Where(e => e.SubmittedUtc <= query.DateRangeEnd.Value);

        if (query.MinAmount.HasValue)
            filtered = filtered.Where(e => e.Amount >= query.MinAmount.Value);

        if (query.MaxAmount.HasValue)
            filtered = filtered.Where(e => e.Amount <= query.MaxAmount.Value);

        var matchedExpenses = filtered.ToList();
        var totalMatches = matchedExpenses.Count;

        if (totalMatches == 0)
        {
            return new RunDataQueryResult(
                new QueryMetadata(0, 0, false, query.Detail ? "detail" : "compact"),
                query.Detail ? null : new QueryAggregates(0, 0, 0, 0, 0, 0, 0),
                query.Detail ? null : Array.Empty<ExpenseQueryRecord>(),
                query.Detail ? Array.Empty<ExpenseQueryRecord>() : null);
        }

        // Sort by confidence descending
        var sorted = matchedExpenses
            .Select(e => (expense: e, detection: detMap.GetValueOrDefault(e.RecordId), employee: empMap.GetValueOrDefault(e.EmployeeId)))
            .Where(x => x.detection is not null && x.employee is not null)
            .OrderByDescending(x => x.detection!.Confidence)
            .ToList();

        var effectiveLimit = query.EffectiveLimit;

        if (query.Detail)
        {
            var records = sorted.Take(effectiveLimit).Select(x => ToQueryRecord(x.expense, x.detection!, x.employee!, query.IncludeConfidence)).ToList();
            return new RunDataQueryResult(
                new QueryMetadata(totalMatches, records.Count, records.Count < totalMatches, "detail"),
                null,
                null,
                records);
        }
        else
        {
            // Compact mode: aggregates + top 10
            var amounts = matchedExpenses.Select(e => (double)e.Amount).ToList();
            amounts.Sort();
            var aggregates = new QueryAggregates(
                MeanAmount: amounts.Average(),
                MedianAmount: Median(amounts),
                MinAmount: amounts[0],
                MaxAmount: amounts[^1],
                DistinctVendors: matchedExpenses.Select(e => e.Vendor).Distinct().Count(),
                DistinctCategories: matchedExpenses.Select(e => e.Category).Distinct().Count(),
                DistinctEmployees: matchedExpenses.Select(e => e.EmployeeId).Distinct().Count());

            var topRecords = sorted.Take(10).Select(x => ToQueryRecord(x.expense, x.detection!, x.employee!, query.IncludeConfidence)).ToList();

            return new RunDataQueryResult(
                new QueryMetadata(totalMatches, topRecords.Count, totalMatches > 10, "compact"),
                aggregates,
                topRecords,
                null);
        }
    }

    private static ExpenseQueryRecord ToQueryRecord(ExpenseRecord expense, DetectionResult detection, Employee employee, bool includeConfidence)
    {
        // FR-005: NEVER include IsInjectedFraud or InjectedPattern
        return new ExpenseQueryRecord(
            RecordId: expense.RecordId,
            EmployeeId: expense.EmployeeId,
            EmployeeName: employee.Name,
            Department: employee.Department,
            SubmittedUtc: expense.SubmittedUtc,
            Amount: expense.Amount,
            Category: expense.Category,
            Vendor: expense.Vendor,
            Confidence: includeConfidence ? detection.Confidence : null,
            Band: includeConfidence ? detection.Band : null,
            TopFeatures: includeConfidence
                ? detection.ContributingFeatures
                    .OrderByDescending(f => Math.Abs(f.ZScore))
                    .Take(3)
                    .ToList()
                : null);
    }

    private static double Median(IReadOnlyList<double> sorted)
    {
        if (sorted.Count == 0) return 0;
        var mid = sorted.Count / 2;
        return sorted.Count % 2 != 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}
