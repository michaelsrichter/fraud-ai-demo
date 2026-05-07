namespace FraudDemo.Domain.Configuration;

public sealed record BandCounts(int High, int Medium, int Low)
{
    public int Total => High + Medium + Low;
}
