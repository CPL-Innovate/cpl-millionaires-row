import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { World } from './scene/World';
import { CameraRig, type MapStyle, type Mode } from './scene/CameraRig';
import { AtlasPicker } from './scene/AtlasPicker';
import { AtlasLabels } from './scene/AtlasLabels';
import { BeatPins, PhotoGhost, PlateLabels } from './scene/Overlays';
import { BEATS, BUILDINGS, LOTS, STATIONS, type Station } from './data/site';
import { PALETTES, type PaletteId } from './palettes';
import { U, applyPalette } from './gl/uniforms';
import { settings, useEra, useQuality, useSettings } from './settings/store';
import { ERAS, QUALITIES } from './settings/schema';
import { PerfProbe } from './ui/Perf';
import { sound } from './audio/engine';
import { AudioDirector } from './audio/AudioDirector';
import { GeneratorPanel } from './ui/GeneratorPanel';
import { ThreadStage } from './threads/ThreadStage';
import { ThreadMenu, ThreadPlayer } from './threads/ThreadPlayer';
import { player } from './threads/player';
import { useThread } from './threads/store';
import './App.css';

const LEGEND = [
  { k: 'photographed', label: 'Photographed', hint: 'Ink, cross-hatched — a CPL photograph drove this surface' },
  { k: 'inferred', label: 'Inferred', hint: 'Graphite — footprint, typology, neighbouring evidence' },
  { k: 'invented', label: 'Invented', hint: 'Construction line — present because the space needs a wall' },
];

// The modelled houses' three looks; the massing blocks have no texture and stay pencil
const LOOKS = [
  { id: 'pencil', label: 'Pencil', lines: 1, note: 'Drawn from the evidence: the hatching shows what each face rests on.' },
  { id: 'wash', label: 'Watercolour', lines: 0.45, note: 'The model’s texture as a wash: its detail in the palette’s colours, pencil kept in the shadows.' },
  { id: 'texture', label: 'Texture', lines: 0, note: 'The texture as Tripo generated it. Its colour and detail are AI-inferred, even on photographed faces.' },
] as const;
type LookId = (typeof LOOKS)[number]['id'];

// Deep links: ?station=everett&palette=sepia&evidence=0.6&look=wash&era=1888&quality=light&fps (shareable views of a station)
const params = new URLSearchParams(location.search);
const initialPalette = (params.get('palette') as PaletteId) in PALETTES ? (params.get('palette') as PaletteId) : 'graphite';
const initialEvidence = Math.min(1, Math.max(0, Number(params.get('evidence') ?? 0) || 0));
const initialLook = Math.max(0, LOOKS.findIndex((l) => l.id === params.get('look')));
U.uLookFrom.value = U.uLookTo.value = initialLook;
U.uLookLines.value = LOOKS[initialLook].lines;
const initialMapStyle: MapStyle = params.get('map') === 'plate' ? 'plate' : 'atlas'; // ?map=plate opens on the flat plate
const initialStation = STATIONS.some((s) => s.id === params.get('station')) ? params.get('station')! : null;
// ?thread=silent-bells&stop=3&at=4&hold opens a thread (at a stop, some seconds in, paused) — for links and screenshots
const initialThread = params.get('thread');
settings.loadProject();

const SOUND = 'mr-sound-v1';
const readSound = () => { try { return localStorage.getItem(SOUND) === 'on'; } catch { return false; } };
const VOLUME = 'mr-volume-v1';
const readVolume = (): { sound: number; music: number } => {
  try { return { sound: 0.8, music: 0.8, ...JSON.parse(localStorage.getItem(VOLUME) ?? '{}') }; } catch { return { sound: 0.8, music: 0.8 }; }
};

