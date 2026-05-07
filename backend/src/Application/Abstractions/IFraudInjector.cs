using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Abstractions;

public interface IFraudInjector
{
    IReadOnlyList<ExpenseRecord> Generate(
        IReadOnlyList<Employee> employees,
        SimulationConfiguration config,
        DateTimeOffset asOfUtc,
        Random rng);
}
