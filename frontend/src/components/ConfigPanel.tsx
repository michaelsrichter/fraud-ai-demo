import { useMemo, useState } from "react";
import type { SimulationConfiguration } from "../api/runsClient";

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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    onGenerate({
      ...config,
      patternWeights: normalizeWeights(config.patternWeights),
    });
  }

  return (
    <div>
      {/* Primary CTA */}
      <button
        onClick={submit}
        disabled={!isValid || isGenerating}
        style={{ width: "100%", padding: "10px 16px", fontSize: "0.95rem", fontWeight: 600, marginBottom: 10 }}
      >
        {isGenerating ? "⏳ Generating..." : "⚡ Generate New Run"}
      </button>
      <p className="help" style={{ marginBottom: 10 }}>
        Creates synthetic expenses, injects fraud, and scores with ML. Pick a preset or customize below.
      </p>

      {/* Presets */}
      <div className="preset-row">
        {Object.keys(PRESETS).map((p) => (
          <button key={p} type="button" onClick={() => applyPreset(p)} title={presetDescriptions[p]}>
            {p}
          </button>
        ))}
      </div>

      {/* Toggle advanced config */}
      <button
        className="secondary"
        style={{ width: "100%", fontSize: "0.75rem", padding: "4px 8px", marginBottom: 8 }}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? "▾ Hide configuration" : "▸ Show configuration"}
      </button>

      {showAdvanced && (
        <>
      <div className="field">
        <label>Record count</label>
        <span className="help">Total number of synthetic expense records to generate (1–50,000).</span>
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
        <label>Intensity: {config.intensity.toFixed(2)}</label>
        <span className="help">
          Fraction of records that will have injected fraud (0 = none, 1 = all).
          Higher values make the fraud more obvious in the chart.
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={config.intensity}
          onChange={(e) => setConfig({ ...config, intensity: Number(e.target.value) })}
        />
        {errors.intensity && <span className="error">{errors.intensity}</span>}
      </div>

      <h2 style={{ fontSize: "0.9rem", marginTop: 16 }}>Fraud pattern weights</h2>
      <p className="help">
        Control the mix of three fraud patterns. Weights are auto-normalized to sum to 1.0 before generation.
      </p>

      <div className="field">
        <label>Threshold gaming: {config.patternWeights.thresholdGaming.toFixed(2)}</label>
        <span className="help">Expenses just under the $1,000 approval threshold — a common evasion tactic.</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.patternWeights.thresholdGaming}
          onChange={(e) =>
            setConfig({ ...config, patternWeights: { ...config.patternWeights, thresholdGaming: Number(e.target.value) } })
          }
        />
      </div>
      <div className="field">
        <label>Unusual frequency: {config.patternWeights.unusualFrequency.toFixed(2)}</label>
        <span className="help">Submissions at odd times — weekends, late hours — when oversight is lower.</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.patternWeights.unusualFrequency}
          onChange={(e) =>
            setConfig({ ...config, patternWeights: { ...config.patternWeights, unusualFrequency: Number(e.target.value) } })
          }
        />
      </div>
      <div className="field">
        <label>Vendor anomaly: {config.patternWeights.vendorAnomaly.toFixed(2)}</label>
        <span className="help">Payments to suspicious shell-company vendors not seen in normal activity.</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.patternWeights.vendorAnomaly}
          onChange={(e) =>
            setConfig({ ...config, patternWeights: { ...config.patternWeights, vendorAnomaly: Number(e.target.value) } })
          }
        />
        {errors.patternWeights && <span className="error">{errors.patternWeights}</span>}
      </div>
        </>
      )}
    </div>
  );
}
