# How We Built This: An AI Fraud Detection App in 4 Days

## For Fraud Examiners and Investigators

You're looking at a fully functional AI-powered fraud detection application — synthetic data generation, machine learning scoring, multi-model AI investigation with four distinct reasoning strategies, interactive visualizations, and cloud deployment. It was built in **four days** by one person using agentic coding.

The expense fraud scenario you'll see is intentionally simplified. Real expense fraud is far more nuanced, and you know that better than anyone. But the point isn't the complexity of the use case — it's **how fast a domain-specific fraud investigation tool can go from idea to working software** when AI is writing the code.

Imagine describing the fraud patterns your team encounters every day — the red flags, the investigation workflows, the data sources you cross-reference — and having a working prototype built in less than a week. That's what this project demonstrates.

---

## The Timeline

### Day 1 — May 6: From Zero to Fraud Detection
**Spec 001: AI-Powered Internal Expense Fraud Demo**

The project started with a blank repository and a plain-language description:

> *"Simulate employee expense activity, detect anomalous behavior with ML, and apply an AI investigation layer to analyze ambiguous cases."*

From that sentence, the AI coding agent (GitHub Copilot powered by Claude Opus) worked through a structured specification workflow:

1. **Specification** — Defined user stories, acceptance criteria, edge cases, and requirements. The AI asked clarifying questions: *"Should AI investigation be available on all cases or only medium-confidence ones?"* and *"What's the default dataset size?"*

2. **Planning** — Designed the full architecture: a .NET backend with Azure Functions, a React frontend, ML.NET for anomaly detection, Microsoft Foundry for AI investigation, Azure Storage for persistence, and Bicep infrastructure-as-code.

3. **Task Generation** — Broke the plan into 89 ordered, dependency-aware implementation tasks, each specifying exact file paths.

4. **Implementation** — Built it all: synthetic employee and expense data generation with three fraud patterns (threshold gaming, unusual frequency, vendor anomaly), a Randomized PCA anomaly detector using ML.NET, confidence banding (high/medium/low), an AI investigator powered by Microsoft Foundry that produces structured verdicts with reasoning, a consensus mode running three LLMs side-by-side with an arbiter model, and a complete React UI with case lists, visualizations, and drill-down.

**What was delivered**: A working web application where you can generate a dataset of up to 50,000 synthetic expense records, run ML-based anomaly detection, review flagged cases organized by confidence band, and ask an AI to investigate any case — producing a verdict, rationale, key signals, and recommended action.

---

### Day 2 — May 7: Platform & User Management
**Spec 002: AI Fraud Lab — Multi-Scenario Platform**

The single-page demo evolved into a platform:

- **Multi-lab architecture** — A homepage with navigation to different fraud investigation labs (Expenses active; Insurance and Payments as future scenarios), showing how the same ML + AI investigation pattern applies across fraud domains.
- **User profiles** — Each visitor creates a lightweight profile (stored in the browser) so their generated runs are isolated. No authentication complexity — just enough for a multi-user demo.
- **Admin dashboard** — A server-synced profile system with an admin view showing user counts, run counts, and investigation activity. Protected by Azure Static Web Apps built-in GitHub authentication.
- **Session analytics** — Microsoft Clarity integrated for session recording and heatmaps, giving visibility into how demo audiences interact with the application.

---

### Day 3 — May 8: Intelligent Agent Tools & New Investigation Modes
**Spec 003: Agent Tools + Spec 004: Investigation Modes**

This was the most ambitious day — two full feature specs implemented:

#### Giving AI Agents Real Tools (Spec 003)

Up to this point, the AI investigator worked from a fixed prompt — it saw the case details and reasoned about them. That changed:

- **Data retrieval tool** — The AI agent can now autonomously query the full dataset during an investigation. It might pull all expenses from the same vendor, fetch the employee's 90-day history, or compare spending against peer averages. Just like a human investigator drilling into the data.
- **Python Code Interpreter** — Via Microsoft Foundry's MCP Toolbox, the agent can write and execute Python code for complex quantitative analysis — Benford's Law distributions, statistical outlier tests, temporal pattern detection. The agent decides when a calculation would strengthen its case.
- **Real-time streaming** — Tool invocations stream to the UI via Server-Sent Events as they happen, so you can watch the agent think: *"Fetched 47 expenses from vendor OffshoreLLC... Executed Python: computed z-scores for amount distribution..."*

#### Four Investigation Modes (Spec 004)

A single AI verdict is useful, but comparing different reasoning approaches is powerful:

- **Single Agent** — One model investigates the case. Quick and direct.
- **Consensus** — Three different LLMs (GPT-5.4, GPT-5.3 Chat, GPT-5.4 Mini) investigate the same case independently, then an arbiter model synthesizes their findings into a final verdict. Where the models agree, you have high confidence. Where they disagree, you know to look closer.
- **Debate** — Two agents with opposing biases (one fraud-leaning, one legitimacy-leaning) independently investigate the case. An arbiter evaluates both arguments and renders a final determination. This mirrors adversarial review processes in professional fraud investigation.
- **Junior → Senior** — A cost-optimized escalation pipeline. A faster, cheaper model handles the initial review. If its confidence is high enough, the case is resolved. If not, it escalates to a more capable model with the junior's preliminary findings. This mirrors how investigation teams triage cases in practice.

---

### Day 4 — May 9-10: ML Model Depth & Visualization
**Spec 005: ML Scoring Models & Data Visualization**

The final phase added analytical depth:

