using FraudDemo.Domain.Configuration;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Abstractions;

public interface IEmployeeGenerator
{
    IReadOnlyList<Employee> Generate(int employeeCount, Random rng);
}
