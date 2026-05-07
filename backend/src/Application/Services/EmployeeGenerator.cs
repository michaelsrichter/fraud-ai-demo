using FraudDemo.Application.Abstractions;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Services;

/// <summary>Generates synthetic employees with stable per-employee profiles (FR-001).</summary>
public sealed class EmployeeGenerator : IEmployeeGenerator
{
    private static readonly string[] Departments = { "Sales", "Engineering", "Operations", "Marketing", "Finance" };
    private static readonly string[] Roles = { "IC", "Senior IC", "Manager", "Director" };
    private static readonly string[] FirstNames = { "Alex", "Morgan", "Taylor", "Jordan", "Casey", "Riley", "Quinn", "Avery", "Jamie", "Reese", "Sam", "Drew", "Skyler", "Hayden", "Rowan" };
    private static readonly string[] LastNames = { "Patel", "Nguyen", "Garcia", "Smith", "Lee", "Johnson", "Brown", "Khan", "Mueller", "Rossi", "Kim", "Cohen", "Park", "Silva", "Diaz" };
    private static readonly string[] AllCategories = { "Travel", "Meals", "Lodging", "Office", "Training", "Software", "Conferences" };
    private static readonly string[] AllVendors = { "AcmeAir", "BlueCab", "CityHotel", "DeltaSky", "EcoMart", "FineDine", "GlobeTrek", "HelpDesk", "InkOffice", "JetCharter", "KaffeeBar", "LearnHub", "Marriot", "Nova", "OmniSoft", "PrintCo", "QuickBite", "Rentals", "SuiteStay", "TechStore" };

    public IReadOnlyList<Employee> Generate(int employeeCount, Random rng)
    {
        ArgumentNullException.ThrowIfNull(rng);
        var employees = new List<Employee>(employeeCount);
        for (var i = 0; i < employeeCount; i++)
        {
            var dept = Departments[rng.Next(Departments.Length)];
            var role = Roles[rng.Next(Roles.Length)];
            var firstName = FirstNames[rng.Next(FirstNames.Length)];
            var lastName = LastNames[rng.Next(LastNames.Length)];
            var name = $"{firstName} {lastName}";
            var baseline = (decimal)Math.Round(800 + rng.NextDouble() * 4_200, 2); // 800-5000
            var typicalCats = PickRandomSubset(AllCategories, rng, min: 2, max: 4);
            var typicalVendors = PickRandomSubset(AllVendors, rng, min: 3, max: 6);

            employees.Add(new Employee(Guid.NewGuid(), name, dept, role, baseline, typicalCats, typicalVendors));
        }
        return employees;
    }

    private static IReadOnlyList<string> PickRandomSubset(string[] pool, Random rng, int min, int max)
    {
        var size = rng.Next(min, max + 1);
        var indices = Enumerable.Range(0, pool.Length).OrderBy(_ => rng.Next()).Take(size);
        return indices.Select(i => pool[i]).ToList();
    }
}
