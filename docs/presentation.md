# From Idea to Fraud Lab in Days

## Vibe Coding an AI-Powered Expense Fraud Simulator with GitHub Copilot

**Mike Richter** · Principal Partner Solution Architect, Microsoft
**NYCFE Spring Fraud Conference** · May 16, 2026

---

## Three Lessons You'll Take Away

1. **Your fraud expertise is now the bottleneck** — not software engineering
2. **AI doesn't replace the investigator** — it gives you a second opinion at machine speed
3. **A prototype becomes production-grade** — without re-architecting anything

---

## The Question

> What if building a custom fraud detection tool took **days** instead of **months**?

Not a generic, off-the-shelf platform you adapt to your workflow —
a purpose-built tool that understands **your** fraud patterns, **your** data sources, **your** investigation process.

That's what we're going to walk through today.

---

## What I Built

A fully functional AI-powered fraud detection application:

- **Synthetic data generation** — Employee expense records with configurable fraud patterns
- **ML-based anomaly detection** — Three different scoring models compare how algorithms flag the same records
- **AI-powered investigation** — LLMs that query data, run calculations, and produce structured verdicts with cited evidence
- **Four investigation strategies** — Single agent, multi-model consensus, adversarial debate, and escalation pipelines
- **Cloud deployment** — Azure Functions, managed identity, infrastructure-as-code

**Built in 4 days. By one person. Through conversation.**

---

## 🖥️ Live Demo

> **Let's look at the actual application before we dive into the lessons.**

→ [Launch the Expense Fraud Lab](/labs/expenses)

Generate a dataset, see the ML scoring results, drill into a flagged case, and trigger an AI investigation. We'll come back to the demo throughout the talk.

---

## Lesson 1: Your Fraud Expertise Is Now the Bottleneck

### Not software engineering. Not IT resources. Not budget cycles.

The hardest part of building this system wasn't writing code.
It was describing the fraud patterns accurately.

---

### What Is "Vibe Coding"?

Instead of writing code line by line, you describe what you want in natural language to an AI coding agent (GitHub Copilot). The agent:

- Asks clarifying questions about your requirements
- Designs the architecture and data models
- Writes the code, tests, and infrastructure
- Fixes its own errors and iterates

**You shape the intent. The AI writes the implementation.**

---

### The Conversation That Built This App

Here's a real exchange from Day 1:

> **Me:** *"Simulate employee expense activity, detect anomalous behavior with ML, and apply an AI investigation layer to analyze ambiguous cases."*
>
> **AI Agent:** *"Should the 'Investigate with AI' action be available on all cases, or only medium-confidence ones?"*
>
> **Me:** *"Available on all bands — high, medium, low. Medium is the suggested focus but nothing is hidden."*
>
> **AI Agent:** *"What's the default dataset size and hard upper cap?"*
>
> **Me:** *"Default 5,000 records. Cap at 50,000."*
>
> **AI Agent:** *"How configurable is the fraud-pattern mix — single dial, per-pattern weights, or toggles?"*
>
> **Me:** *"One overall intensity dial plus per-pattern weights for threshold-gaming, unusual frequency, and vendor anomaly."*

From that conversation, the AI produced:
- A formal specification with user stories and acceptance criteria
- An implementation plan with architecture decisions
- 89 ordered tasks with exact file paths
- Then it built all of it

#### 📂 See it in the code

Here's the actual code that generates threshold-gaming fraud — expenses deliberately clustered just below the $1,000 auto-approval limit:

