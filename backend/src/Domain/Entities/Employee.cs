namespace FraudDemo.Domain.Entities;

public sealed record Employee
{
    public Guid EmployeeId { get; }
    public string Name { get; }
    public string Department { get; }
    public string Role { get; }
    public decimal BaselineMonthlyExpense { get; }
    public IReadOnlyList<string> TypicalCategories { get; }
    public IReadOnlyList<string> TypicalVendors { get; }

    public Employee(
        Guid employeeId,
        string name,
        string department,
        string role,
        decimal baselineMonthlyExpense,
        IReadOnlyList<string> typicalCategories,
        IReadOnlyList<string> typicalVendors)
    {
        if (employeeId == Guid.Empty) throw new ArgumentException("EmployeeId required.", nameof(employeeId));
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name required.", nameof(name));
        if (string.IsNullOrWhiteSpace(department)) throw new ArgumentException("Department required.", nameof(department));
        if (string.IsNullOrWhiteSpace(role)) throw new ArgumentException("Role required.", nameof(role));
        if (baselineMonthlyExpense <= 0m) throw new ArgumentOutOfRangeException(nameof(baselineMonthlyExpense));
        ArgumentNullException.ThrowIfNull(typicalCategories);
        ArgumentNullException.ThrowIfNull(typicalVendors);
        if (typicalCategories.Count == 0) throw new ArgumentException("At least one typical category.", nameof(typicalCategories));
        if (typicalVendors.Count == 0) throw new ArgumentException("At least one typical vendor.", nameof(typicalVendors));

        EmployeeId = employeeId;
        Name = name;
        Department = department;
        Role = role;
        BaselineMonthlyExpense = baselineMonthlyExpense;
        TypicalCategories = typicalCategories;
        TypicalVendors = typicalVendors;
    }
}
