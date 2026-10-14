import { useRef, useState } from 'react';
import { PALETTES, type PaletteId } from '../palettes';
import { COLOR_RAMPS, ERAS, GROUPS, WASH_PARAMS, washDefaultsFor, type ParamDef } from '../settings/schema';
import { BUILDINGS } from '../data/site';
import { settings, useEra, useSettings, type Settings } from '../settings/store';

const fmt = (p: ParamDef, v: number) => (p.step >= 1 ? Math.round(v).toLocaleString() : v.toFixed(p.step < 0.01 ? 3 : 2));

function Row({ p, value, onChange = (v) => settings.set(p.key, v) }: { p: ParamDef; value: number; onChange?: (v: number) => void }) {
  return (
    <label className="gen-row" title={p.hint}>
      <span className="gen-label">
        {p.label}
        {!p.live && <i className="gen-rebuild" title="Regenerates geometry">↻</i>}
      </span>
      <span className="gen-value">{fmt(p, value)}</span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

// the modelled houses that can be painted
const HOUSES = BUILDINGS.filter((b) => b.model?.looks);

function WashGroup({ initial, watercolour, onShowWatercolour }: { initial: string | null; watercolour: boolean; onShowWatercolour: () => void }) {
  const s = useSettings();
  const [id, setId] = useState(initial && HOUSES.some((h) => h.id === initial) ? initial : HOUSES[0].id);
  const house = HOUSES.find((h) => h.id === id)!;
  const defaults = washDefaultsFor(house.model!.neutralWalls);
  const values = { ...defaults, ...s.houses?.[id] };
  return (
    <details open>
      <summary>Watercolour · per house</summary>
      <div className="gen-house">
        <select value={id} onChange={(e) => setId(e.target.value)} aria-label="House">
          {HOUSES.map((h) => (
            <option key={h.id} value={h.id}>{h.name}{s.houses?.[h.id] ? ' •' : ''}</option>
          ))}
        </select>
        {!watercolour && <button onClick={onShowWatercolour}>Show watercolour</button>}
      </div>
      {WASH_PARAMS.map((p) => (
        <Row key={p.key} p={p} value={values[p.key]} onChange={(v) => settings.setHouse(id, p.key, v)} />
      ))}
      <div className="gen-actions">
        <button onClick={() => settings.copyHouse(id, HOUSES.map((h) => h.id), values)}>Copy to all houses</button>
        <button disabled={!s.houses?.[id]} onClick={() => settings.resetHouse(id)}>Reset house</button>
      </div>
      <p className="note">Saved per house (• marks a tuned one) with the rest of the settings.{house.model!.neutralWalls ? ' This house starts grey: its wall material is unknown.' : ''}</p>
    </details>
  );
}

export function GeneratorPanel({ palette, onClose, house, watercolour, onShowWatercolour }: {
  palette: PaletteId;
  onClose: () => void;
  house: string | null; // the house at the current station, picked first in the watercolour group
  watercolour: boolean;
  onShowWatercolour: () => void;
}) {
  const s = useSettings();
  const era = useEra();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preset, setPreset] = useState('');
  const [msg, setMsg] = useState('');
  const presets = settings.presets();
  const over = s.colors[palette] ?? {};
  const pal = PALETTES[palette];

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2200);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(settings.raw(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'millionaires-row-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (f: File) => {
    try {
      settings.replace(JSON.parse(await f.text()) as Settings);
      flash('Imported');
    } catch {
      flash('Could not read that file');
    }
  };

  const saveProject = async () => {
    try {
      const res = await fetch('/__settings', { method: 'POST', body: JSON.stringify(settings.raw(), null, 2) });
      flash(res.ok ? 'Saved to public/settings.json' : 'Save failed');
    } catch {
      flash('Save failed');
    }
  };

  return (
    <aside className="gen">
      <header className="gen-head">
        <h3>Generator · {ERAS.find((e) => e.id === era)!.label}</h3>
        <span className="gen-status">{settings.isRebuilding() ? 'Regrowing…' : msg}</span>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="gen-body">
        <WashGroup key={house ?? "none"} initial={house} watercolour={watercolour} onShowWatercolour={onShowWatercolour} />
        {GROUPS.map((g, i) => (
          <details key={g.id} open={i < 2}>
            <summary>{g.label}</summary>
            {g.params.map((p) => (
              <Row key={p.key} p={p} value={s.v[p.key]} />
            ))}
          </details>
        ))}

        <details>
          <summary>Colours · {pal.label}</summary>
          <label className="gen-swatch">
            <input type="color" value={over.paper ?? pal.paper} onChange={(e) => settings.setPaper(palette, e.target.value)} />
            <span>Paper</span>
          </label>
          {COLOR_RAMPS.map((ramp) => {
            const base = pal[ramp.key] as readonly string[];
            const cur = over[ramp.key] ?? base;
            return (
              <div key={ramp.key} className="gen-ramp">
                <span className="gen-label">{ramp.label}</span>
                <div className="gen-chips">
                  {base.map((c, i) => (
                    <input
                      key={i}
                      type="color"
                      title={ramp.names[i]}
                      value={cur[i] ?? c}
                      onChange={(e) => settings.setColor(palette, ramp.key, i, e.target.value, [...base])}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </details>
      </div>

      <footer className="gen-foot">
        <div className="gen-presets">
          <select value={preset} onChange={(e) => {
            const name = e.target.value;
            setPreset(name);
            if (presets[name]) settings.replace(presets[name]);
          }}>
            <option value="">Presets…</option>
            {Object.keys(presets).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button onClick={() => {
            const name = prompt('Name this preset', preset || 'My look');
            if (name) { settings.savePreset(name); setPreset(name); flash(`Saved “${name}”`); }
          }}>Save as…</button>
          <button disabled={!preset} onClick={() => { settings.deletePreset(preset); setPreset(''); }}>Delete</button>
        </div>
        <div className="gen-actions">
          <button onClick={exportJson}>Export JSON</button>
          <button onClick={() => fileRef.current?.click()}>Import</button>
          <button onClick={() => { settings.resetToProject(); flash('Reset to project defaults'); }}>Reset</button>
          {import.meta.env.DEV && <button className="gen-primary" onClick={saveProject}>Save as project default</button>}
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        <p className="note">Changes autosave in this browser. Watercolour settings belong to each house; the rest apply to the {ERAS.find((e) => e.id === era)!.label} look only. ↻ marks settings that regrow the scene.</p>
      </footer>
    </aside>
  );
}
