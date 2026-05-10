using FraudDemo.Domain.Enums;

namespace FraudDemo.Domain.Configuration;

/// <summary>Describes a single tunable parameter for a scoring model.</summary>
public sealed record ModelParameterDef(
    string Name,
    string DisplayName,
    string Description,
    ParameterType DataType,
    double DefaultValue,
    double? Min = null,
    double? Max = null);
