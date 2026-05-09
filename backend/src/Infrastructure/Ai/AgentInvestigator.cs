using System.ClientModel;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure;
using Azure.AI.OpenAI;
using Azure.Core;
using FraudDemo.Application.Abstractions;
using FraudDemo.Application.Configuration;
using FraudDemo.Application.Dtos;
using FraudDemo.Domain.Entities;
using FraudDemo.Domain.Projections;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI.Chat;

namespace FraudDemo.Infrastructure.Ai;

/// <summary>
/// Stateless ChatClientAgent per request (research §R6) backed by Microsoft Foundry
/// (AI Services, Constitution III). Builds the 5-section prompt payload contract.
/// </summary>
public sealed class AgentInvestigator : IAiInvestigator
{
    private static readonly TimeSpan DefaultTimeoutBudget = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan ToolAugmentedTimeoutBudget = TimeSpan.FromSeconds(180);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static string SystemPromptText => SystemPrompt;

    private static readonly string SystemPrompt = """
        You are an expert internal expense fraud investigator reviewing synthetic data
        from an anomaly-detection demo. You receive a single case with the employee profile,
        a 90-day expense history, peer-cohort statistics, and feature analysis.

        IMPORTANT: You do NOT receive any ML model scores or confidence bands. You must
        reason independently from the raw data and feature signals provided.

        CRITICAL INSTRUCTION — BE BOLD AND DECISIVE:
        You are being consulted specifically because the ML anomaly detector was inconclusive
        on this case. Your job is to break the tie. Take a clear position: is this fraud or not?
        Avoid "Inconclusive" unless you genuinely cannot find ANY signals in either direction.
        A decisive "Likely" or "Unlikely" with strong reasoning is far more valuable than a
        wishy-washy "Inconclusive." Lean into your analysis — if there is even a slight
        preponderance of evidence in one direction, commit to that verdict.

        DECISION FRAMEWORK:
        1. If ANY strong fraud signal is present, or multiple moderate signals combine,
           verdict = "Likely". Err on the side of flagging suspicious activity.
        2. If no fraud indicators are present and the expense looks normal for the
           employee's profile and peer cohort, verdict = "Unlikely".
        3. "Inconclusive" should be used ONLY as a last resort when signals are truly
           balanced with equal evidence for and against fraud. This should be rare.

        STRONG FRAUD SIGNALS (any single one of these justifies "Likely"):
        - Vendor name contains suspicious keywords (OffshoreLLC, QuickCash, ShellCorp,
          Untraceable, GreyMarket) — known shell companies
        - Amount is within $50 of the $1,000 auto-approval threshold (threshold gaming)
        - Submission on weekend + atypical category for the employee
        - Feature z-score |z| > 2.0 (top ~2% of population)
        - Multiple features with |z| > 1.5 that together form a fraud pattern

        Z-SCORE INTERPRETATION:
        - |z| > 2.0 = highly anomalous (top ~2% of population)
        - |z| > 1.5 = notably unusual
        - |z| < 1.0 = within normal range

        FEATURE MEANINGS:
        - vendorRarity: how rare this vendor is (-log frequency). High = unusual vendor.
        - amountZ: how far this amount deviates from the population mean.
        - amountVsThresholdGap: 1.0 if within $50 of $1,000 threshold (gaming signal).
        - frequencyZ: how much this employee's submission count deviates from average.
        - categoryDeviation: 1.0 if category is atypical for this employee.
        - weekendSubmission: 1.0 if submitted on weekend.

        AVAILABLE TOOLS:
        You have access to the following tools. USE THEM to strengthen your analysis.
        Do NOT skip tool use — the data retrieval tool is fast and gives you much
        richer context than what appears in this initial prompt.

        1. query_expense_data — Query filtered expense data from the run dataset.
           Use this to examine broader patterns: all expenses from the same vendor,
           the employee's full history, expenses in a specific category, etc.
           Parameters: employeeId, vendor, category, band (High/Medium/Low),
           dateRangeStart, dateRangeEnd, minAmount, maxAmount,
           limit (default 100, max 500), detail (default false).
           - Use detail=false first to get a compact summary with aggregates,
             then detail=true if you need specific records.

        2. code_interpreter (may appear with a suffix like code_interpreter_*)
           — Execute Python code for complex analysis.
           Use this for statistical tests, temporal pattern analysis, Benford's law,
           distribution comparisons, or any quantitative analysis that would
           strengthen your investigation. You can write Python to analyze the data
           returned by query_expense_data.

        TOOL USAGE GUIDANCE:
        - ALWAYS use query_expense_data to examine the vendor's history across the
          full dataset — is this vendor used by other employees? How many times?
        - ALWAYS use query_expense_data to look at the employee's full expense
          history — are there patterns of threshold gaming or weekend submissions?
        - Use code_interpreter when you need to compute statistics, run comparisons,
          or detect temporal patterns that strengthen your analysis.
        - You may call tools multiple times with different parameters.
        - Start with compact summaries (detail=false), then drill into details.

        Your reply MUST be a single JSON object — no prose, no markdown fences — matching:
        {
          "verdict": "Likely" | "Unlikely" | "Inconclusive",
          "rationale": string (under 2000 characters),
          "keySignals": string[] (1 to 10 entries),
          "recommendedAction": string
        }

        Do not include any field called isInjectedFraud or injectedPattern.
        """;

