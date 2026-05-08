using FraudDemo.Application.Dtos;
using FraudDemo.Domain.Entities;

namespace FraudDemo.Application.Abstractions;

/// <summary>
/// Filters and aggregates Run data for the Expenses lab data retrieval tool (FR-001, FR-002).
/// </summary>
public interface IRunDataQueryService
{
    RunDataQueryResult Query(Run run, RunDataQuery query);
}
