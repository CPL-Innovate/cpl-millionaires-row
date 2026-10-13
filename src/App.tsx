import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { World } from './scene/World';
import { CameraRig, type Mode } from './scene/CameraRig';
import { BeatPins, PhotoGhost, PlateLabels } from './scene/Overlays';
import { BEATS, BUILDINGS, STATIONS, type Station } from './data/site';
import { PALETTES, type PaletteId } from './palettes';
import { U, applyPalette } from './gl/uniforms';
import { settings, useSettings } from './settings/store';
import { GeneratorPanel } from './ui/GeneratorPanel';
import './App.css';

const LEGEND = [
  { k: 'photographed', label: 'Photographed', hint: 'Ink, cross-hatched — a CPL photograph drove this surface' },
  { k: 'inferred', label: 'Inferred', hint: 'Graphite — footprint, typology, neighbouring evidence' },
  { k: 'invented', label: 'Invented', hint: 'Construction line — present because the space needs a wall' },
];

// Deep links: ?station=everett&palette=sepia&evidence=0.6 (shareable views of a station)
const params = new URLSearchParams(location.search);
const initialPalette = (params.get('palette') as PaletteId) in PALETTES ? (params.get('palette') as PaletteId) : 'graphite';
const initialEvidence = Math.min(1, Math.max(0, Number(params.get('evidence') ?? 0) || 0));
const initialStation = STATIONS.some((s) => s.id === params.get('station')) ? params.get('station')! : null;
settings.loadProject();