    private readonly FoundryOptions _foundry;
    private readonly AgentToolOptions _agentToolOptions;
    private readonly TokenCredential _credential;
    private readonly IRunDataQueryService _queryService;
    private readonly IFoundryToolboxClient? _toolboxClient;
    private readonly ILogger<AgentInvestigator> _logger;

    public AgentInvestigator(
        IOptions<FoundryOptions> foundry,
        IOptions<AgentToolOptions> agentToolOptions,
        TokenCredential credential,
        IRunDataQueryService queryService,
        ILogger<AgentInvestigator> logger,
        IFoundryToolboxClient? toolboxClient = null)
    {
        _foundry = foundry.Value;
        _agentToolOptions = agentToolOptions.Value;
        _credential = credential;
        _queryService = queryService;
        _toolboxClient = toolboxClient;
        _logger = logger;
    }

    public async Task<AiInvestigationResult> InvestigateAsync(Run run, Case caseUnderReview, string? modelDeploymentName, float? temperature, bool allowConfidenceScores, CancellationToken cancellationToken, IProgress<ToolInvocation>? progress = null)
    {
        ArgumentNullException.ThrowIfNull(run);
        ArgumentNullException.ThrowIfNull(caseUnderReview);
        var requestedUtc = DateTimeOffset.UtcNow;
        var deploymentName = string.IsNullOrWhiteSpace(modelDeploymentName) ? _foundry.ModelDeploymentName : modelDeploymentName;

        if (string.IsNullOrWhiteSpace(_foundry.Endpoint))
        {
            _logger.LogWarning("Foundry endpoint not configured; returning Unavailable.");
            return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, "endpoint-not-configured");
        }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(ToolAugmentedTimeoutBudget);
        var sw = Stopwatch.StartNew();

