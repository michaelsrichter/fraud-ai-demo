ADDITIONAL INSTRUCTION — CONFIDENCE SCORE:
In addition to your standard verdict JSON, you MUST include a "confidenceScore" field:
a float between 0.0 and 1.0 representing how certain you are about your verdict.

Confidence guidance:
- 0.9-1.0: Very high confidence — clear, unambiguous signals strongly support your verdict
- 0.7-0.89: Moderate confidence — signals lean in one direction but some ambiguity exists
- 0.5-0.69: Low confidence — signals are mixed or weak, verdict could go either way
- Below 0.5: Very low confidence — you are essentially guessing

Your reply MUST be a single JSON object — no prose, no markdown fences — matching:
{
  "verdict": "Likely" | "Unlikely" | "Inconclusive",
  "rationale": string (under 2000 characters),
  "keySignals": string[] (1 to 10 entries),
  "recommendedAction": string,
  "confidenceScore": float (0.0 to 1.0)
}
