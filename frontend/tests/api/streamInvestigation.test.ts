import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamInvestigation } from "../../src/api/runsClient";

function makeSseChunk(events: Array<{ event: string; data: string }>): Uint8Array {
  const text = events.map((e) => `event: ${e.event}\ndata: ${e.data}\n\n`).join("");
  return new TextEncoder().encode(text);
}

function mockFetchStream(chunks: Uint8Array[]) {
  let index = 0;
  const reader = {
    read: vi.fn(async () => {
      if (index < chunks.length) {
        return { done: false, value: chunks[index++] };
      }
      return { done: true, value: undefined };
    }),
  };
  const response = {
    ok: true,
    status: 200,
    statusText: "OK",
    body: { getReader: () => reader },
  } as unknown as Response;
  return vi.fn().mockResolvedValue(response);
}

describe("streamInvestigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fires onToolCall for each tool_call event", async () => {
    const toolCall1 = { toolName: "query_expense_data", parameters: "{}", responseSummary: "10 matches", responseData: null, reasoning: null, latencyMs: 100, succeeded: true };
    const toolCall2 = { toolName: "code_interpreter_0", parameters: "{}", responseSummary: "Output: 5 lines", responseData: null, reasoning: null, latencyMs: 200, succeeded: true };
    const complete = { recordId: "abc", runId: "def", requestedUtc: "2026-01-01T00:00:00Z", status: "Succeeded", verdict: "Likely", rationale: "test", keySignals: ["s1"], recommendedAction: "escalate", toolTrace: [toolCall1, toolCall2] };

    const chunk = makeSseChunk([
      { event: "tool_call", data: JSON.stringify(toolCall1) },
      { event: "tool_call", data: JSON.stringify(toolCall2) },
      { event: "complete", data: JSON.stringify(complete) },
    ]);

    globalThis.fetch = mockFetchStream([chunk]);

    const onToolCall = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await streamInvestigation("run1", "case1", {}, onToolCall, onComplete, onError);

    expect(onToolCall).toHaveBeenCalledTimes(2);
    expect(onToolCall.mock.calls[0][0].toolName).toBe("query_expense_data");
    expect(onToolCall.mock.calls[1][0].toolName).toBe("code_interpreter_0");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].verdict).toBe("Likely");
    expect(onError).not.toHaveBeenCalled();
  });

  it("fires onError for error event", async () => {
    const errorResult = { recordId: "abc", runId: "def", requestedUtc: "2026-01-01T00:00:00Z", status: "Unavailable", unavailableReason: "timeout" };
    const chunk = makeSseChunk([{ event: "error", data: JSON.stringify(errorResult) }]);

    globalThis.fetch = mockFetchStream([chunk]);

    const onToolCall = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await streamInvestigation("run1", "case1", {}, onToolCall, onComplete, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("timeout");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("fires onError when stream closes without terminal event", async () => {
    const toolCall = { toolName: "query_expense_data", parameters: "{}", responseSummary: "5 matches", responseData: null, reasoning: null, latencyMs: 50, succeeded: true };
    const chunk = makeSseChunk([{ event: "tool_call", data: JSON.stringify(toolCall) }]);

    globalThis.fetch = mockFetchStream([chunk]);

    const onToolCall = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await streamInvestigation("run1", "case1", {}, onToolCall, onComplete, onError);

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("terminal event");
  });

  it("fires onError on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const onToolCall = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await streamInvestigation("run1", "case1", {}, onToolCall, onComplete, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("500");
  });

  it("handles split chunks across SSE frame boundaries", async () => {
    const toolCall = { toolName: "query_expense_data", parameters: "{}", responseSummary: "3 matches", responseData: null, reasoning: null, latencyMs: 30, succeeded: true };
    const complete = { recordId: "abc", runId: "def", requestedUtc: "2026-01-01T00:00:00Z", status: "Succeeded", verdict: "Unlikely", rationale: "clean", keySignals: ["ok"], recommendedAction: "close" };

    const fullText = `event: tool_call\ndata: ${JSON.stringify(toolCall)}\n\nevent: complete\ndata: ${JSON.stringify(complete)}\n\n`;
    // Split in the middle
    const mid = Math.floor(fullText.length / 2);
    const chunk1 = new TextEncoder().encode(fullText.slice(0, mid));
    const chunk2 = new TextEncoder().encode(fullText.slice(mid));

    globalThis.fetch = mockFetchStream([chunk1, chunk2]);

    const onToolCall = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await streamInvestigation("run1", "case1", {}, onToolCall, onComplete, onError);

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