        try
        {
            var azureClient = new AzureOpenAIClient(new Uri(_foundry.Endpoint), _credential);
            ChatClient chat = azureClient.GetChatClient(deploymentName);
            IChatClient chatClient = chat.AsIChatClient();

            // Build tool list (FR-010, FR-011)
            var tools = new List<AITool>();
            var toolInvocations = new List<ToolInvocation>();
            var callCounter = 0;
            var maxCalls = _agentToolOptions.MaxToolCalls;

            // Code Interpreter tools from MCP toolbox FIRST (FR-007, FR-009)
            // Listed first so the model sees code_interpreter before query_expense_data
            if (_toolboxClient is not null)
            {
                try
                {
                    var mcpTools = await _toolboxClient.GetToolsAsync(cts.Token);
                    if (mcpTools is not null)
                    {
                        tools.AddRange(mcpTools);
                        _logger.LogInformation("Loaded {Count} MCP tools from Foundry Toolbox", mcpTools.Count);
                    }
                    else
                    {
                        _logger.LogWarning("Foundry Toolbox returned no tools — proceeding with data retrieval only");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load Foundry Toolbox tools — proceeding with data retrieval only");
                }
            }

            // Data retrieval tool — in-process, Run captured in closure (plan R1)
            tools.Add(AIFunctionFactory.Create(
                (string? employeeId, string? vendor, string? category, string? band,
                 string? dateRangeStart, string? dateRangeEnd,
                 decimal? minAmount, decimal? maxAmount,
                 int? limit, bool? detail) =>
                {
                    var toolSw = Stopwatch.StartNew();
                    try
                    {
                        if (Interlocked.Increment(ref callCounter) > maxCalls)
                        {
                            var maxMsg = $"Maximum tool calls ({maxCalls}) reached. Please finalize your verdict.";
                            var maxInv = new ToolInvocation("query_expense_data", "{}", maxMsg, null, null, toolSw.ElapsedMilliseconds, false);
                            toolInvocations.Add(maxInv);
                            progress?.Report(maxInv);
                            _logger.LogWarning("Tool call limit reached: {Max}", maxCalls);
                            return maxMsg;
                        }

                        var query = new RunDataQuery(
                            EmployeeId: employeeId is not null && Guid.TryParse(employeeId, out var eid) ? eid : null,
                            Vendor: vendor,
                            Category: category,
                            Band: band is not null && Enum.TryParse<Domain.Enums.ConfidenceBand>(band, true, out var b) ? b : null,
                            DateRangeStart: dateRangeStart is not null ? DateTimeOffset.Parse(dateRangeStart) : null,
                            DateRangeEnd: dateRangeEnd is not null ? DateTimeOffset.Parse(dateRangeEnd) : null,
                            MinAmount: minAmount,
                            MaxAmount: maxAmount,
                            Limit: limit ?? 100,
                            Detail: detail ?? false,
                            IncludeConfidence: allowConfidenceScores);

                        var paramsJson = JsonSerializer.Serialize(query, JsonOptions);
                        var result = _queryService.Query(run, query);
                        var resultJson = JsonSerializer.Serialize(result, JsonOptions);
                        var summary = $"{result.Metadata.TotalMatches} matches, {result.Metadata.ReturnedCount} returned ({result.Metadata.Mode} mode)";
                        var truncatedData = resultJson.Length > 1000 ? resultJson[..1000] + "..." : resultJson;

                        toolSw.Stop();
                        var inv = new ToolInvocation("query_expense_data", paramsJson, summary, truncatedData, null, toolSw.ElapsedMilliseconds, true);
                        toolInvocations.Add(inv);
                        progress?.Report(inv);
                        _logger.LogInformation("Tool query_expense_data: {Summary} in {Ms}ms", summary, toolSw.ElapsedMilliseconds);
                        return resultJson;
                    }
                    catch (Exception ex)
                    {
                        toolSw.Stop();
                        var errMsg = $"Error: {ex.Message}";
                        var errInv = new ToolInvocation("query_expense_data", "{}", errMsg, null, null, toolSw.ElapsedMilliseconds, false);
                        toolInvocations.Add(errInv);
                        progress?.Report(errInv);
                        _logger.LogWarning(ex, "Tool query_expense_data failed in {Ms}ms", toolSw.ElapsedMilliseconds);
                        return errMsg;
                    }
                },
                "query_expense_data",
                "Query filtered expense data from the run dataset. Use this to examine vendor history, employee patterns, category breakdowns, etc. Parameters: employeeId, vendor, category, band (High/Medium/Low), dateRangeStart, dateRangeEnd, minAmount, maxAmount, limit (default 100, max 500), detail (default false for compact summary, true for full records)."));

            var chatOptions = new ChatOptions { ToolMode = ChatToolMode.Auto, Tools = new List<AITool>(tools) };
            // Note: temperature is intentionally NOT set when tools are present.
            // The deployed models (e.g. GPT-5.4) reject non-default temperature
            // values when tool-calling is enabled (HTTP 400: "Only the default (1)
            // value is supported"). Temperature is only applied for tool-free calls.

            // Wrap the chat client with tool-aware options using ChatClientBuilder
            var toolAwareChatClient = new ChatClientBuilder(chatClient)
                .UseFunctionInvocation()
                .Build();

            var agent = new ChatClientAgent(toolAwareChatClient, instructions: SystemPrompt);

            var prompt = BuildPrompt(run, caseUnderReview);
            var toolNames = string.Join(", ", chatOptions.Tools!.Select(t => $"{t.GetType().Name}:{(t is AIFunction f ? f.Name : t.ToString())}"));
            _logger.LogInformation("Investigation submitted: run={RunId} case={CaseId} model={Model} temp={Temp} promptLen={Len} tools={ToolCount} toolDefs=[{ToolNames}]",
                run.RunId, caseUnderReview.Expense.RecordId, deploymentName, temperature, prompt.Length, tools.Count, toolNames);

            var response = await agent.RunAsync(prompt, options: new ChatClientAgentRunOptions { ChatOptions = chatOptions }, cancellationToken: cts.Token);
            sw.Stop();
            _logger.LogInformation("Investigation succeeded in {Ms} ms with {ToolCalls} tool calls", sw.ElapsedMilliseconds, toolInvocations.Count);

            var json = ExtractJsonObject(response.Text);
            var dto = JsonSerializer.Deserialize<AiVerdictDto>(json, JsonOptions);
            if (dto is null || string.IsNullOrWhiteSpace(dto.Rationale) || dto.KeySignals.Count == 0)
            {
                return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, "malformed");
            }

            return AiInvestigationResult.Succeeded(
                recordId: caseUnderReview.Expense.RecordId,
                runId: run.RunId,
                requestedUtc: requestedUtc,
                completedUtc: DateTimeOffset.UtcNow,
                verdict: dto.Verdict,
                rationale: dto.Rationale,
                keySignals: dto.KeySignals,
                recommendedAction: dto.RecommendedAction,
                toolTrace: toolInvocations.Count > 0 ? toolInvocations : null);
        }
        catch (OperationCanceledException) when (cts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Investigation timed out after {Ms} ms", sw.ElapsedMilliseconds);
            return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, "timeout");
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Investigation Foundry RequestFailedException");
            return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, $"service-error:{ex.Status}");
        }
        catch (ClientResultException ex)
        {
            _logger.LogWarning(ex, "Investigation Azure.AI.OpenAI ClientResultException");
            return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, $"service-error:{ex.Status}");
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Investigation response JSON parse error");
            return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, "malformed");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Investigation unexpected failure");
            return AiInvestigationResult.Unavailable(caseUnderReview.Expense.RecordId, run.RunId, requestedUtc, "unexpected");
        }
    }

    /// <summary>
    /// Builds the 5-section prompt payload contract from research.md §R6.
    /// IMPORTANT: never includes <c>IsInjectedFraud</c> or <c>InjectedPattern</c>.
    /// </summary>
    public static string BuildPrompt(Run run, Case c)
    {
        var expense = c.Expense;
        var employee = c.Employee;
        var detection = c.Detection;

        var employeeExpenses = run.Expenses.Where(e => e.EmployeeId == employee.EmployeeId).ToList();
        var amountStats = MeanStd(employeeExpenses.Select(e => (double)e.Amount).ToArray());

        var ninetyDayStart = expense.SubmittedUtc.AddDays(-90);
        var window = employeeExpenses
            .Where(e => e.SubmittedUtc >= ninetyDayStart && e.SubmittedUtc <= expense.SubmittedUtc)
            .ToList();
        var windowAmount = window.Sum(e => (double)e.Amount);
        var windowDistinctVendors = window.Select(e => e.Vendor).Distinct().Count();
        var topPriorScores = window
            .Where(e => e.RecordId != expense.RecordId)
            .Select(e => new { e.SubmittedUtc, e.Amount, Score = run.DetectionResults.First(d => d.RecordId == e.RecordId).Confidence })
            .OrderByDescending(e => e.Score)
            .Take(3)
            .ToArray();

        var cohort = run.Expenses
            .Where(e =>
            {
                var emp = run.Employees.First(emp2 => emp2.EmployeeId == e.EmployeeId);
                return emp.Department == employee.Department && e.Category == expense.Category;
            })
            .Select(e => (double)e.Amount)
            .OrderBy(a => a)
            .ToArray();

        var cohortMedian = Percentile(cohort, 0.5);
        var cohortP75 = Percentile(cohort, 0.75);
        var cohortP95 = Percentile(cohort, 0.95);
        var caseRank = cohort.Length == 0 ? 0d : Array.IndexOf(cohort, (double)expense.Amount);
        var casePercentile = cohort.Length == 0 ? 0d : (double)caseRank / cohort.Length;

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== 1. CASE UNDER REVIEW ===");
        sb.AppendLine($"recordId: {expense.RecordId:D}");
        sb.AppendLine($"submittedUtc: {expense.SubmittedUtc:O}");
        sb.AppendLine($"dayOfWeek: {expense.SubmittedUtc.DayOfWeek}");
        sb.AppendLine($"amount: {expense.Amount:F2}");
        sb.AppendLine($"distanceFromApprovalThreshold: {(1000m - expense.Amount):F2} (negative = over $1000)");
        sb.AppendLine($"category: {expense.Category}");
        sb.AppendLine($"vendor: {expense.Vendor}");
        sb.AppendLine("featureAnalysis:");
        foreach (var f in detection.ContributingFeatures)
        {
            sb.AppendLine($"  - {f.Name}: value={f.Value:F4} z={f.ZScore:F4}");
        }

        sb.AppendLine("=== 2. EMPLOYEE PROFILE ===");
        sb.AppendLine($"name: {employee.Name}");
        sb.AppendLine($"department: {employee.Department}");
        sb.AppendLine($"role: {employee.Role}");
        sb.AppendLine($"baselineMonthlyExpense: {employee.BaselineMonthlyExpense:F2}");
        sb.AppendLine($"historicalMeanAmount: {amountStats.mean:F2}");
        sb.AppendLine($"historicalStdAmount: {amountStats.std:F2}");

        sb.AppendLine("=== 3. RECENT 90-DAY HISTORY ===");
        sb.AppendLine($"submissions: {window.Count}");
        sb.AppendLine($"totalAmount: {windowAmount:F2}");
        sb.AppendLine($"distinctVendors: {windowDistinctVendors}");
        sb.AppendLine("topPriorScores:");
        foreach (var p in topPriorScores)
        {
            sb.AppendLine($"  - submittedUtc={p.SubmittedUtc:O} amount={p.Amount:F2} score={p.Score:F4}");
        }

        sb.AppendLine("=== 4. PEER COMPARISON (department × category cohort) ===");
        sb.AppendLine($"cohortSize: {cohort.Length}");
        sb.AppendLine($"medianAmount: {cohortMedian:F2}");
        sb.AppendLine($"p75Amount: {cohortP75:F2}");
        sb.AppendLine($"p95Amount: {cohortP95:F2}");
        sb.AppendLine($"casePercentile: {casePercentile:F2}");

        sb.AppendLine("=== 5. RUN CONTEXT ===");
        sb.AppendLine($"runId: {run.RunId:D}");
        sb.AppendLine($"totalRecords: {run.Expenses.Count}");
        sb.AppendLine($"intensity: {run.Configuration.Intensity:F2} (fraction of records with injected fraud)");
        sb.AppendLine($"weights: ThresholdGaming={run.Configuration.PatternWeights.ThresholdGaming:F2} UnusualFrequency={run.Configuration.PatternWeights.UnusualFrequency:F2} VendorAnomaly={run.Configuration.PatternWeights.VendorAnomaly:F2}");
        sb.AppendLine($"thresholds: Low<{run.Configuration.Thresholds.Low:F2}, Medium={run.Configuration.Thresholds.Low:F2}-{run.Configuration.Thresholds.High:F2}, High>{run.Configuration.Thresholds.High:F2}");
        sb.AppendLine($"bandDistribution: High={run.BandCounts.High}, Medium={run.BandCounts.Medium}, Low={run.BandCounts.Low}");
        sb.AppendLine("note: This is a synthetic dataset. Ground-truth labels exist but are NOT supplied to you. Base your verdict on the signals above.");
        sb.AppendLine();
        sb.AppendLine("=== INVESTIGATION GUIDANCE ===");
        sb.AppendLine("Step 1: Use query_expense_data to gather vendor history and employee patterns.");
        sb.AppendLine("Step 2: If the data suggests an ambiguous pattern, use the code_interpreter tool to run a statistical test (Benford's law, z-score, temporal clustering) to strengthen your analysis.");
        sb.AppendLine("Step 3: Form your JSON verdict citing the evidence gathered.");

        return sb.ToString();
    }

    private static (double mean, double std) MeanStd(IReadOnlyList<double> values)
    {
        if (values.Count == 0) return (0d, 0d);
        var mean = values.Average();
        var variance = values.Sum(v => (v - mean) * (v - mean)) / values.Count;
        return (mean, Math.Sqrt(variance));
    }

    private static double Percentile(IReadOnlyList<double> sorted, double q)
    {
        if (sorted.Count == 0) return 0d;
        var idx = (int)Math.Clamp(Math.Floor(q * sorted.Count), 0, sorted.Count - 1);
        return sorted[idx];
    }

    /// <summary>Strips optional code-fence wrappers and isolates the JSON object body.</summary>
    private static string ExtractJsonObject(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "{}";
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = trimmed.IndexOf('\n');
            if (firstNl > 0) trimmed = trimmed[(firstNl + 1)..];
            var fenceClose = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (fenceClose >= 0) trimmed = trimmed[..fenceClose];
            trimmed = trimmed.Trim();
        }
        var open = trimmed.IndexOf('{');
        var close = trimmed.LastIndexOf('}');
        if (open >= 0 && close > open) return trimmed[open..(close + 1)];
        return trimmed;
    }
}
