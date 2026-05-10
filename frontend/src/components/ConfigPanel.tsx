import { useMemo, useState, useEffect } from "react";
import type { SimulationConfiguration, ScorerModelDefinition } from "../api/runsClient";
import { fetchScorers } from "../api/runsClient";

interface Props {
  initial?: Partial<SimulationConfiguration>;
  onGenerate: (config: SimulationConfiguration) => void;
  isGenerating?: boolean;
}

const PRESETS: Record<string, SimulationConfiguration> = {
  Low: {
    recordCount: 5_000,
    intensity: 0.05,
    patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
  },
  "High — Vendor": {
    recordCount: 5_000,
    intensity: 0.25,
    patternWeights: { thresholdGaming: 0.15, unusualFrequency: 0.15, vendorAnomaly: 0.7 },
  },
  "High — Frequency": {
    recordCount: 5_000,
    intensity: 0.25,
    patternWeights: { thresholdGaming: 0.15, unusualFrequency: 0.7, vendorAnomaly: 0.15 },
  },
  "High — Threshold": {
    recordCount: 5_000,
    intensity: 0.25,
    patternWeights: { thresholdGaming: 0.7, unusualFrequency: 0.15, vendorAnomaly: 0.15 },
  },
};

const DEFAULT: SimulationConfiguration = {
  recordCount: 5_000,
  intensity: 0.1,
  patternWeights: { thresholdGaming: 0.34, unusualFrequency: 0.33, vendorAnomaly: 0.33 },
};

const presetDescriptions: Record<string, string> = {
  Low: "5% fraud, evenly distributed — a realistic baseline with subtle signals",
  "High — Vendor": "25% fraud, mostly suspicious vendors — easy to spot shell-company patterns",
  "High — Frequency": "25% fraud, mostly unusual timing — weekend and late-hour submissions dominate",
  "High — Threshold": "25% fraud, mostly threshold gaming — expenses cluster just under $1,000",
};

function normalizeWeights(w: { thresholdGaming: number; unusualFrequency: number; vendorAnomaly: number }) {
  const sum = w.thresholdGaming + w.unusualFrequency + w.vendorAnomaly;
  if (sum <= 0) return { thresholdGaming: 1 / 3, unusualFrequency: 1 / 3, vendorAnomaly: 1 / 3 };
  return {
    thresholdGaming: w.thresholdGaming / sum,
    unusualFrequency: w.unusualFrequency / sum,
    vendorAnomaly: w.vendorAnomaly / sum,
  };
}

