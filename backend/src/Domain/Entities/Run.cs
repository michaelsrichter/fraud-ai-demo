using FraudDemo.Domain.Configuration;

namespace FraudDemo.Domain.Entities;

public sealed record Run
{
    public Guid RunId { get; }
    public string OwnerId { get; }
    public DateTimeOffset CreatedUtc { get; }
    public SimulationConfiguration Configuration { get; }
    public IReadOnlyList<Employee> Employees { get; }
    public IReadOnlyList<ExpenseRecord> Expenses { get; }
    public IReadOnlyList<DetectionResult> DetectionResults { get; }
    public IReadOnlyDictionary<Guid, AiInvestigationResult> Investigations { get; }
    public BandCounts BandCounts { get; }

    public Run(
        Guid runId,
        string ownerId,
        DateTimeOffset createdUtc,
        SimulationConfiguration configuration,
        IReadOnlyList<Employee> employees,
        IReadOnlyList<ExpenseRecord> expenses,
        IReadOnlyList<DetectionResult> detectionResults,
        IReadOnlyDictionary<Guid, AiInvestigationResult> investigations,
        BandCounts bandCounts)
    {
        if (runId == Guid.Empty) throw new ArgumentException("RunId required.", nameof(runId));
        if (string.IsNullOrWhiteSpace(ownerId)) throw new ArgumentException("OwnerId required.", nameof(ownerId));
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(employees);
        ArgumentNullException.ThrowIfNull(expenses);
        ArgumentNullException.ThrowIfNull(detectionResults);
        ArgumentNullException.ThrowIfNull(investigations);
        ArgumentNullException.ThrowIfNull(bandCounts);

        if (employees.Count < SimulationConfiguration.EmployeeCountMin || employees.Count > SimulationConfiguration.EmployeeCountMax)
            throw new ArgumentException($"Employees.Count must be {SimulationConfiguration.EmployeeCountMin}..{SimulationConfiguration.EmployeeCountMax}.");
        if (expenses.Count < 1 || expenses.Count > SimulationConfiguration.RecordCountCap)
            throw new ArgumentException("Expenses.Count must be 1..50000 (FR-004).");
        if (detectionResults.Count != expenses.Count)
            throw new ArgumentException("DetectionResults.Count must equal Expenses.Count (invariant).");

        var expenseIds = new HashSet<Guid>(expenses.Count);
        foreach (var e in expenses)
        {
            expenseIds.Add(e.RecordId);
        }
        foreach (var key in investigations.Keys)
        {
            if (!expenseIds.Contains(key))
            {
                throw new ArgumentException($"Investigation references unknown RecordId {key}.", nameof(investigations));
            }
        }

        RunId = runId;
        OwnerId = ownerId;
        CreatedUtc = createdUtc;
        Configuration = configuration;
        Employees = employees;
        Expenses = expenses;
        DetectionResults = detectionResults;
        Investigations = investigations;
        BandCounts = bandCounts;
    }

    public Run WithInvestigations(IReadOnlyDictionary<Guid, AiInvestigationResult> updated) =>
        new(RunId, OwnerId, CreatedUtc, Configuration, Employees, Expenses, DetectionResults, updated, BandCounts);
}
