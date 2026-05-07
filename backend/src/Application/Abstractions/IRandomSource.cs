namespace FraudDemo.Application.Abstractions;

/// <summary>Deterministic random source seam (Constitution V/VI).</summary>
public interface IRandomSource
{
    /// <summary>Returns a fresh seeded <see cref="Random"/> for the given run.</summary>
    Random ForRun(int? seed);
}

public sealed class DefaultRandomSource : IRandomSource
{
    public Random ForRun(int? seed) => seed.HasValue ? new Random(seed.Value) : new Random();
}
