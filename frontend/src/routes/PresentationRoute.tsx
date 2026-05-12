import { Link } from "react-router-dom";
import { useState } from "react";
import stats from "../generated/stats.json";

/* ── Slide data ── */

interface Slide {
  id: string;
  label: string;
}

const SLIDES: Slide[] = [
  { id: "title", label: "Title" },
  { id: "problem", label: "The Problem" },
  { id: "lessons", label: "3 Lessons" },
  { id: "responsible-ai", label: "Responsible AI" },
  { id: "live-demo", label: "Live Demo" },
  { id: "lesson1", label: "Lesson 1" },
  { id: "vibe-coding", label: "Vibe Coding" },
  { id: "conversation", label: "The Conversation" },
  { id: "fraud-code", label: "Fraud Code" },
  { id: "process", label: "The Process" },
  { id: "timeline", label: "Timeline" },
  { id: "lesson1-why", label: "Why It Matters" },
  { id: "before-after", label: "Before vs After" },
  { id: "knowledge", label: "Institutional Knowledge" },
  { id: "lesson2", label: "Lesson 2" },
  { id: "ml-vs-ai", label: "ML vs GenAI" },
  { id: "ml-scoring-code", label: "ML Scoring" },
  { id: "ai-signals", label: "AI Signals" },
  { id: "four-modes", label: "4 Modes" },
  { id: "debate-prompts", label: "Debate Prompts" },
  { id: "agent-tools", label: "Agent Tools" },
  { id: "resilience", label: "Resilience" },
  { id: "lesson3", label: "Lesson 3" },
  { id: "architecture", label: "Architecture" },
  { id: "zero-secrets", label: "Zero Secrets" },
  { id: "iac", label: "Infra as Code" },
  { id: "models", label: "Model Flexibility" },
  { id: "shift", label: "The Shift" },
  { id: "beyond", label: "Beyond Expenses" },
  { id: "takeaway", label: "Takeaway" },
  { id: "try-it", label: "Try It" },
];

/* ── Styles ── */

const S = {
  page: { maxWidth: 960, margin: "0 auto", padding: "0 24px 64px" } as const,
  slide: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    padding: "48px 0",
    borderBottom: "1px solid var(--border)",
  },
  slideCompact: {
    padding: "32px 0",
    borderBottom: "1px solid var(--border)",
  },
  h1: { fontSize: "2.4rem", margin: "0 0 16px", lineHeight: 1.2 },
  h2: { fontSize: "1.8rem", margin: "0 0 12px", lineHeight: 1.3 },
  h3: { fontSize: "1.25rem", margin: "0 0 8px" },
  sub: { fontSize: "1.1rem", color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 8px" },
  body: { fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 16px" },
  accent: { color: "var(--link)", fontWeight: 700 as const },
  tag: {
    display: "inline-block",
    fontSize: "0.7rem",
    fontWeight: 600 as const,
    padding: "2px 10px",
    borderRadius: 999,
    background: "var(--bg-hover)",
    color: "var(--text-muted)",
    marginRight: 6,
  },
  callout: {
    borderLeft: "4px solid var(--link)",
    padding: "16px 20px",
    background: "var(--bg-surface)",
    borderRadius: "0 8px 8px 0",
    margin: "16px 0",
  },
  quote: {
    fontStyle: "italic" as const,
    fontSize: "1.15rem",
    lineHeight: 1.6,
    color: "var(--text)",
    margin: "0 0 8px",
  },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.88rem", margin: "16px 0" },
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    borderBottom: "2px solid var(--border)",
    fontWeight: 600,
    fontSize: "0.82rem",
    color: "var(--text-muted)",
  },
  td: { textAlign: "left" as const, padding: "8px 12px", borderBottom: "1px solid var(--border)" },
  archBox: {
    display: "inline-block",
    padding: "12px 20px",
    borderRadius: 8,
    border: "2px solid var(--border)",
    background: "var(--bg-surface)",
    textAlign: "center" as const,
    minWidth: 140,
  },
  archArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    color: "var(--text-muted)",
    padding: "4px 12px",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: "0.82rem",
    background: "var(--bg)",
    padding: "12px 16px",
    borderRadius: 8,
    whiteSpace: "pre" as const,
    overflowX: "auto" as const,
    lineHeight: 1.6,
    color: "var(--text-muted)",
    margin: "12px 0",
  },
  lessonBadge: (color: string) => ({
    display: "inline-block",
    fontSize: "0.72rem",
    fontWeight: 700 as const,
    padding: "3px 12px",
    borderRadius: 999,
    background: color,
    color: "#fff",
    marginBottom: 12,
  }),
  navDot: (active: boolean) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: active ? "var(--link)" : "var(--bg-hover)",
    cursor: "pointer",
    transition: "background 0.2s",
    border: "none",
    padding: 0,
  }),
};

/* ── Component ── */

