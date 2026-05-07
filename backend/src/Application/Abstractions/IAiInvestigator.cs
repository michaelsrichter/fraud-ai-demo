using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;

namespace FraudDemo.Application.Abstractions;

public interface IAiInvestigator
{
    Task<AiInvestigationResult> InvestigateAsync(Run run, Case caseUnderReview, string? modelDeploymentName, float? temperature, CancellationToken cancellationToken);
}