> [`FraudInjector.cs` — Threshold Gaming Pattern (line 105)](https://github.com/michaelsrichter/fraud-ai-demo/blob/main/backend/src/Application/Services/FraudInjector.cs#L105-L118)

```csharp
var jitter = (decimal)(rng.NextDouble() * 100 - 50); // -50 .. +50
var amount = CompanyExpenseThreshold - 1m + jitter;
// Occasionally generate sub-threshold amounts to blend with legitimate
if (rng.NextDouble() < 0.25)
    amount = (decimal)Math.Round(800 + rng.NextDouble() * 150, 2);
```

You don't need to read C#. The point is: a natural-language description of "threshold gaming" became working code that generates realistic-looking fraudulent expenses.

---

### The Process: Spec → Plan → Tasks → Code

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Specify     │ ──▶ │  Plan        │ ──▶ │  Tasks       │ ──▶ │  Implement   │
│             │     │             │     │             │     │             │
│ User stories │     │ Architecture │     │ 89 ordered   │     │ Code, tests, │
│ Edge cases   │     │ Data models  │     │ tasks with   │     │ infra, docs  │
│ Requirements │     │ API design   │     │ file paths   │     │ all built    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

This structured process is what makes agentic coding reliable — it's not just "ask AI to write code." It's a disciplined engineering workflow where the AI follows its own specification.

---

### The 4-Day Timeline

**Day 1 (May 6–7)** — Core fraud detection

- Synthetic employee & expense data with 3 fraud patterns
- ML.NET anomaly scoring (Randomized PCA)
- Confidence banding: high / medium / low risk
- AI investigator producing structured verdicts
- React frontend with case lists and scatter plots
- Azure Functions backend with Azure Storage

**Day 2 (May 7)** — Platform & user management

- Multi-lab homepage architecture
- User profiles and data isolation
- Admin dashboard with activity metrics
- Session analytics integration

**Day 3 (May 8)** — Agent intelligence

- AI agents that autonomously query the full dataset mid-investigation
- Python code interpreter for quantitative analysis
- Real-time streaming of agent reasoning
- Debate mode: opposing agents argue before an arbiter
- Junior → Senior: escalation pipeline for cost optimization

**Day 4 (May 9–10)** — ML depth & visualization

- Two additional ML models (SDCA, Fast Forest)
- Four interactive chart types
- Tunable model parameters
- Realistic log-normal data distributions

---

### Why This Matters to You

The **specifications** are the product, not the code.

Every feature started as a description of a fraud pattern, an investigation workflow, or a triage process. If you can describe what you're looking for — the red flags, the data you cross-reference, the questions you ask — the tooling to build it into software already exists.

**The bottleneck isn't programming skill. It's domain expertise. And that's what you have.**

---

## Lesson 2: AI Doesn't Replace Traditional ML — It Picks Up Where ML Leaves Off

### Generative AI has a lot of hype right now. But it is not a replacement for traditional machine learning models.

---

### Two Different Tools for Two Different Jobs

Fraud detection is fundamentally about finding anomalies. Traditional ML models are purpose-built for exactly this — and they do it fast and cheap.

| | ML Scoring Models | GenAI Investigators |
|---|---|---|
| **Purpose** | Score every record for anomalies | Investigate ambiguous cases with reasoning |
| **Speed** | 5,000 records in < 2 seconds | 1 case in 10–60 seconds |
| **Cost** | Fractions of a cent per record | $0.02–$0.15 per investigation |
| **Strengths** | Scale, consistency, deterministic | Reasoning, context, natural language |
| **Limitations** | No reasoning — just a score | Slow, expensive, non-deterministic |

---

### The Escalation Pipeline

ML handles the volume. AI handles the ambiguity. This is the same pattern your team already uses — automated scoring triages the workload, and human examiners focus on the cases that need judgment.

```
┌───────────────┐     ┌────────────────┐     ┌─────────────────────┐
│ All 5,000       │     │ ML Scoring       │     │ Band Assignment       │
│ Expense Records │ ─▶│ (< 2 seconds)    │ ─▶│                       │
│                 │     │ Fast, cheap,     │     │ ✅ Low risk:  80-90%    │
│                 │     │ deterministic    │     │ 🚨 High risk:  2-5%    │
└───────────────┘     └────────────────┘     │ ❓ Medium:     5-15%   │
                                            └─────────┬───────────┘
                                                      │
                                              ┌───────▼─────────┐
                                              │ AI Investigators  │
                                              │ (10-60s per case) │
                                              │ Reasoning + tools │
                                              └───────────────────┘
```

In this demo, I'm using pre-built generic anomaly detectors from ML.NET. Training a domain-specific fraud model takes real effort — but once it's built, it deploys and scales instantly. That model-building process is outside this demo's scope. What this demo shows is: **when that ML model doesn't have a conclusive result, we bring in AI investigators with reasoning skills and tools** — instead of immediately escalating to a human fraud examiner.

You can use Microsoft's machine learning capabilities (Azure Machine Learning) to build and train domain-specific models, but that's a separate conversation.

---

### ML Scoring: Fast, Cheap, Deterministic

Here's the actual scoring code — the ML model trains and scores all 5,000 records in a single pass:

> [`MlNetAnomalyScorer.cs` — Randomized PCA (line 70)](https://github.com/michaelsrichter/fraud-ai-demo/blob/main/backend/src/Infrastructure/Detection/MlNetAnomalyScorer.cs#L70-L80)

```csharp
var pipeline = ml.AnomalyDetection.Trainers.RandomizedPca(
    featureColumnName: "Features",
    rank: rank,
    ensureZeroMean: true,
    seed: seed);

var model = pipeline.Fit(data);          // Train
var transformed = model.Transform(data); // Score all records
```

That's it. A few lines of code, and every expense record gets a confidence score. The banding logic then sorts them into high / medium / low risk:

> [`BandingHelpers.cs` — Band Assignment (line 8)](https://github.com/michaelsrichter/fraud-ai-demo/blob/main/backend/src/Application/Banding/Banding.cs#L8-L13)

```csharp
if (confidence >= threshold.High) return "High";   // Auto-flag
if (confidence >= threshold.Low)  return "Medium"; // Needs investigation
return "Low";                                       // Normal
```

---

### When ML Can't Decide: The AI Investigator Steps In

The medium-confidence cases — the ones ML scored as ambiguous — are where you'd normally escalate to a human fraud examiner. Instead, we bring in AI investigators that receive the same signals an analyst would review:

- **Spending patterns** — Amount relative to category averages and employee history
- **Vendor analysis** — How common is this vendor? Does the employee use it exclusively?
- **Timing signals** — Weekend submissions, clusters before deadlines
- **Peer comparison** — How does this employee's pattern compare to their department?

And produces a structured assessment:

| Field | Example Output |
|-------|---------------|
| **Verdict** | Likely Fraud |
| **Confidence** | 0.82 |
| **Rationale** | "Employee submitted 12 expenses to VendorX in 30 days — 8× the department average. All amounts cluster at $48–$49, just below the $50 auto-approval threshold." |
| **Key Signals** | Threshold gaming pattern, vendor concentration, timing clustering |
| **Recommended Action** | Escalate to supervisor review with vendor documentation request |

---

### Four Ways to Get That Second Opinion

**Single Agent** — One model, one verdict. Fast and direct.

**Consensus** — Three different AI models investigate independently. An arbiter synthesizes the findings. Where models agree → high confidence. Where they disagree → look closer.

**Debate** — Two agents with opposing mandates:
- Agent A is told to *find the fraud*
- Agent B is told to *find the legitimate explanation*
- An arbiter weighs both arguments and commits to a verdict

This mirrors how adversarial review processes work in professional investigation.

#### 📂 The actual debate instructions

The fraud-leaning agent receives this instruction ([`debate-fraud-leaning.md`](https://github.com/michaelsrichter/fraud-ai-demo/blob/main/prompts/debate-fraud-leaning.md)):

> *"You are acting as the FRAUD ADVOCATE. Your job is to build the strongest possible case that this expense IS fraudulent. Err STRONGLY on the side of flagging fraud. Your role is that of a prosecutor."*

While the defense agent receives ([`debate-non-fraud-leaning.md`](https://github.com/michaelsrichter/fraud-ai-demo/blob/main/prompts/debate-non-fraud-leaning.md)):

> *"You are acting as the DEFENSE ADVOCATE. Your job is to build the strongest possible case that this expense is LEGITIMATE. Your role is that of a defense attorney — give the employee the benefit of the doubt."*

These are plain English instructions — not code. Anyone could write them.

**Junior → Senior** — A faster, cheaper model handles initial triage. High-confidence cases are resolved immediately. Low-confidence cases escalate to a more capable model — carrying the junior's preliminary analysis forward. This mirrors how investigation teams triage in practice.

---

### The AI Has Real Tools

During an investigation, the AI agent can:

- **Query the dataset** — Pull all expenses from the same vendor, fetch the employee's 90-day history, compare against peer averages
- **Run calculations** — Write and execute Python code for statistical tests, distribution analysis, temporal pattern detection
- **Show its work** — Every tool call streams to the UI in real time so you can see the reasoning process

```
Agent Reasoning Trace:
├── 🔍 query_expense_data: Fetched 47 expenses from vendor OffshoreLLC
├── 🔍 query_expense_data: Fetched employee 90-day history (142 records)
├── 🐍 code_interpreter: Computed Benford's Law digit distribution
├── 🐍 code_interpreter: Calculated z-scores for amount distribution
└── ✅ Verdict: Likely Fraud (confidence: 0.87)
```

---

### If the AI Goes Down, Everything Else Keeps Working

The ML scoring, the data generation, the case lists, the visualizations — all of it is deterministic and runs without any AI service. The AI investigation layer is an enhancement, not a dependency.

Your team never loses access to the underlying detection results.

---

## Lesson 3: Prototype to Production Without Re-Architecting

### This isn't a laptop demo.

---

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────────────┐
│ Static Web App   │  HTTPS  │ Azure Functions           │
│ (React + Vite)   │ ──────▶ │ (.NET 10, serverless)     │
│                  │         │                          │
│ No server to     │         │ Auto-scales to zero      │
│ manage           │         │ Pay only when running    │
└─────────────────┘         └──────┬───────────┬───────┘
                                    │            │
                            Managed Identity  Managed Identity
                            (no passwords)    (no passwords)
                                    ▼            ▼
                          ┌─────────────┐  ┌──────────────────┐
                          │ Azure        │  │ AI Foundry        │
                          │ Storage      │  │                  │
                          │ (encrypted)  │  │ Multiple models  │
                          └─────────────┘  │ Your choice      │
                                           └──────────────────┘
```

---

### Zero Stored Secrets

| Traditional Approach | This Application |
|---------------------|------------------|
| Database passwords in config files | **No passwords anywhere** |
| API keys for AI services | **Managed Identity** — Azure handles auth |
| Connection strings shared across team | **Role-Based Access Control** — each service has exactly the permissions it needs |
| Manual secret rotation | **Nothing to rotate** |

Every connection — storage, AI models, deployment — uses Azure Managed Identity. There are no secrets to leak, rotate, or manage.

#### 📂 See it in the code

Here's the actual infrastructure-as-code that grants permissions — no passwords, just role assignments ([`rbac.bicep`](https://github.com/michaelsrichter/fraud-ai-demo/blob/main/infra/modules/rbac.bicep#L28-L35)):

```
assignments = [
  { scope: 'storage', principalId: functionsPrincipalId, role: storageBlobDataContributor }
  { scope: 'storage', principalId: functionsPrincipalId, role: storageTableDataContributor }
  { scope: 'foundry', principalId: functionsPrincipalId, role: cognitiveServicesUser }
]
```

The application's identity gets exactly the permissions it needs — nothing more. No API keys, no connection strings, no secrets in config files.

---

### Infrastructure as Code

The entire Azure environment is defined in code (Bicep templates):

- Storage accounts with encryption
- Serverless compute with auto-scaling
- AI model deployments
- Network security rules
- Role-based access control assignments

**One command deploys everything:**

```
azd up
```

The proof-of-concept your team validates on Tuesday can be deployed to a governed, auditable Azure environment by Thursday — without re-architecting anything.

---

### Model Flexibility

**AI Models** — When you build on AI Foundry, you can choose from many model providers:
- **OpenAI** — GPT-5.4, GPT-5.3, GPT-5.4 Mini (used in this demo)
- **Anthropic** — Claude models
- **Meta** — Llama models
- **Microsoft** — Phi models
- **xAI** — Grok models
- And more — the platform is model-agnostic

This demo uses the latest GPT models from OpenAI, but the architecture doesn't lock you in. Switch models without changing application code.

**ML Models** — Three different anomaly detection approaches:
- Randomized PCA (unsupervised — no labels needed)
- SDCA Logistic Regression (supervised classification)
- Fast Forest (ensemble decision trees)

Each uses fundamentally different mathematics. Where they agree, you have strong signal. Where they disagree, you know to investigate further.

---

## What This Means for Your Team

### The Shift

| Before | Now |
|--------|-----|
| 6-month software development cycle | Days to working prototype |
| Generic tools adapted to your workflow | Purpose-built tools that match your process |
| IT bottleneck for every enhancement | Domain experts drive the specifications |
| Quarterly release cadence | Iterate in days |

---

### Beyond Expense Fraud

The same patterns — ML scoring, AI investigation, adversarial reasoning, escalation pipelines — apply to any fraud domain:

- **Insurance claims** — Claim history patterns, provider network analysis, coordinated scheme detection
- **Payment fraud** — Transaction scoring, velocity analysis, geographic anomaly detection
- **Healthcare fraud** — Billing pattern analysis, upcoding detection, phantom patient identification
- **Tax fraud** — Return anomaly scoring, entity relationship mapping, deduction pattern analysis
- **Financial statement fraud** — Ratio analysis, journal entry testing, related-party transaction flagging

**The patterns are the same. The data changes. Your domain expertise is what makes it work.**

---

### The Takeaway

1. **Your fraud expertise is the most valuable input.** Describe the patterns, the red flags, the investigation workflows — and working software follows in days.

2. **AI investigation is a force multiplier.** Four different reasoning strategies give you structured, evidence-cited second opinions at machine speed. If the AI goes down, everything else keeps working.

3. **Production-grade from day one.** Zero secrets, managed identity, infrastructure-as-code. What you validate today deploys to a governed environment tomorrow with a single command.

---

### Try It Yourself

- **Live demo:** [AI Fraud Lab](/labs/expenses)
- **Source code:** [github.com/michaelsrichter/fraud-ai-demo](https://github.com/michaelsrichter/fraud-ai-demo)
- **Build story:** [How we built this in 4 days](/story)

---

*All data is synthetic — no real transactions or individuals are represented.*
*This is a demonstration of capabilities, not a production fraud detection system.*

**Mike Richter** · [LinkedIn](https://www.linkedin.com/in/mikerichter/)