- **Three ML scoring models** — Beyond the original Randomized PCA, added SDCA Logistic Regression (supervised classification) and Fast Forest (ensemble decision trees). Each model uses fundamentally different mathematics to identify anomalies. Run them all on the same dataset and see where they agree and where they don't.
- **Tunable parameters** — Each model exposes its key parameters (PCA rank, regularization weights, number of trees) so investigators can see how tuning affects detection sensitivity.
- **Four visualization types** — Tabbed navigation between scatter plots (amount vs. confidence), band distribution charts, amount histograms, and feature contribution heatmaps. Each chart can switch between models for comparison.
- **Realistic synthetic data** — Upgraded from uniform distributions to log-normal distributions with 2-5% legitimate outliers and subtler fraud signals. The data now looks more like real expense data, making the ML challenge more realistic.
- **ML model documentation** — A comprehensive guide explaining how each model works, its strengths and weaknesses, and when to prefer one over another.

---

## The Process: How Agentic Coding Works

This project was built using **Spec Kit**, a structured workflow that guides AI coding agents through a disciplined process:

### 1. Specify
You describe what you want in plain language. The AI asks clarifying questions, probes for edge cases, and produces a formal specification with user stories, acceptance criteria, and requirements. Nothing is assumed.

### 2. Plan
The specification feeds into an implementation plan — architecture decisions, technology choices, data models, API contracts, and a project structure. A "constitution check" validates that every decision aligns with the project's guiding principles (security, testing, observability, etc.).

### 3. Generate Tasks
The plan is decomposed into dependency-ordered implementation tasks. Each task names exact file paths, specifies what to build, and includes testing requirements. Tasks are grouped by user story so features can be delivered incrementally.

### 4. Implement
The AI coding agent executes each task — creating files, writing code, running tests, fixing errors. It reads its own specifications and follows its own plan. A human reviews and guides, but the AI does the heavy lifting.

### Why This Matters

The key insight is that **the specifications are the product, not the code**. The AI writes the code, but the human shapes the intent. Every feature in this application started as a conversation — a clarifying question answered, a requirement refined, an edge case identified. The specifications capture that intent in a way the AI can execute reliably.

This means a fraud examiner who understands investigation workflows can describe what they need, and the tooling to build it already exists. The bottleneck isn't programming skill — it's domain expertise. And that's something fraud professionals have in abundance.

---

## By the Numbers

| Metric | Value |
|--------|-------|
| Days of development | 4 |
| Feature specifications | 5 |
| Total commits | 43+ |
| Lines of code (backend C#) | ~5,000+ |
| Lines of code (frontend TypeScript) | ~4,000+ |
| Unit tests (backend xUnit) | 50+ |
| Unit tests (frontend Vitest) | 30+ |
| ML scoring models | 3 |
| AI investigation modes | 4 |
| Azure services | 5 (Functions, Static Web Apps, Blob Storage, Table Storage, AI Foundry) |
| Infrastructure-as-Code modules | 6 Bicep modules |
| System prompts | 7 (investigator, arbiter, debate bias × 2, junior, senior, consensus) |

---

## What This Means for Fraud Professionals

### The Use Case Is Simple. The Capability Is Not.

Employee expense fraud is one of the most straightforward fraud types — and that's by design. It lets us focus on the tooling rather than the domain complexity. But consider what's actually happening under the hood:

- **Multiple ML models** scoring the same dataset with different mathematical approaches
- **AI agents** that autonomously query data, run calculations, and build structured arguments
- **Adversarial reasoning** where biased agents argue opposing positions before an arbiter decides
- **Escalation pipelines** that triage cases by confidence level
- **Real-time transparency** showing every step of the AI's reasoning process

Now imagine these same capabilities applied to your domain:

- **Insurance claims** — Pattern detection across claim histories, provider networks, and policy timelines. AI agents that cross-reference medical codes, review claimant histories, and flag coordinated schemes.
- **Payment fraud** — Real-time transaction scoring with multiple models, velocity analysis, geographic anomaly detection. AI investigation of flagged transactions with access to full account history.
- **Healthcare fraud** — Provider billing pattern analysis, upcoding detection, phantom patient identification. Multiple ML models trained on different signal types with AI-powered case synthesis.
- **Tax fraud** — Return anomaly scoring, deduction pattern analysis, entity relationship mapping. AI agents that reason about complex corporate structures and financial flows.

The patterns are the same. The data changes. The domain expertise — yours — is what makes it work.

### Speed Changes Everything

Traditional software development for a custom fraud investigation tool might take months of requirements gathering, architecture design, development sprints, and testing cycles. This project compressed that into days.

That speed isn't just convenient — it's transformative. It means:

- **Rapid prototyping** — Test a hypothesis about a fraud pattern by building a working detector in days, not quarters.
- **Domain-specific tooling** — Instead of adapting generic software to your workflow, describe your workflow and get purpose-built tools.
- **Iterative refinement** — Build version one, test it with real investigators, and iterate. Each cycle takes days, not months.

The future of fraud investigation tooling isn't buying off-the-shelf software and hoping it fits. It's describing exactly what you need and watching it get built.

---

## Technical Stack

For the technically curious:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | .NET 10 / C# | Serverless API runtime |
| ML Scoring | ML.NET 4.0 | Anomaly detection (PCA, SDCA, FastForest) |
| AI Agents | Microsoft Agent Framework | LLM orchestration with tool-calling |
| AI Models | Microsoft Foundry (GPT-5.4, 5.3, 5.4 Mini) | Investigation reasoning |
| Frontend | React 19 / TypeScript / Vite | Interactive UI |
| Charts | Recharts | Data visualization |
| Storage | Azure Blob + Table Storage | Run persistence and indexing |
| Hosting | Azure Functions + Static Web Apps | Serverless deployment |
| Infrastructure | Bicep | Infrastructure-as-Code |
| Deployment | Azure Developer CLI (azd) | One-command deploy |

---

*All data in this application is synthetic. No real transactions, employees, or individuals are represented. This is a demonstration of capabilities, not a production fraud detection system.*
