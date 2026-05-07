using FraudDemo.Domain.Enums;

namespace FraudDemo.Domain.Entities;

public sealed record ExpenseRecord
{
    public Guid RecordId { get; }
    public Guid EmployeeId { get; }
    public DateTimeOffset SubmittedUtc { get; }
    public decimal Amount { get; }
    public string Category { get; }
    public string Vendor { get; }
    public bool IsInjectedFraud { get; }
    public FraudPattern? InjectedPattern { get; }

    public ExpenseRecord(
        Guid recordId,
        Guid employeeId,
        DateTimeOffset submittedUtc,
        decimal amount,
        string category,
        string vendor,
        bool isInjectedFraud,
        FraudPattern? injectedPattern)
    {
        if (recordId == Guid.Empty) throw new ArgumentException("RecordId required.", nameof(recordId));
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId required.", nameof(employeeId));
        if (amount <= 0m) throw new ArgumentOutOfRangeException(nameof(amount), amount, "Amount must be > 0.");
        if (string.IsNullOrWhiteSpace(category)) throw new ArgumentException("Category required.", nameof(category));
        if (string.IsNullOrWhiteSpace(vendor)) throw new ArgumentException("Vendor required.", nameof(vendor));
        if (isInjectedFraud && injectedPattern is null)
            throw new ArgumentException("InjectedPattern required when IsInjectedFraud is true.", nameof(injectedPattern));
        if (!isInjectedFraud && injectedPattern is not null)
            throw new ArgumentException("InjectedPattern must be null when IsInjectedFraud is false.", nameof(injectedPattern));

        RecordId = recordId;
        EmployeeId = employeeId;
        SubmittedUtc = submittedUtc;
        Amount = amount;
        Category = category;
        Vendor = vendor;
        IsInjectedFraud = isInjectedFraud;
        InjectedPattern = injectedPattern;
    }
}
