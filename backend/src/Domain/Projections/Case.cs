using FraudDemo.Domain.Entities;

namespace FraudDemo.Domain.Projections;

public sealed record Case(
    ExpenseRecord Expense,
    Employee Employee,
    DetectionResult Detection,
    AiInvestigationResult? Investigation);