export function PresentationRoute() {
  const [tocOpen, setTocOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
  };

  return (
    <div style={S.page}>
      {/* Floating TOC toggle */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100 }}>
        {tocOpen && (
          <div
            className="panel"
            style={{
              marginBottom: 8,
              maxHeight: "60vh",
              overflowY: "auto",
              width: 200,
              boxShadow: "0 4px 20px rgba(0,0,0,.3)",
            }}
          >
            {SLIDES.map((s) => (
              <div
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  borderRadius: 4,
                  color: "var(--text-muted)",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {s.label}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setTocOpen(!tocOpen)}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,.3)",
          }}
          title="Slide navigation"
        >
          {tocOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ════════════ TITLE ════════════ */}
      <section id="title" style={{ ...S.slide, textAlign: "center" }}>
        <p style={{ ...S.tag, margin: "0 auto 16px" }}>
          NYCFE SPRING FRAUD CONFERENCE · MAY 16, 2026
        </p>
        <h1 style={{ ...S.h1, fontSize: "2.6rem" }}>
          From Idea to Fraud Lab in Days
        </h1>
        <p style={{ ...S.sub, maxWidth: 700, margin: "0 auto 16px" }}>
          How Fraud Teams Can Build Purpose-Built Detection Tools — Without Waiting on Engineering Cycles
        </p>
        <p style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
          <strong>Mike Richter</strong> · Principal Partner Solution Architect, Microsoft
        </p>
      </section>

      {/* ════════════ THE PROBLEM ════════════ */}
      <section id="problem" style={S.slide}>
        <h2 style={S.h2}>The Problem</h2>
        <p style={S.body}>
          Fraud teams know exactly what to look for — the red flags, the patterns,
          the investigator instincts built over years of case work. But turning that
          knowledge into tooling has always required long engineering cycles and generic
          platforms adapted to your workflow.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, margin: "16px 0" }}>
          <SignalCard icon="🚩" title="False Positives" desc="Investigator hours consumed on cases that aren't fraud" />
          <SignalCard icon="⏳" title="Triage Bottlenecks" desc="High-risk cases wait in queue behind routine reviews" />
          <SignalCard icon="📈" title="Scaling Expertise" desc="Junior analysts lack the pattern recognition seniors carry" />
          <SignalCard icon="💭" title="Knowledge Loss" desc="Institutional knowledge walks out the door when senior investigators leave" />
        </div>
        <div style={S.callout}>
          <p style={{ ...S.quote, margin: 0 }}>
            What if fraud teams could actively shape and evolve their own tooling
            in <strong>days</strong> instead of months?
          </p>
        </div>
      </section>

      {/* ════════════ THREE LESSONS ════════════ */}
      <section id="lessons" style={S.slide}>
        <h2 style={S.h2}>Three Lessons You'll Take Away</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          <LessonCard
            num={1}
            color="#2563eb"
            title="Domain expertise is now the highest-value input — the bottleneck is no longer engineering capacity"
            body="When a technical architect feeds your domain knowledge to an AI coding agent, what used to be a six-month build collapses into days. The limiting factor has shifted from 'can we build it?' to 'can we describe what we're looking for?'"
          />
          <LessonCard
            num={2}
            color="#d97706"
            title="AI assists the investigator — it doesn't autonomously make fraud decisions"
            body="The AI investigation layer takes the same behavioral signals an analyst would review and returns a structured assessment: likely, unlikely, or inconclusive, with cited evidence and a recommended next step. Humans review, validate, and make the final call."
          />
          <LessonCard
            num={3}
            color="#16a34a"
            title="A prototype becomes production-grade — without re-architecting anything"
            body="Everything runs on Azure with zero stored secrets — managed identity, role-based access control, infrastructure as code. The proof-of-concept your team validates on Tuesday can deploy to a governed, auditable environment by Thursday with a single command."
          />
        </div>
      </section>

      {/* ════════════ RESPONSIBLE AI ════════════ */}
      <section id="responsible-ai" style={S.slideCompact}>
        <div style={{ ...S.callout, borderLeftColor: "#7c3aed" }}>
          <h3 style={{ ...S.h3, marginBottom: 8 }}>🛡️ A Note on Responsible AI</h3>
          <p style={{ ...S.body, margin: "0 0 8px" }}>
            <strong>AI assists investigations — it does not autonomously make fraud decisions. Humans stay accountable.</strong>
          </p>
          <p style={{ ...S.body, margin: 0 }}>
            Every AI-generated assessment in this system is a recommendation, not a ruling.
            The investigator reviews the evidence, validates the reasoning, and makes the final call.
            The system runs in a sandboxed environment with governance controls, audit logging,
            and role-based access. This is a decision-support tool, not an autonomous agent.
          </p>
        </div>
      </section>

      {/* ════════════ LIVE DEMO ════════════ */}
      <section id="live-demo" style={{ ...S.slide, textAlign: "center" }}>
        <h2 style={S.h2}>🖥️ Live Demo</h2>
        <p style={{ ...S.sub, maxWidth: 600, margin: "0 auto 24px" }}>
          Let's look at the actual application before we dive into the lessons.
        </p>
        <Link to="/labs/expenses">
          <button style={{ padding: "16px 36px", fontSize: "1.1rem", fontWeight: 600 }}>
            ⚡ Launch the Expense Fraud Lab
          </button>
        </Link>
        <p className="muted" style={{ marginTop: 16, fontSize: "0.82rem" }}>
          Generate a dataset, see the ML scoring results, drill into a flagged case,
          and trigger an AI investigation. We'll come back to the demo throughout the talk.
        </p>
      </section>

      {/* ════════════ LESSON 1: DOMAIN EXPERTISE ════════════ */}
      <section id="lesson1" style={S.slide}>
        <div style={S.lessonBadge("#2563eb")}>LESSON 1</div>
        <h2 style={S.h2}>Domain Expertise Is Now the Highest-Value Input</h2>
        <p style={{ ...S.sub, fontSize: "1.3rem" }}>
          The bottleneck is no longer engineering capacity.
        </p>
        <p style={S.body}>
          The hardest part of building this system wasn't writing code.
          It was describing the fraud patterns accurately.
        </p>
      </section>

      {/* ── Vibe Coding ── */}
      <section id="vibe-coding" style={S.slideCompact}>
        <h3 style={S.h3}>What Is "Vibe Coding"?</h3>
        <p style={S.body}>
          Instead of writing code line by line, you describe what you want in natural language
          to an AI coding agent (<strong>GitHub Copilot</strong>). The agent:
        </p>
        <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
          {[
            "Asks clarifying questions about your requirements",
            "Designs the architecture and data models",
            "Writes the code, tests, and infrastructure",
            "Fixes its own errors and iterates",
          ].map((t) => (
            <li key={t} style={{ ...S.body, marginBottom: 4 }}>{t}</li>
          ))}
        </ul>
        <p style={{ fontSize: "1rem", fontWeight: 600 }}>
          You shape the intent. The AI writes the implementation.
        </p>
      </section>

      {/* ── Conversation ── */}
      <section id="conversation" style={S.slideCompact}>
        <h3 style={S.h3}>The Conversation That Built This App</h3>
        <p style={{ ...S.body, marginBottom: 12 }}>A real exchange from Day 1:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ConvBubble who="me" text="Simulate employee expense activity, detect anomalous behavior with ML, and apply an AI investigation layer to analyze ambiguous cases." />
          <ConvBubble who="ai" text="Should the 'Investigate with AI' action be available on all cases, or only medium-confidence ones?" />
          <ConvBubble who="me" text="Available on all bands — high, medium, low. Medium is the suggested focus but nothing is hidden." />
          <ConvBubble who="ai" text="What's the default dataset size and hard upper cap?" />
          <ConvBubble who="me" text="Default 5,000 records. Cap at 50,000." />
          <ConvBubble who="ai" text="How configurable is the fraud-pattern mix — single dial, per-pattern weights, or toggles?" />
          <ConvBubble who="me" text="One overall intensity dial plus per-pattern weights for threshold-gaming, unusual frequency, and vendor anomaly." />
        </div>
        <p style={{ ...S.body, marginTop: 16 }}>
          From that conversation, the AI produced a formal specification with user stories,
          an implementation plan, <strong>89 ordered tasks</strong> with exact file paths —
          then built all of it.
        </p>
      </section>

      {/* ── Fraud Code Snippet ── */}
      <section id="fraud-code" style={S.slideCompact}>
        <h3 style={S.h3}>What the Code Actually Looks Like</h3>
        <p style={S.body}>
          Here's the actual code that generates threshold-gaming fraud — expenses deliberately
          clustered just below the $1,000 auto-approval limit:
        </p>
        <div style={S.mono}>
{`// From FraudInjector.cs — Threshold Gaming Pattern
var jitter = (decimal)(rng.NextDouble() * 100 - 50); // -50 .. +50
var amount = CompanyExpenseThreshold - 1m + jitter;
// Occasionally generate sub-threshold amounts to blend with legitimate
if (rng.NextDouble() < 0.25)
    amount = (decimal)Math.Round(800 + rng.NextDouble() * 150, 2);`}
        </div>
        <p style={S.body}>
          You don't need to read C#. The point is: a natural-language description of
          "threshold gaming" became working code that generates realistic-looking
          fraudulent expenses.
        </p>
        <a
          href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/backend/src/Application/Services/FraudInjector.cs#L105-L118"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", color: "var(--link)" }}
        >
          📂 View FraudInjector.cs on GitHub →
        </a>
      </section>

      {/* ── Process ── */}
      <section id="process" style={S.slideCompact}>
        <h3 style={S.h3}>The Process: Spec → Plan → Tasks → Code</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginTop: 16 }}>
          <ProcessCard step="1" title="Specify" items={["User stories", "Edge cases", "Requirements"]} />
          <ProcessCard step="2" title="Plan" items={["Architecture", "Data models", "API design"]} />
          <ProcessCard step="3" title="Tasks" items={["89 ordered tasks", "Exact file paths", "Test requirements"]} />
          <ProcessCard step="4" title="Implement" items={["Code & tests", "Infrastructure", "Documentation"]} />
        </div>
        <p style={{ ...S.body, marginTop: 16 }}>
          This structured process is what makes agentic coding reliable — it's not just "ask AI
          to write code." It's a disciplined engineering workflow where the AI follows its own specification.
        </p>
      </section>

      {/* ── Timeline ── */}
      <section id="timeline" style={S.slideCompact}>
        <h3 style={S.h3}>The 4-Day Timeline</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <TimelineRow
            day="Day 1" date="May 6–7" title="Core Fraud Detection" color="var(--band-low)"
            items={[
              "Synthetic employee & expense data with 3 fraud patterns",
              "ML.NET anomaly scoring (Randomized PCA)",
              "Confidence banding: high / medium / low",
              "AI investigator producing structured verdicts",
              "React frontend with case lists and scatter plots",
            ]}
          />
          <TimelineRow
            day="Day 2" date="May 7" title="Platform & User Management" color="var(--band-medium)"
            items={[
              "Multi-lab homepage architecture",
              "User profiles and data isolation",
              "Admin dashboard with activity metrics",
            ]}
          />
          <TimelineRow
            day="Day 3" date="May 8" title="Agent Intelligence" color="var(--band-high)"
            items={[
              "AI agents autonomously query the full dataset mid-investigation",
              "Python code interpreter for quantitative analysis",
              "Real-time streaming of agent reasoning",
              "Debate mode: opposing agents argue before an arbiter",
              "Junior → Senior: escalation pipeline",
            ]}
          />
          <TimelineRow
            day="Day 4" date="May 9–10" title="ML Depth & Visualization" color="var(--link)"
            items={[
              "Three ML models: PCA, SDCA, Fast Forest",
              "Four chart types with per-model switching",
              "Tunable model parameters",
              "Log-normal data distributions with outliers",
            ]}
          />
        </div>
      </section>

      {/* ── Lesson 1 Why ── */}
      <section id="lesson1-why" style={S.slideCompact}>
        <h3 style={S.h3}>Why This Matters to You</h3>
        <div style={S.callout}>
          <p style={{ ...S.quote, margin: 0 }}>
            The <strong>specifications</strong> are the product, not the code.
          </p>
        </div>
        <p style={S.body}>
          Every feature started as a description of a fraud pattern, an investigation workflow,
          or a triage process. If you can describe what you're looking for — the red flags, the
          data you cross-reference, the questions you ask — the tooling to build it into software
          already exists.
        </p>
        <p style={{ fontSize: "1rem", fontWeight: 600 }}>
          Domain expertise is the highest-value input. And that's exactly what your team has.
        </p>
      </section>

      {/* ── Before vs After ── */}
      <section id="before-after" style={S.slideCompact}>
        <h3 style={S.h3}>Before vs. After: The Investigator's Workflow</h3>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}></th>
              <th style={S.th}>Before (Manual Review)</th>
              <th style={{ ...S.th, color: "var(--link)" }}>After (AI-Assisted Triage)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Initial triage</td><td style={S.td}>Analyst manually reviews each flagged case</td><td style={S.td}>ML scores all records instantly; AI pre-investigates ambiguous cases</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Time per case</td><td style={S.td}>30–60 min of manual cross-referencing</td><td style={S.td}>10–60 sec AI assessment; analyst reviews summary</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Junior support</td><td style={S.td}>Escalate to senior; wait for availability</td><td style={S.td}>AI provides structured analysis with cited evidence; junior reviews with context</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Pattern docs</td><td style={S.td}>Tribal knowledge; informal notes</td><td style={S.td}>Encoded in prompt templates and detection rules — reusable, version-controlled</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Scaling the team</td><td style={S.td}>Hire and train (months)</td><td style={S.td}>Capture senior patterns in AI workflows (days)</td></tr>
          </tbody>
        </table>
        <p style={S.body}>
          The investigator's role doesn't change — they still make the call. But instead of
          spending an hour assembling the evidence, they spend five minutes reviewing a structured brief.
        </p>
      </section>

      {/* ── Institutional Knowledge ── */}
      <section id="knowledge" style={S.slideCompact}>
        <h3 style={S.h3}>🏛️ Capturing Institutional Knowledge</h3>
        <div style={S.callout}>
          <p style={{ ...S.quote, margin: 0 }}>
            Experienced investigators can encode their expertise into <strong>reusable systems</strong>.
          </p>
        </div>
        <p style={S.body}>
          The fraud patterns, the investigation heuristics, the red flags that take years to learn —
          all of it gets captured in prompt templates, detection rules, and investigation workflows
          that persist even when team members move on.
        </p>
        <p style={{ fontSize: "1rem", fontWeight: 600 }}>
          This turns institutional knowledge from something that lives in people's heads
          into something that scales across the team and survives turnover.
        </p>
      </section>

      {/* ════════════ LESSON 2: SECOND OPINION ════════════ */}
      <section id="lesson2" style={S.slide}>
        <div style={S.lessonBadge("#d97706")}>LESSON 2</div>
        <h2 style={S.h2}>AI Doesn't Replace Traditional ML — It Picks Up Where ML Leaves Off</h2>
        <p style={{ ...S.sub, fontSize: "1.2rem" }}>
          Generative AI has a lot of hype right now. But it is not a replacement
          for traditional machine learning models.
        </p>
      </section>

      {/* ── ML vs GenAI ── */}
      <section id="ml-vs-ai" style={S.slideCompact}>
        <h3 style={S.h3}>Two Different Tools for Two Different Jobs</h3>
        <p style={S.body}>
          Fraud detection is fundamentally about finding anomalies. Traditional ML models
          are purpose-built for exactly this — and they do it fast and cheap.
        </p>

        {/* Comparison table */}
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}></th>
              <th style={{ ...S.th, color: "var(--band-low)" }}>ML Scoring Models</th>
              <th style={{ ...S.th, color: "var(--band-medium)" }}>GenAI Investigators</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Purpose</td><td style={S.td}>Score every record for anomalies</td><td style={S.td}>Investigate ambiguous cases with reasoning</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Speed</td><td style={S.td}>5,000 records in &lt; 2 seconds</td><td style={S.td}>1 case in 10–60 seconds</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Cost</td><td style={S.td}>Fractions of a cent per record</td><td style={S.td}>$0.02–$0.15 per investigation</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Strengths</td><td style={S.td}>Scale, consistency, deterministic</td><td style={S.td}>Reasoning, context, natural language</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Limitations</td><td style={S.td}>No reasoning — just a score</td><td style={S.td}>Slow, expensive, non-deterministic</td></tr>
          </tbody>
        </table>

        {/* Escalation pipeline diagram */}
        <h4 style={{ ...S.h3, marginTop: 24, fontSize: "1rem" }}>The Escalation Pipeline</h4>
        <p style={S.body}>
          ML handles the volume. AI handles the ambiguity. This is the same pattern
          your team already uses — automated scoring triages the workload, and human
          examiners focus on the cases that need judgment.
        </p>
        <div style={{
          display: "flex", alignItems: "stretch", justifyContent: "center",
          flexWrap: "wrap", gap: 0, marginTop: 16,
        }}>
          <PipelineStep
            color="var(--band-low)" icon="📥" title="All 5,000 Records"
            desc="Raw expense data" width={140}
          />
          <PipelineArrow label="ML scores all" />
          <PipelineStep
            color="var(--band-low)" icon="⚡" title="ML Scoring"
            desc="Fast, cheap, deterministic" sub="< 2 seconds" width={150}
          />
          <PipelineArrow label="Bands assigned" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
            <PipelineBranch color="var(--band-low)" label="✅ Low risk (80–90%)" desc="No action needed" />
            <PipelineBranch color="var(--band-high)" label="🚨 High risk (2–5%)" desc="Auto-flag for review" />
            <PipelineBranch color="var(--band-medium)" label="❓ Medium / unclear (5–15%)" desc="The hard cases" highlight />
          </div>
          <PipelineArrow label="Escalate" />
          <PipelineStep
            color="var(--band-medium)" icon="🧠" title="AI Investigators"
            desc="Reasoning, tools, evidence" sub="10–60 sec each" width={160}
          />
        </div>
        <p style={{ ...S.body, marginTop: 16 }}>
          In this demo, I'm using pre-built generic anomaly detectors from ML.NET.
          Training a domain-specific fraud model takes real effort — but once it's
          built, it deploys and scales instantly. That model-building process is
          outside this demo's scope. What this demo shows is:{" "}
          <strong>when that ML model doesn't have a conclusive result, we bring in
          AI investigators with reasoning skills and tools</strong> — instead of
          immediately escalating to a human fraud examiner.
        </p>
      </section>

      {/* ── ML Scoring Code ── */}
      <section id="ml-scoring-code" style={S.slideCompact}>
        <h3 style={S.h3}>ML Scoring: Fast, Cheap, Deterministic</h3>
        <p style={S.body}>
          Here's the actual scoring code — the ML model trains and scores all 5,000
          records in a single pass:
        </p>
        <div style={S.mono}>
{`// From MlNetAnomalyScorer.cs — Randomized PCA
var pipeline = ml.AnomalyDetection.Trainers.RandomizedPca(
    featureColumnName: "Features",
    rank: rank,
    ensureZeroMean: true,
    seed: seed);

var model = pipeline.Fit(data);     // Train
var transformed = model.Transform(data); // Score all records`}
        </div>
        <p style={S.body}>
          That's it. A few lines of code, and every expense record gets a confidence score.
          The banding logic then sorts them into high / medium / low risk:
        </p>
        <div style={S.mono}>
{`// From BandingHelpers.cs
if (confidence >= threshold.High) return "High";   // Auto-flag
if (confidence >= threshold.Low)  return "Medium"; // Needs investigation
return "Low";                                       // Normal`}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/backend/src/Infrastructure/Detection/MlNetAnomalyScorer.cs#L70-L80"
            target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "var(--link)" }}>
            📂 MlNetAnomalyScorer.cs on GitHub →
          </a>
          <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/backend/src/Application/Banding/Banding.cs#L8-L13"
            target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "var(--link)" }}>
            📂 BandingHelpers.cs on GitHub →
          </a>
        </div>
      </section>

      {/* ── AI Signals ── */}
      <section id="ai-signals" style={S.slideCompact}>
        <h3 style={S.h3}>When ML Can't Decide: The AI Investigator Steps In</h3>
        <p style={S.body}>
          The medium-confidence cases — the ones ML scored as ambiguous — are where
          you'd normally escalate to a human fraud examiner. Instead, we bring in
          AI investigators that receive the same signals an analyst would review:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <SignalCard icon="💰" title="Spending Patterns" desc="Amount relative to category averages and employee history" />
          <SignalCard icon="🏢" title="Vendor Analysis" desc="How common is this vendor? Does the employee use it exclusively?" />
          <SignalCard icon="📅" title="Timing Signals" desc="Weekend submissions, clusters before deadlines" />
          <SignalCard icon="👥" title="Peer Comparison" desc="How does this pattern compare to their department?" />
        </div>

        <h4 style={{ ...S.h3, marginTop: 24, fontSize: "1rem" }}>Structured Assessment Output</h4>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Field</th>
              <th style={S.th}>Example Output</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Verdict</td><td style={S.td}>Likely Fraud</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Confidence</td><td style={S.td}>0.82</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Rationale</td><td style={S.td}>"Employee submitted 12 expenses to VendorX in 30 days — 8× the department average. All amounts cluster at $48–$49, just below the $50 auto-approval threshold."</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Key Signals</td><td style={S.td}>Threshold gaming, vendor concentration, timing clustering</td></tr>
            <tr><td style={{ ...S.td, fontWeight: 600 }}>Action</td><td style={S.td}>Escalate to supervisor review with vendor documentation request</td></tr>
          </tbody>
        </table>
      </section>

      {/* ── Four Modes ── */}
      <section id="four-modes" style={S.slideCompact}>
        <h3 style={S.h3}>Four Ways to Get That Second Opinion</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
          <ModeCard
            icon="🎯" title="Single Agent"
            desc="One model, one verdict. Fast and direct."
          />
          <ModeCard
            icon="🤝" title="Consensus"
            desc="Three AI models investigate independently. An arbiter synthesizes findings. Where they agree → high confidence."
          />
          <ModeCard
            icon="⚔️" title="Adversarial Review (Debate)"
            desc="Agent A finds the fraud. Agent B finds the legitimate explanation. An arbiter weighs both arguments. Mirrors how fraud review teams already operate: build the case, stress-test it, senior reviewer decides."
          />
          <ModeCard
            icon="📈" title="Junior → Senior Escalation"
            desc="Cheaper model triages first. High-confidence cases resolve immediately. Low-confidence escalates to a premium model with the junior's preliminary notes attached. Mirrors real team triage."
          />
        </div>
      </section>

      {/* ── Debate Prompts ── */}
      <section id="debate-prompts" style={S.slideCompact}>
        <h3 style={S.h3}>The Debate Instructions Are Plain English</h3>
        <p style={S.body}>The opposing agents receive these instructions — not code, just natural language:</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div className="panel" style={{ borderLeft: "4px solid var(--band-high)" }}>
            <strong style={{ fontSize: "0.88rem", color: "var(--band-high)" }}>⚔️ Fraud Advocate</strong>
            <p style={{ ...S.mono, fontSize: "0.78rem", lineHeight: 1.6, margin: "8px 0 0" }}>
{`"You are acting as the FRAUD ADVOCATE.
Your job is to build the strongest
possible case that this expense IS
fraudulent. Err STRONGLY on the side
of flagging fraud. Your role is that
of a prosecutor."`}
            </p>
            <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/prompts/debate-fraud-leaning.md"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: "var(--link)" }}>
              📂 View full prompt on GitHub →
            </a>
          </div>
          <div className="panel" style={{ borderLeft: "4px solid var(--band-low)" }}>
            <strong style={{ fontSize: "0.88rem", color: "var(--band-low)" }}>🛡️ Defense Advocate</strong>
            <p style={{ ...S.mono, fontSize: "0.78rem", lineHeight: 1.6, margin: "8px 0 0" }}>
{`"You are acting as the DEFENSE ADVOCATE.
Your job is to build the strongest
possible case that this expense is
LEGITIMATE. Your role is that of a
defense attorney — give the employee
the benefit of the doubt."`}
            </p>
            <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/prompts/debate-non-fraud-leaning.md"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", color: "var(--link)" }}>
              📂 View full prompt on GitHub →
            </a>
          </div>
        </div>
        <p style={{ ...S.body, marginTop: 12 }}>
          These are plain English instructions — not code. A fraud examiner could write and
          refine these prompts based on their own review methodology. This directly mirrors
          how many fraud review teams already operate: one analyst builds the case, another
          stress-tests it, and a senior reviewer makes the final determination.
        </p>
      </section>

      {/* ── Agent Tools ── */}
      <section id="agent-tools" style={S.slideCompact}>
        <h3 style={S.h3}>The AI Has Real Tools</h3>
        <p style={S.body}>During an investigation, the AI agent can:</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          <div className="panel">
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>🔍</div>
            <strong style={{ fontSize: "0.9rem" }}>Query the Dataset</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
              Pull all expenses from the same vendor, fetch the employee's 90-day history,
              compare against peer averages
            </p>
          </div>
          <div className="panel">
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>🐍</div>
            <strong style={{ fontSize: "0.9rem" }}>Run Calculations</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
              Write and execute Python code — statistical tests, Benford's Law,
              distribution analysis, temporal patterns
            </p>
          </div>
          <div className="panel">
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>📡</div>
            <strong style={{ fontSize: "0.9rem" }}>Show Its Work</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
              Every tool call streams to the UI in real time so you can watch
              the reasoning process unfold
            </p>
          </div>
        </div>

        <div style={S.mono}>
{`Agent Reasoning Trace:
├── 🔍 query_expense_data: Fetched 47 expenses from vendor OffshoreLLC
├── 🔍 query_expense_data: Fetched employee 90-day history (142 records)
├── 🐍 code_interpreter: Computed Benford's Law digit distribution
├── 🐍 code_interpreter: Calculated z-scores for amount distribution
└── ✅ Verdict: Likely Fraud (confidence: 0.87)`}
        </div>
      </section>

      {/* ── Resilience ── */}
      <section id="resilience" style={S.slideCompact}>
        <div style={S.callout}>
          <h3 style={{ ...S.h3, marginBottom: 8 }}>If the AI Goes Down, Everything Else Keeps Working</h3>
          <p style={{ ...S.body, margin: 0 }}>
            The ML scoring, data generation, case lists, and visualizations are all deterministic
            and run without any AI service. The AI investigation layer is an enhancement,
            not a dependency. Your team never loses access to the underlying detection results.
          </p>
        </div>
      </section>

      {/* ════════════ LESSON 3: PRODUCTION-GRADE ════════════ */}
      <section id="lesson3" style={S.slide}>
        <div style={S.lessonBadge("#16a34a")}>LESSON 3</div>
        <h2 style={S.h2}>Prototype to Production Without Re-Architecting</h2>
        <p style={{ ...S.sub, fontSize: "1.2rem" }}>
          This isn't a laptop demo.
        </p>
      </section>

      {/* ── Architecture ── */}
      <section id="architecture" style={S.slideCompact}>
        <h3 style={S.h3}>Architecture Overview</h3>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexWrap: "wrap", gap: 12, marginTop: 16,
        }}>
          <ArchBox label="Static Web App" sub="React + Vite" note="No server to manage" />
          <div style={S.archArrow}>→ HTTPS →</div>
          <ArchBox label="Azure Functions" sub=".NET 10, serverless" note="Auto-scales to zero" />
        </div>
        <div style={{
          display: "flex", justifyContent: "center", gap: 48, marginTop: 16, flexWrap: "wrap",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
              Managed Identity ↓
            </div>
            <ArchBox label="Azure Storage" sub="Encrypted at rest" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
              Managed Identity ↓
            </div>
            <ArchBox label="AI Foundry" sub="Multiple models, your choice" />
          </div>
        </div>
      </section>

      {/* ── Zero Secrets ── */}
      <section id="zero-secrets" style={S.slideCompact}>
        <h3 style={S.h3}>Zero Stored Secrets</h3>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Traditional Approach</th>
              <th style={S.th}>This Application</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={S.td}>Database passwords in config files</td><td style={{ ...S.td, fontWeight: 600 }}>No passwords anywhere</td></tr>
            <tr><td style={S.td}>API keys for AI services</td><td style={{ ...S.td, fontWeight: 600 }}>Managed Identity — Azure handles auth</td></tr>
            <tr><td style={S.td}>Connection strings shared across team</td><td style={{ ...S.td, fontWeight: 600 }}>Role-Based Access Control — least privilege</td></tr>
            <tr><td style={S.td}>Manual secret rotation</td><td style={{ ...S.td, fontWeight: 600 }}>Nothing to rotate</td></tr>
          </tbody>
        </table>
        <p style={S.body}>
          Every connection — storage, AI models, deployment — uses Azure Managed Identity.
          There are no secrets to leak, rotate, or manage.
        </p>
        <div style={{ ...S.mono, fontSize: "0.78rem", lineHeight: 1.6 }}>
{`// From rbac.bicep — the actual infrastructure code
assignments = [
  { scope: 'storage', principalId: functionsPrincipalId, role: storageBlobDataContributor }
  { scope: 'storage', principalId: functionsPrincipalId, role: storageTableDataContributor }
  { scope: 'foundry', principalId: functionsPrincipalId, role: cognitiveServicesUser }
]`}
        </div>
        <p className="muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>
          The application's identity gets exactly the permissions it needs — nothing more.
          {" "}
          <a href="https://github.com/michaelsrichter/fraud-ai-demo/blob/main/infra/modules/rbac.bicep#L28-L35"
            target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "var(--link)" }}>
            📂 View rbac.bicep on GitHub →
          </a>
        </p>
      </section>

      {/* ── IaC ── */}
      <section id="iac" style={S.slideCompact}>
        <h3 style={S.h3}>Infrastructure as Code</h3>
        <p style={S.body}>
          The entire Azure environment is defined in code (Bicep templates):
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            "Storage (encrypted)",
            "Serverless compute",
            "AI model deployments",
            "Network security",
            "RBAC assignments",
            "Monitoring & logs",
          ].map((item) => (
            <div key={item} className="panel" style={{ padding: "10px 14px", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem" }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ ...S.callout, borderLeftColor: "var(--band-low)" }}>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>
            <strong>One command deploys everything:</strong>
          </p>
          <div style={{ ...S.mono, margin: "8px 0 0" }}>azd up</div>
          <p style={{ ...S.body, margin: "8px 0 0" }}>
            The proof-of-concept your team validates on Tuesday can deploy to a governed,
            auditable Azure environment by Thursday — without re-architecting anything.
          </p>
        </div>
      </section>

      {/* ── Model Flexibility ── */}
      <section id="models" style={S.slideCompact}>
        <h3 style={S.h3}>Model Flexibility</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 12 }}>
          <div className="panel">
            <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>AI Models — AI Foundry</h4>
            <p className="muted" style={{ fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 8px" }}>
              Build on AI Foundry and choose from many model providers.
              This demo uses OpenAI GPT models, but the architecture doesn't lock you in.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <ModelRow name="OpenAI (GPT-5.4, 5.3)" role="Used in this demo" />
              <ModelRow name="Anthropic (Claude)" role="Available" />
              <ModelRow name="Meta (Llama)" role="Available" />
              <ModelRow name="Microsoft (Phi)" role="Available" />
              <ModelRow name="xAI (Grok)" role="Available" />
            </div>
          </div>
          <div className="panel">
            <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>ML Models — ML.NET</h4>
            <p className="muted" style={{ fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 8px" }}>
              Three different anomaly detection approaches. Where they agree → strong signal.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <ModelRow name="Randomized PCA" role="Unsupervised — no labels needed" />
              <ModelRow name="SDCA Logistic" role="Supervised classification" />
              <ModelRow name="Fast Forest" role="Ensemble decision trees" />
            </div>
          </div>
        </div>
      </section>

      {/* ── The Shift ── */}
      <section id="shift" style={S.slideCompact}>
        <h3 style={S.h3}>The Shift</h3>
        <div style={{ ...S.callout, marginBottom: 16 }}>
          <p style={{ ...S.quote, margin: 0 }}>
            Fraud teams can now <strong>actively shape and evolve their own tooling</strong> much faster,
            instead of waiting on long engineering cycles.
          </p>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Before</th>
              <th style={S.th}>Now</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={S.td}>6-month software development cycle</td><td style={{ ...S.td, fontWeight: 600 }}>Days to working prototype</td></tr>
            <tr><td style={S.td}>Generic tools adapted to your workflow</td><td style={{ ...S.td, fontWeight: 600 }}>Purpose-built tools that match your process</td></tr>
            <tr><td style={S.td}>IT bottleneck for every enhancement</td><td style={{ ...S.td, fontWeight: 600 }}>Domain experts drive the specifications</td></tr>
            <tr><td style={S.td}>Quarterly release cadence</td><td style={{ ...S.td, fontWeight: 600 }}>Iterate in days</td></tr>
            <tr><td style={S.td}>Institutional knowledge in people's heads</td><td style={{ ...S.td, fontWeight: 600 }}>Expertise encoded in reusable workflows and prompts</td></tr>
          </tbody>
        </table>
      </section>

      {/* ── Beyond Expenses ── */}
      <section id="beyond" style={S.slideCompact}>
        <h3 style={S.h3}>Beyond Expense Fraud</h3>
        <p style={S.body}>
          The same patterns — ML scoring, AI investigation, adversarial reasoning,
          escalation pipelines — apply to any fraud domain:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <DomainCard icon="🏥" domain="Insurance Claims" desc="Claim history patterns, provider network analysis, coordinated scheme detection" />
          <DomainCard icon="💳" domain="Payment Fraud" desc="Transaction scoring, velocity analysis, geographic anomaly detection" />
          <DomainCard icon="⚕️" domain="Healthcare Fraud" desc="Billing pattern analysis, upcoding detection, phantom patient identification" />
          <DomainCard icon="📋" domain="Tax Fraud" desc="Return anomaly scoring, entity relationship mapping, deduction pattern analysis" />
          <DomainCard icon="📊" domain="Financial Statements" desc="Ratio analysis, journal entry testing, related-party transaction flagging" />
        </div>
        <p style={{ fontSize: "1rem", fontWeight: 600, marginTop: 16 }}>
          The patterns are the same. The data changes. Your domain expertise is what makes it work.
        </p>
      </section>

      {/* ════════════ TAKEAWAY ════════════ */}
      <section id="takeaway" style={S.slide}>
        <h2 style={S.h2}>The Takeaway</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          <TakeawayCard
            num={1}
            color="#2563eb"
            text="Domain expertise is the highest-value input. Describe the patterns, the red flags, the investigation workflows — and working software follows in days. Capture institutional knowledge so it scales across your team and survives turnover."
          />
          <TakeawayCard
            num={2}
            color="#d97706"
            text="AI assists — humans decide. Four investigation strategies give you structured, evidence-cited second opinions at machine speed. The investigator reviews, validates, and makes the final call. If the AI goes down, the ML scoring and detection keep working."
          />
          <TakeawayCard
            num={3}
            color="#16a34a"
            text="Production-grade from day one. Zero secrets, managed identity, infrastructure-as-code, audit logging, and governance controls. What you validate today deploys to a governed environment tomorrow with a single command."
          />
        </div>
      </section>

      {/* ════════════ TRY IT ════════════ */}
      <section id="try-it" style={{ ...S.slide, textAlign: "center" }}>
        <h2 style={S.h2}>Try It Yourself</h2>

        <div className="panel" style={{ maxWidth: 500, margin: "0 auto 24px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
            gap: 12, textAlign: "center",
          }}>
            <NumBox value="4" label="Days" />
            <NumBox value={String(stats.specCount)} label="Specs" />
            <NumBox value={String(stats.totalCommits)} label="Commits" />
            <NumBox value={stats.linesOfCode.toLocaleString()} label="Lines of Code" />
            <NumBox value={String(stats.totalTests)} label="Tests" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/labs/expenses">
            <button style={{ padding: "14px 28px", fontSize: "1rem" }}>⚡ Live Demo</button>
          </Link>
          <a href="https://github.com/michaelsrichter/fraud-ai-demo" target="_blank" rel="noopener noreferrer">
            <button className="secondary" style={{ padding: "14px 28px", fontSize: "1rem" }}>📦 Source Code</button>
          </a>
          <Link to="/story">
            <button className="secondary" style={{ padding: "14px 28px", fontSize: "1rem" }}>📖 Build Story</button>
          </Link>
        </div>

        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: "1rem" }}>
            <strong>Mike Richter</strong> · Principal Partner Solution Architect, Microsoft
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
            <a href="https://www.linkedin.com/in/mikerichter/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.85rem", color: "var(--link)" }}>
              LinkedIn
            </a>
          </div>
        </div>

        <p className="muted" style={{ marginTop: 24, fontSize: "0.75rem" }}>
          All data is synthetic — no real transactions or individuals are represented.
          This is a demonstration of capabilities, not a production fraud detection system.
        </p>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function LessonCard({ num, color, title, body }: { num: number; color: string; title: string; body: string }) {
  return (
    <div className="panel" style={{ borderLeft: `4px solid ${color}`, display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{
        minWidth: 36, height: 36, borderRadius: "50%", background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", flexShrink: 0,
      }}>
        {num}
      </div>
      <div>
        <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem", lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  );
}

function ConvBubble({ who, text }: { who: "me" | "ai"; text: string }) {
  const isMe = who === "me";
  return (
    <div style={{
      alignSelf: isMe ? "flex-end" : "flex-start",
      maxWidth: "80%",
      padding: "10px 16px",
      borderRadius: 12,
      background: isMe ? "var(--btn-primary)" : "var(--bg-surface)",
      color: isMe ? "#fff" : "var(--text)",
      fontSize: "0.88rem",
      lineHeight: 1.6,
      borderBottomRightRadius: isMe ? 2 : 12,
      borderBottomLeftRadius: isMe ? 12 : 2,
    }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 600, opacity: 0.7, display: "block", marginBottom: 2 }}>
        {isMe ? "Me" : "AI Agent"}
      </span>
      {text}
    </div>
  );
}

function ProcessCard({ step, title, items }: { step: string; title: string; items: string[] }) {
  return (
    <div className="panel" style={{ textAlign: "center" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: "var(--btn-primary)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, margin: "0 auto 8px",
      }}>
        {step}
      </div>
      <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
        {items.map((it) => (
          <li key={it} className="muted" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function TimelineRow({ day, date, title, color, items }: {
  day: string; date: string; title: string; color: string; items: string[];
}) {
  return (
    <div className="panel" style={{ borderLeft: `4px solid ${color}`, display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ minWidth: 70 }}>
        <span style={{
          fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
          background: "var(--bg-hover)", color: "var(--text-muted)", display: "inline-block",
        }}>
          {day}
        </span>
        <div className="muted" style={{ fontSize: "0.7rem", marginTop: 2 }}>{date}</div>
      </div>
      <div>
        <strong style={{ fontSize: "0.92rem" }}>{title}</strong>
        <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
          {items.map((it) => (
            <li key={it} className="muted" style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>{it}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SignalCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="panel" style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>{icon}</div>
      <strong style={{ fontSize: "0.88rem" }}>{title}</strong>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.78rem", lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function ModeCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="panel">
      <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{icon}</div>
      <strong style={{ fontSize: "0.92rem" }}>{title}</strong>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function ArchBox({ label, sub, note }: { label: string; sub: string; note?: string }) {
  return (
    <div style={{
      display: "inline-block", padding: "14px 20px", borderRadius: 8,
      border: "2px solid var(--border)", background: "var(--bg-surface)",
      textAlign: "center", minWidth: 160,
    }}>
      <strong style={{ fontSize: "0.9rem", display: "block" }}>{label}</strong>
      <span className="muted" style={{ fontSize: "0.75rem" }}>{sub}</span>
      {note && <div className="muted" style={{ fontSize: "0.7rem", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function DomainCard({ icon, domain, desc }: { icon: string; domain: string; desc: string }) {
  return (
    <div className="panel">
      <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{icon}</div>
      <strong style={{ fontSize: "0.88rem" }}>{domain}</strong>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.78rem", lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function TakeawayCard({ num, color, text }: { num: number; color: string; text: string }) {
  return (
    <div className="panel" style={{ borderLeft: `4px solid ${color}`, display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{
        minWidth: 36, height: 36, borderRadius: "50%", background: color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", flexShrink: 0,
      }}>
        {num}
      </div>
      <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

function ModelRow({ name, role }: { name: string; role: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "4px 8px",
      borderRadius: 4, background: "var(--bg)",
    }}>
      <span style={{ fontWeight: 500, fontSize: "0.82rem" }}>{name}</span>
      <span className="muted" style={{ fontSize: "0.72rem" }}>{role}</span>
    </div>
  );
}

function NumBox({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function PipelineStep({ color, icon, title, desc, sub, width }: {
  color: string; icon: string; title: string; desc: string; sub?: string; width?: number;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "12px 14px", borderRadius: 8, border: `2px solid ${color}`,
      background: "var(--bg-surface)", textAlign: "center", minWidth: width ?? 130,
    }}>
      <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{icon}</div>
      <strong style={{ fontSize: "0.82rem" }}>{title}</strong>
      <span className="muted" style={{ fontSize: "0.72rem" }}>{desc}</span>
      {sub && <span style={{ fontSize: "0.68rem", color, fontWeight: 600, marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

function PipelineArrow({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 6px", color: "var(--text-muted)",
    }}>
      <span style={{ fontSize: "1rem" }}>→</span>
      <span style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

function PipelineBranch({ color, label, desc, highlight }: {
  color: string; label: string; desc: string; highlight?: boolean;
}) {
  return (
    <div style={{
      padding: "6px 12px", borderRadius: 6,
      border: highlight ? `2px solid ${color}` : `1px solid var(--border)`,
      background: highlight ? "var(--bg-surface)" : "transparent",
      fontSize: "0.78rem", display: "flex", gap: 8, alignItems: "center",
    }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span className="muted" style={{ fontSize: "0.7rem" }}>{desc}</span>
    </div>
  );
}