export default function App() {
  const [mode, setMode] = useState<Mode>('map');
  const [palette, setPalette] = useState<PaletteId>(initialPalette);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [stationId, setStationId] = useState('corner');
  const [arrived, setArrived] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);
  const [beat, setBeat] = useState<string | null>(null);
  const [gen, setGen] = useState(params.has('gen')); // ?gen opens the Generator drawer
  const cfg = useSettings();
  const over = cfg.colors[palette];
  const paper = over?.paper ?? PALETTES[palette].paper;

  useEffect(() => {
    applyPalette(palette, over);
    const ui = PALETTES[palette].ui;
    const r = document.documentElement.style;
    r.setProperty('--bg', ui.bg);
    r.setProperty('--fg', ui.fg);
    r.setProperty('--muted', ui.muted);
    r.setProperty('--rule', ui.rule);
    r.setProperty('--accent', ui.accent);
    r.setProperty('--paper', paper);
  }, [palette, over, paper]);

  useEffect(() => {
    gsap.to(U.uEvidence, { value: evidence, duration: 0.6, ease: 'power2.out' });
  }, [evidence]);

  useEffect(() => {
    if (!initialStation) return;
    const t = setTimeout(() => goStation(initialStation), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const station = STATIONS.find((s) => s.id === stationId)!;
  const atStation = arrived === stationId && mode === 'street';
  const activeBeat = BEATS.find((b) => b.id === beat) ?? null;
  const building = useMemo(() => BUILDINGS.find((b) => stationId.startsWith(b.id.split('-')[0])), [stationId]);

  const goStation = (id: string) => {
    setArrived(null);
    setPhoto(0);
    setStationId(id);
    setMode('street');
  };

  const onArrive = (s: Station) => {
    setArrived(s.id);
    if (s.photo) {
      const p = { v: 0 };
      gsap.to(p, { v: 1, duration: 1.8, delay: 0.3, ease: 'power1.inOut', onUpdate: () => setPhoto(p.v) });
    }
  };

  return (
    <div className={`app ${mode}`}>
      <Canvas flat dpr={[1, 2]} camera={{ fov: 50, near: 0.3, far: 2000, position: [-40, 440, 120] }} gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}>
        <color attach="background" args={[paper]} />
        <Suspense fallback={null}>
          <World />
          {mode === 'map' && <PlateLabels onPick={goStation} />}
          {mode === 'street' && <BeatPins onPick={(id) => setBeat(beat === id ? null : id)} active={beat} />}
        </Suspense>
        <Suspense fallback={null}>
          {atStation && station.photo && <PhotoGhost station={station} opacity={photo} />}
        </Suspense>
        <CameraRig mode={mode} stationId={stationId} onArrive={onArrive} />
      </Canvas>

      <div className="grain" />

      <header className="title">
        <h1>Millionaires’ Row</h1>
        <p>Euclid Avenue at Case · c. October 1888</p>
        <p className="sub">A pencil study from the Cleveland Public Library record</p>
      </header>

      <aside className="panel">
        <section>
          <h3>Drawing</h3>
          <div className="seg">
            {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
              <button key={id} className={palette === id ? 'on' : ''} onClick={() => setPalette(id)}>
                {PALETTES[id].label}
              </button>
            ))}
          </div>
          <p className="note">{PALETTES[palette].note}</p>
          <button className={`gen-toggle ${gen ? 'on' : ''}`} onClick={() => setGen(!gen)}>Tune the generator</button>
        </section>

        <section>
          <h3>Evidence</h3>
          <input type="range" min={0} max={1} step={0.01} value={evidence} onChange={(e) => setEvidence(+e.target.value)} />
          <div className="ends"><span>Full drawing</span><span>Evidence only</span></div>
          <ul className="legend">
            {LEGEND.map((l) => (
              <li key={l.k} title={l.hint}>
                <i className={`sw ${l.k}`} />
                <span>{l.label}</span>
              </li>
            ))}
          </ul>
          <p className="note">Colour is inferred everywhere: every photograph is black and white.</p>
        </section>

        {atStation && station.photo && (
          <section>
            <h3>Photograph</h3>
            <input type="range" min={0} max={1} step={0.01} value={photo} onChange={(e) => setPhoto(+e.target.value)} />
            <div className="ends"><span>Drawing</span><span>CPL photo</span></div>
            <p className="note">
              {station.photo.label} — <code>{station.photo.id}</code>. Camera position approximate (fSpy pending).
            </p>
          </section>
        )}
      </aside>

      <nav className="stations">
        <button className={`mode ${mode === 'map' ? 'on' : ''}`} onClick={() => setMode('map')}>1881 plate</button>
        {STATIONS.map((s) => (
          <button key={s.id} className={mode === 'street' && stationId === s.id ? 'on' : ''} onClick={() => goStation(s.id)}>
            {s.title}
          </button>
        ))}
      </nav>

      {gen && <GeneratorPanel palette={palette} onClose={() => setGen(false)} />}

      {!gen && mode === 'street' && arrived && !activeBeat && building && (
        <article className="card">
          <h2>{building.name}</h2>
          <p className="meta">{building.address} · {building.owner1888} · {building.status}</p>
          <p>{station.caption}</p>
          <table>
            <tbody>
              {building.ledger.map((l) => (
                <tr key={l.surface}>
                  <td><i className={`sw ${l.state}`} /></td>
                  <td>{l.surface}</td>
                  <td className="basis">{l.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {!gen && activeBeat && (
        <article className="card">
          <button className="x" onClick={() => setBeat(null)}>×</button>
          <p className="meta">{activeBeat.year}</p>
          <h2>{activeBeat.title}</h2>
          <p>{activeBeat.text}</p>
          <p className="src">{activeBeat.source}</p>
        </article>
      )}

      <footer className="foot">
        {mode === 'street' ? 'Drag to look · WASD / arrows to walk · shift to hurry · numbered pins are story beats' : 'Drag to pan · scroll to zoom · pick a house or a station to descend'}
        <span>
          Demo. Positions read off 1881 Hopkins Plates 3 + 5 (±5 m). Massing inferred; Everett mesh = Tripo spike A1. Images: Cleveland Public Library Digital Gallery.
        </span>
      </footer>
    </div>
  );
}