export function ConfigPanel({ initial, onGenerate, isGenerating }: Props) {
  const [config, setConfig] = useState<SimulationConfiguration>({ ...DEFAULT, ...(initial ?? {}) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scorerModels, setScorerModels] = useState<ScorerModelDefinition[]>([]);
  const [selectedScorers, setSelectedScorers] = useState<Record<string, Record<string, number>>>({ "randomized-pca": {} });

  useEffect(() => {
    fetchScorers().then((data) => setScorerModels(data.models)).catch(() => {});
  }, []);

  const validation = useMemo(() => {
    const e: Record<string, string> = {};
    if (!Number.isFinite(config.recordCount) || config.recordCount < 1 || config.recordCount > 50_000) {
      e.recordCount = "1 – 50,000";
    }
    if (!Number.isFinite(config.intensity) || config.intensity < 0 || config.intensity > 1) {
      e.intensity = "0.0 – 1.0";
    }
    const sumW = config.patternWeights.thresholdGaming + config.patternWeights.unusualFrequency + config.patternWeights.vendorAnomaly;
    if (sumW <= 0) e.patternWeights = "weights cannot all be 0";
    if (config.thresholds && !(config.thresholds.low > 0 && config.thresholds.high < 1 && config.thresholds.low < config.thresholds.high)) {
      e.thresholds = "0 < low < high < 1";
    }
    return e;
  }, [config]);

  const isValid = Object.keys(validation).length === 0;

  function applyPreset(name: string) {
    setConfig({ ...config, ...PRESETS[name] });
  }

  function submit() {
    if (!isValid) {
      setErrors(validation);
      return;
    }
    setErrors({});
    const scorers = Object.entries(selectedScorers).map(([modelId, parameters]) => ({
      modelId,
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    }));
    onGenerate({
      ...config,
      patternWeights: normalizeWeights(config.patternWeights),
      scorers: scorers.length > 0 ? scorers : undefined,
    });
  }

  return (
    <div>
      {/* Generate button + presets — above the fold */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <button
          onClick={submit}
          disabled={!isValid || isGenerating}
          style={{ width: "100%", padding: "12px 16px", fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}
        >
          {isGenerating ? "⏳ Generating..." : "⚡ Generate New Run"}
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "0.9rem" }}>Quick Presets</h3>
            <p className="help" style={{ margin: "2px 0 0" }}>Pick a preset to auto-fill settings, or customize each section below.</p>
          </div>
          <div className="preset-row" style={{ margin: 0 }}>
            {Object.keys(PRESETS).map((p) => (
              <button key={p} type="button" onClick={() => applyPreset(p)} title={presetDescriptions[p]}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Three-column config grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>

        {/* Column 1: Run Settings */}
        <div className="panel">
          <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>Run Settings</h3>
          <div className="field">
            <label>Record count</label>
            <span className="help">Total synthetic expense records to generate (1–50,000).</span>
            <input
              type="number"
              min={1}
              max={50_000}
              value={config.recordCount}
              onChange={(e) => setConfig({ ...config, recordCount: Number(e.target.value) })}
            />
            {errors.recordCount && <span className="error">{errors.recordCount}</span>}
          </div>
          <div className="field">
            <label>Fraud intensity: {config.intensity.toFixed(2)}</label>
            <span className="help">Fraction of records with injected fraud (0 = none, 1 = all).</span>
            <input
              type="range" min={0} max={1} step={0.01}
              value={config.intensity}
              onChange={(e) => setConfig({ ...config, intensity: Number(e.target.value) })}
            />
            {errors.intensity && <span className="error">{errors.intensity}</span>}
          </div>
        </div>

        {/* Column 2: Fraud Patterns */}
        <div className="panel">
          <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>Fraud Pattern Weights</h3>
          <p className="help" style={{ marginBottom: 8 }}>Mix of three fraud patterns. Auto-normalized to sum to 1.0.</p>
          <div className="field">
            <label>Threshold gaming: {config.patternWeights.thresholdGaming.toFixed(2)}</label>
            <span className="help">Expenses just under the $1,000 approval threshold.</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={config.patternWeights.thresholdGaming}
              onChange={(e) => setConfig({ ...config, patternWeights: { ...config.patternWeights, thresholdGaming: Number(e.target.value) } })}
            />
          </div>
          <div className="field">
            <label>Unusual frequency: {config.patternWeights.unusualFrequency.toFixed(2)}</label>
            <span className="help">Submissions at odd times — weekends, late hours.</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={config.patternWeights.unusualFrequency}
              onChange={(e) => setConfig({ ...config, patternWeights: { ...config.patternWeights, unusualFrequency: Number(e.target.value) } })}
            />
          </div>
          <div className="field">
            <label>Vendor anomaly: {config.patternWeights.vendorAnomaly.toFixed(2)}</label>
            <span className="help">Payments to suspicious shell-company vendors.</span>
            <input
              type="range" min={0} max={1} step={0.05}
              value={config.patternWeights.vendorAnomaly}
              onChange={(e) => setConfig({ ...config, patternWeights: { ...config.patternWeights, vendorAnomaly: Number(e.target.value) } })}
            />
            {errors.patternWeights && <span className="error">{errors.patternWeights}</span>}
          </div>
        </div>

        {/* Column 3: Scoring Models */}
        <div className="panel">
          <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>Scoring Models</h3>
          <p className="help" style={{ marginBottom: 8 }}>Select one or more ML models. Each scores independently.</p>
          {scorerModels.map((model) => {
            const isSelected = model.modelId in selectedScorers;
            return (
              <div key={model.modelId} style={{ marginBottom: 10, padding: "8px 10px", background: isSelected ? "var(--bg)" : "transparent", borderRadius: 6, border: isSelected ? "1px solid var(--border)" : "1px solid transparent" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const next = { ...selectedScorers };
                      if (e.target.checked) next[model.modelId] = {};
                      else delete next[model.modelId];
                      if (Object.keys(next).length > 0) setSelectedScorers(next);
                    }}
                  />
                  <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{model.displayName}</span>
                </label>
                <span className="help" style={{ marginLeft: 22, display: "block", fontSize: "0.72rem" }}>{model.description}</span>
                {isSelected && model.parameters.length > 0 && (
                  <div style={{ marginLeft: 22, marginTop: 6 }}>
                    {model.parameters.map((p) => (
                      <div key={p.name} className="field" style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: "0.75rem" }}>{p.displayName}: {(selectedScorers[model.modelId]?.[p.name] ?? p.defaultValue).toFixed(p.dataType === "Int" ? 0 : 2)}</label>
                        <span className="help" style={{ fontSize: "0.68rem", display: "block", marginBottom: 2 }}>{p.description}</span>
                        <input
                          type="range"
                          min={p.min ?? 0}
                          max={p.max ?? 100}
                          step={p.dataType === "Int" ? 1 : 0.01}
                          value={selectedScorers[model.modelId]?.[p.name] ?? p.defaultValue}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSelectedScorers({
                              ...selectedScorers,
                              [model.modelId]: { ...selectedScorers[model.modelId], [p.name]: val },
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Generate button (repeated) + prior runs link */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={submit}
          disabled={!isValid || isGenerating}
          style={{ width: "100%", padding: "12px 16px", fontSize: "1rem", fontWeight: 600 }}
        >
          {isGenerating ? "⏳ Generating..." : "⚡ Generate New Run"}
        </button>
        <a href="#prior-runs" style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>↓ View prior runs</a>
      </div>
    </div>
  );
}