export default function App() {
  const [mode, setMode] = useState<Mode>('map');
  const [mapStyle, setMapStyle] = useState<MapStyle>(initialMapStyle);
  const [hoverLot, setHoverLot] = useState(-1);
  const [selLot, setSelLot] = useState(-1);
  const [palette, setPalette] = useState<PaletteId>(initialPalette);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [look, setLook] = useState<LookId>(LOOKS[initialLook].id);
  const [stationId, setStationId] = useState('corner');
  const [arrived, setArrived] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);
  const [beat, setBeat] = useState<string | null>(null);
  const [gen, setGen] = useState(params.has('gen')); // ?gen opens the Generator drawer
  const cfg = useSettings();
  const era = useEra();
  const quality = useQuality();
  const [fps, setFps] = useState(params.has('fps'));
  const [soundOn, setSoundOn] = useState(readSound);
  const [volume, setVolume] = useState(readVolume);
  const [menu, setMenu] = useState(false);
  const tv = useThread();
  const threading = !!tv.id;
  const prevMode = useRef<Mode>('map');
  const lastErase = useRef(0);
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
    r.setProperty('--mark', PALETTES[palette].mark);
    r.setProperty('--paper', paper);
  }, [palette, over, paper]);

  useEffect(() => {
    gsap.to(U.uEvidence, { value: evidence, duration: 0.6, ease: 'power2.out' });
  }, [evidence]);

  // the new look blotches in over the old one, like the street drawing itself
  useEffect(() => {
    const i = LOOKS.findIndex((l) => l.id === look);
    if (U.uLookTo.value === i) return;
    sound.ui(look === 'wash' ? 'wash' : look === 'texture' ? 'photo' : 'sketch');
    U.uLookFrom.value = U.uLookTo.value;
    U.uLookTo.value = i;
    gsap.fromTo(U.uLookT, { value: 0 }, { value: 1, duration: 1.4, ease: 'power1.inOut' });
    gsap.to(U.uLookLines, { value: LOOKS[i].lines, duration: 1.4, ease: 'power1.inOut' });
  }, [look]);

  // sound: turning it on needs a user gesture, so a remembered "on" waits for the first one
  const toggleSound = (on: boolean) => {
    setSoundOn(on);
    try { localStorage.setItem(SOUND, on ? 'on' : 'off'); } catch { /* blocked storage: session only */ }
    if (on) sound.enable();
    else sound.disable();
  };
  useEffect(() => {
    if (!soundOn || sound.enabled) return;
    const start = () => sound.enable();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [soundOn]);
  // every button answers with a soft card tap
  useEffect(() => {
    const tap = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('button')) sound.ui('tap'); };
    document.addEventListener('click', tap);
    return () => document.removeEventListener('click', tap);
  }, []);
  useEffect(() => sound.setEra(era), [era]);
  useEffect(() => {
    sound.setVolume('sound', volume.sound);
    sound.setVolume('music', volume.music);
    try { localStorage.setItem(VOLUME, JSON.stringify(volume)); } catch { /* session only */ }
  }, [volume]);
  useEffect(() => {
    sound.setMode(mode);
    if (mode !== prevMode.current) {
      sound.ui('paper');
      if (mode === 'street') {
        sound.ui('sketch', 0.6); // the street drawing itself
        sound.ui('gather', 1.4); // and the dots settling
      }
    }
    prevMode.current = mode;
  }, [mode]);
  useEffect(() => { if (beat) sound.beat(beat); }, [beat]);

  useEffect(() => {
    if (!initialStation) return;
    const t = setTimeout(() => goStation(initialStation), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Threads: picking one clears the street's own cards; leaving hands the camera back
  const startThread = (id: string, o: { stop?: number; hold?: boolean; at?: number } = {}) => {
    setMenu(false);
    setBeat(null);
    setArrived(null);
    setGen(false);
    player.start(id, o);
  };
  useEffect(() => {
    player.onExit = (scene) => {
      U.uEvidence.value = evidence;
      if (scene === 'street') setMode('street');
      else { setMapStyle('atlas'); setMode('map'); }
    };
  }, [evidence]);
  useEffect(() => {
    if (!initialThread) return;
    const t = setTimeout(() => startThread(initialThread, { stop: Math.max(0, Number(params.get('stop') ?? 1) - 1), hold: params.has('hold'), at: Number(params.get('at') ?? 0) }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const station = STATIONS.find((s) => s.id === stationId)!;
  const atStation = arrived === stationId && mode === 'street';
  const activeBeat = BEATS.find((b) => b.id === beat) ?? null;
  // the silent bells: at St. Paul's (or with its story open) the street falls quiet
  useEffect(() => {
    sound.silentBells(mode === 'street' && (arrived === 'st-pauls' || beat === 'bells'));
  }, [mode, arrived, beat, soundOn]);
  const building = useMemo(() => BUILDINGS.find((b) => stationId.startsWith(b.id.split('-')[0])), [stationId]);

  // Atlas lots: hover hatches the lot in (a quick fade), a pick selects and flies to it, a second
  // pick on a selected lot with a street view walks down into it
  useEffect(() => {
    if (hoverLot >= 0) {
      U.uLotHover.value = hoverLot;
      gsap.fromTo(U.uLotHoverT, { value: 0 }, { value: 1, duration: 0.35, ease: 'power1.out' });
    } else gsap.to(U.uLotHoverT, { value: 0, duration: 0.25 });
  }, [hoverLot]);
  useEffect(() => { U.uLotSel.value = selLot; }, [selLot]);
  useEffect(() => { if (mode !== 'map' || mapStyle !== 'atlas') { setSelLot(-1); setHoverLot(-1); } }, [mode, mapStyle]);
  const atlasOn = mode === 'map' && mapStyle === 'atlas';
  const onHoverLot = useCallback((i: number) => setHoverLot(i), []);
  const pickLot = (i: number) => {
    const st = LOTS[i].station;
    if (i === selLot && st) goStation(st);
    else { setSelLot(i); sound.ui('paper'); }
  };
  const pickRef = useRef(pickLot);
  pickRef.current = pickLot;
  const onPickLot = useCallback((i: number) => pickRef.current(i), []);
  const shownLot = hoverLot >= 0 ? hoverLot : selLot;

  const goStation = (id: string) => {
    setArrived(null);
    setPhoto(0);
    setStationId(id);
    setMode('street');
  };

  const onArrive = (s: Station) => {
    setArrived(s.id);
    if (s.photo && !(import.meta.env.DEV && params.has('nophoto'))) { // dev: ?nophoto keeps the drawing for screenshots
      sound.ui('photo', 0.3);
      const p = { v: 0 };
      gsap.to(p, { v: 1, duration: 1.8, delay: 0.3, ease: 'power1.inOut', onUpdate: () => setPhoto(p.v) });
    }
  };

  return (
    <div className={`app ${mode}${atlasOn ? ' atlas' : ''}${threading ? ' threading' : ''}`}>
      <Canvas flat dpr={QUALITIES.find((q) => q.id === quality)!.dpr} camera={{ fov: 50, near: 0.3, far: 2000, position: [-40, 440, 120] }} gl={{ antialias: true, preserveDrawingBuffer: import.meta.env.DEV }}>
        <color attach="background" args={[paper]} />
        <Suspense fallback={null}>
          <World />
          <PlateLabels onPick={goStation} show={mode === 'map' && mapStyle === 'plate'} />
          <AtlasLabels show={threading ? tv.scene === 'atlas' : atlasOn} />
          <BeatPins onPick={(id) => setBeat(beat === id ? null : id)} active={beat} show={mode === 'street' && !threading} />
        </Suspense>
        <Suspense fallback={null}>
          {atStation && station.photo && <PhotoGhost station={station} opacity={photo} />}
        </Suspense>
        <CameraRig mode={mode} mapStyle={mapStyle} focusLot={selLot} stationId={stationId} onArrive={onArrive} thread={threading} />
        <AtlasPicker active={atlasOn && !threading} onHover={onHoverLot} onPick={onPickLot} />
        <ThreadStage />
        {fps && <PerfProbe />}
        <AudioDirector />
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
          <div className="seg era">
            {ERAS.map((e) => (
              <button key={e.id} className={era === e.id ? 'on' : ''} onClick={() => settings.setEra(e.id)}>
                {e.label}
              </button>
            ))}
          </div>
          <p className="note">{ERAS.find((e) => e.id === era)!.note}</p>
          <button className={`gen-toggle ${gen ? 'on' : ''}`} onClick={() => setGen(!gen)}>Tune the generator</button>
        </section>

        <section>
          <h3>Modelled houses</h3>
          <div className="seg">
            {LOOKS.map((l) => (
              <button key={l.id} className={look === l.id ? 'on' : ''} onClick={() => setLook(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="note">{LOOKS.find((l) => l.id === look)!.note} Applies to the four modelled houses; the massing blocks stay pencil.</p>
        </section>

        <section>
          <h3>Evidence</h3>
          <input type="range" min={0} max={1} step={0.01} value={evidence} onChange={(e) => {
            setEvidence(+e.target.value);
            if (performance.now() - lastErase.current > 450) { lastErase.current = performance.now(); sound.ui('erase'); }
          }} />
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

        <section>
          <h3>Sound</h3>
          <div className="seg">
            <button className={!soundOn ? 'on' : ''} onClick={() => toggleSound(false)}>Off</button>
            <button className={soundOn ? 'on' : ''} onClick={() => toggleSound(true)}>On</button>
          </div>
          <div className={`volumes ${soundOn ? '' : 'off'}`}>
            {(['sound', 'music'] as const).map((k) => (
              <label key={k} className="vol">
                <span>{k === 'sound' ? 'Sound' : 'Music'}</span>
                <input
                  type="range" min={0} max={1} step={0.01} value={volume[k]}
                  aria-label={`${k === 'sound' ? 'Sound' : 'Music'} volume`}
                  onChange={(e) => setVolume((v) => ({ ...v, [k]: +e.target.value }))}
                />
                <span className="pct">{Math.round(volume[k] * 100)}%</span>
              </label>
            ))}
          </div>
          <p className="note">Generated from period descriptions, so it is an impression, like the paint. Walk to hear the ground you’re on.</p>
        </section>

        <section>
          <h3>Performance</h3>
          <div className="seg">
            {QUALITIES.map((q) => (
              <button key={q.id} className={quality === q.id ? 'on' : ''} onClick={() => settings.setQuality(q.id)}>
                {q.label}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={fps} onChange={(e) => setFps(e.target.checked)} /> Show frame rate
          </label>
        </section>

        {atStation && station.photo && (
          <section>
            <h3>Photograph</h3>
            <input type="range" min={0} max={1} step={0.01} value={photo} onChange={(e) => setPhoto(+e.target.value)} />
            <div className="ends"><span>Drawing</span><span>CPL photo</span></div>
            <p className="note">
              {station.photo.label} — <code>{station.photo.id}</code>. Camera registered to the photograph by eye and silhouette (fSpy pending).
            </p>
          </section>
        )}
      </aside>

      {fps && <div id="perf-hud" className="perf-hud" />}

      <nav className="stations">
        <button className={`mode threads-btn ${menu ? 'on' : ''}`} onClick={() => setMenu(true)}>Threads</button>
        <button className={`mode ${mode === 'map' && mapStyle === 'atlas' ? 'on' : ''}`} onClick={() => { setMapStyle('atlas'); setMode('map'); }}>Atlas</button>
        <button className={`mode ${mode === 'map' && mapStyle === 'plate' ? 'on' : ''}`} onClick={() => { setMapStyle('plate'); setMode('map'); }}>1881 plate</button>
        {STATIONS.map((s) => (
          <button key={s.id} className={mode === 'street' && stationId === s.id ? 'on' : ''} onClick={() => goStation(s.id)}>
            {s.title}
          </button>
        ))}
      </nav>

      <ThreadPlayer soundOn={soundOn} onSound={() => toggleSound(true)} />
      {menu && !threading && <ThreadMenu onClose={() => setMenu(false)} onPick={(id) => startThread(id)} />}

      {gen && (
        <GeneratorPanel
          palette={palette}
          onClose={() => setGen(false)}
          house={building?.model ? building.id : null}
          watercolour={look === 'wash'}
          onShowWatercolour={() => setLook('wash')}
        />
      )}

      {!gen && mode === 'street' && arrived && !activeBeat && building && (
        <article className="card">
          <h2>{building.name}</h2>
          <p className="meta">{building.address} · {building.owner1888} · {building.status}</p>
          <p>{station.caption}</p>
          {building.model && <p className="src">{building.model.note}</p>}
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

      {atlasOn && (
        <>
          <div className={`atlas-title ${shownLot >= 0 ? 'on' : ''}`} aria-live="polite">
            {shownLot >= 0 && (
              <>
                <small>{LOTS[shownLot].owner}</small>
                <h2>{LOTS[shownLot].name}</h2>
                {shownLot === selLot && LOTS[selLot].station && (
                  <button onClick={() => goStation(LOTS[selLot].station!)}>Walk the street</button>
                )}
              </>
            )}
          </div>
          <ol className="lots" onMouseLeave={() => setHoverLot(-1)}>
            {LOTS.map((l, i) => (
              <li key={l.id}>
                <button className={i === selLot ? 'on' : i === hoverLot ? 'hover' : ''} onMouseEnter={() => setHoverLot(i)} onFocus={() => setHoverLot(i)} onClick={() => pickLot(i)}>
                  <sup>{i + 1}</sup>{l.name}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      <footer className="foot">
        {mode === 'street' ? 'Drag to look · WASD / arrows to walk · shift to hurry · numbered pins are story beats' : (mapStyle === 'atlas' ? 'Drag to fly · right-drag to turn · scroll to zoom · pick a lot, pick it again to walk down' : 'Drag to pan · scroll to zoom · pick a house or a station to descend')}
        <span>
          Demo. Positions read off 1881 Hopkins Plates 3 + 5 (±5 m). Everett, Stager–Beckwith, Rockefeller and Wade Sr. are image-to-3D spikes, not reconstructions; the rest are massing blocks. Images: Cleveland Public Library Digital Gallery.
        </span>
      </footer>
    </div>
  );
}
