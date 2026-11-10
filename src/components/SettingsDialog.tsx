// Settings: appearance, compilation engines, file handling.

import { useState } from "react";
import { useAppStore } from "../store";
import { Icon } from "./Icons";
import { Modal } from "./Modal";
import type { EngineChoice } from "../types";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="set-row toggle-row" title={hint}>
      <span>
        <span className="set-label">{label}</span>
        {hint && <span className="set-hint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch${checked ? " on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="knob" />
      </button>
    </label>
  );
}

export function SettingsDialog() {
  const setDialog = useAppStore((s) => s.setDialog);
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const engines = useAppStore((s) => s.engines);
  const refreshEngines = useAppStore((s) => s.refreshEngines);
  const [detecting, setDetecting] = useState(false);

  const found = (n: string) => engines.find((e) => e.name === n);

  const engineOptions: { value: EngineChoice; label: string; sub?: string; disabled?: boolean }[] = [
    { value: "auto", label: "Auto-detect (recommended)", sub: "xelatex → pdflatex → lualatex → tectonic" },
    { value: "xelatex", label: "xelatex", sub: found("xelatex")?.path, disabled: !found("xelatex") },
    { value: "pdflatex", label: "pdflatex", sub: found("pdflatex")?.path, disabled: !found("pdflatex") },
    { value: "lualatex", label: "lualatex", sub: found("lualatex")?.path, disabled: !found("lualatex") },
    { value: "tectonic", label: "tectonic", sub: found("tectonic")?.path, disabled: !found("tectonic") },
    { value: "wasm", label: "Built-in WASM engine (pdftex)", sub: "no install; needs internet on first compile" },
    { value: "custom", label: "Custom engine binary…" },
  ];

  return (
    <Modal title="Settings" onClose={() => setDialog(null)} width={640}>
      <h3 className="gallery-section">Appearance</h3>
      <div className="set-row">
        <span className="set-label">Theme</span>
        <div className="seg">
          <button
            className={settings.theme === "dark" ? "active" : ""}
            onClick={() => update({ theme: "dark" })}
          >
            Dark
          </button>
          <button
            className={settings.theme === "light" ? "active" : ""}
            onClick={() => update({ theme: "light" })}
          >
            Light
          </button>
        </div>
      </div>
      <div className="set-row">
        <span className="set-label">Editor font size</span>
        <div className="range-row">
          <input
            type="range"
            min={11}
            max={20}
            step={1}
            value={settings.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
          />
          <span className="range-value">{settings.fontSize}px</span>
        </div>
      </div>
      <Toggle
        label="Word wrap"
        hint="Wrap long lines instead of horizontal scrolling"
        checked={settings.wordWrap}
        onChange={(v) => update({ wordWrap: v })}
      />
      <Toggle
        label="Line numbers"
        checked={settings.lineNumbers}
        onChange={(v) => update({ lineNumbers: v })}
      />

      <h3 className="gallery-section">Compilation</h3>
      <div className="set-col">
        <span className="set-label">Engine</span>
        <select
          className="engine-select"
          value={settings.engineChoice}
          onChange={(e) => update({ engineChoice: e.target.value as EngineChoice })}
        >
          {engineOptions.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
              {o.disabled ? " (not found)" : ""}
            </option>
          ))}
        </select>
        {settings.engineChoice === "custom" && (
          <div className="custom-engine">
            <input
              type="text"
              placeholder="Absolute path to the engine binary, e.g. C:\tectonic\tectonic.exe"
              value={settings.customEnginePath}
              onChange={(e) => update({ customEnginePath: e.target.value })}
            />
            <div className="set-hint">
              Point this at any TeX-distribution-style binary (pdflatex,
              xelatex, lualatex) or a tectonic executable.
            </div>
          </div>
        )}
      </div>
      <div className="engine-status">
        <div className="engine-status-head">
          <span className="set-label">Detected engines</span>
          <button
            className="btn btn-sm"
            disabled={detecting}
            onClick={async () => {
              setDetecting(true);
              await refreshEngines();
              setDetecting(false);
            }}
          >
            <Icon name="reload" size={12} /> {detecting ? "Detecting…" : "Re-detect"}
          </button>
        </div>
        {engines.length === 0 ? (
          <div className="engine-none">
            No system engine found — the built-in WASM engine will be used as a
            fallback. Install TeX Live / MiKTeX / tectonic for full package
            support.
          </div>
        ) : (
          engines.map((e) => (
            <div key={e.name} className="engine-row">
              <Icon name="check" size={13} />
              <strong>{e.name}</strong>
              <span className="engine-path" title={e.path}>
                {e.path}
              </span>
            </div>
          ))
        )}
      </div>
      <Toggle
        label="Recompile automatically while typing"
        hint="Debounced — recompiles ~2 seconds after you stop typing"
        checked={settings.autoRecompile}
        onChange={(v) => update({ autoRecompile: v })}
      />
      <Toggle
        label="Compile on save"
        checked={settings.compileOnSave}
        onChange={(v) => update({ compileOnSave: v })}
      />

      <h3 className="gallery-section">Files</h3>
      <Toggle
        label="Reopen the last document on launch"
        checked={settings.reopenLastFile}
        onChange={(v) => update({ reopenLastFile: v })}
      />
    </Modal>
  );
}
