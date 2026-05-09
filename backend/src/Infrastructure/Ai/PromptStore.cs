namespace FraudDemo.Infrastructure.Ai;

/// <summary>
/// Loads prompt text from the /prompts directory (deployed as content files).
/// Files are read once and cached for the lifetime of the process.
/// </summary>
public static class PromptStore
{
    private static readonly Lazy<string> _systemInvestigator = Load("system-investigator.md");
    private static readonly Lazy<string> _consensusArbiter = Load("consensus-arbiter.md");
    private static readonly Lazy<string> _debateFraudLeaning = Load("debate-fraud-leaning.md");
    private static readonly Lazy<string> _debateNonFraudLeaning = Load("debate-non-fraud-leaning.md");
    private static readonly Lazy<string> _debateArbiter = Load("debate-arbiter.md");
    private static readonly Lazy<string> _juniorConfidenceExtension = Load("junior-confidence-extension.md");
    private static readonly Lazy<string> _seniorPreamble = Load("senior-preamble.md");

    /// <summary>Base system prompt for all investigation agents.</summary>
    public static string SystemInvestigator => _systemInvestigator.Value;

    /// <summary>System prompt for the consensus arbiter (3-model vote).</summary>
    public static string ConsensusArbiter => _consensusArbiter.Value;

    /// <summary>Bias prefix for the fraud-leaning debate agent.</summary>
    public static string DebateFraudLeaning => _debateFraudLeaning.Value;

    /// <summary>Bias prefix for the non-fraud-leaning debate agent.</summary>
    public static string DebateNonFraudLeaning => _debateNonFraudLeaning.Value;

    /// <summary>System prompt for the debate arbiter.</summary>
    public static string DebateArbiter => _debateArbiter.Value;

    /// <summary>Prompt extension for the junior agent (adds confidenceScore field).</summary>
    public static string JuniorConfidenceExtension => _juniorConfidenceExtension.Value;

    /// <summary>
    /// Preamble template for the senior agent. Contains {0} placeholder for junior findings.
    /// Use <c>string.Format(PromptStore.SeniorPreamble, juniorFindings)</c>.
    /// </summary>
    public static string SeniorPreamble => _seniorPreamble.Value;

    private static Lazy<string> Load(string fileName)
    {
        return new Lazy<string>(() =>
        {
            // Resolve from the "prompts" subdirectory relative to the executing assembly.
            // In Azure Functions, content files are copied to the output directory.
            var baseDir = AppContext.BaseDirectory;
            var path = Path.Combine(baseDir, "prompts", fileName);

            if (!File.Exists(path))
            {
                // Fallback: try relative to current directory (local dev with func start)
                path = Path.Combine(Directory.GetCurrentDirectory(), "prompts", fileName);
            }

            if (!File.Exists(path))
            {
                throw new FileNotFoundException(
                    $"Prompt file not found: {fileName}. Searched in '{Path.Combine(baseDir, "prompts")}' " +
                    $"and '{Path.Combine(Directory.GetCurrentDirectory(), "prompts")}'. " +
                    $"Ensure the /prompts directory is included as content in the Functions project.",
                    fileName);
            }

            return File.ReadAllText(path);
        });
    }
}
