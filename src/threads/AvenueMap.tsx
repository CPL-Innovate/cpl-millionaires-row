import { useEffect, useState } from 'react';
import { AVENUE, AVENUE_END, CROSS, avenueSnapshot, type AvenueMapState } from './avenue';
import { PLATE } from '../data/site';

// The whole Avenue as an ink drawing on paper, over the 3D scene (threads only). The camera rule:
// overhead shots happen on the map. Its state is avenueMap, tweened by the thread's timeline.

const W = 1400, H = 860, MID = 430;
// Euclid's line: straight, with the gentle lift east of E. 71st toward University Circle (schematic)
const lineY = (no: number) => MID - Math.max(0, (no - 7000) / 3500) ** 2 * 60;

export function AvenueMap() {
  const [m, setM] = useState<AvenueMapState>(avenueSnapshot);
  useEffect(() => {
    let raf = 0, last = '';
    const tick = () => {
      const snap = avenueSnapshot(), k = JSON.stringify(snap);
      if (k !== last) { last = k; setM(snap); }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  if (m.show < 0.005) return null;
  const sx = (no: number) => ((no - m.x0) / (m.x1 - m.x0)) * W;
  const span = m.x1 - m.x0;
  const zoomed = span < 3000;
  const flare = m.flare.split(',').filter(Boolean);
  // Euclid as a polyline in screen space
  const pts: string[] = [];
  for (let no = -200; no <= AVENUE_END + 200; no += 50) pts.push(`${sx(no).toFixed(1)},${lineY(no).toFixed(1)}`);
  const len = 4200; // generous dash length for the trace
  // the plate: Euclid & Case, 2000 px at 0.41 m/px ≈ 820 m ≈ 820 street numbers, centred on Case
  const pw = (PLATE.widthPx * PLATE.metresPerPx) / span * W;
  const ph = pw * (PLATE.heightPx / PLATE.widthPx);
  return (
    <div className="avenue" style={{ opacity: m.show }} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="wash" x1="0" x2="1">
            <stop offset="0" stopColor="#c98a52" stopOpacity="0.42" />
            <stop offset="0.85" stopColor="#c98a52" stopOpacity="0.28" />
            <stop offset="1" stopColor="#c98a52" stopOpacity="0" />
          </linearGradient>
          <filter id="rough"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="4" /><feDisplacementMap in="SourceGraphic" scale="1.6" /></filter>
        </defs>
        {m.plate > 0.01 && (
          <image href={PLATE.url} x={sx(3960) - pw / 2} y={MID - ph / 2} width={pw} height={ph} opacity={m.plate * (zoomed ? 0.32 : 0.55)} preserveAspectRatio="none" />
        )}
        {m.wash > 0 && <rect x={sx(-300)} y={MID - 90} width={Math.max(0, sx(m.wash) - sx(-300))} height={180} fill="url(#wash)" />}
        {m.span > 0.01 && (
          <g opacity={m.span}>
            <rect x={sx(3200)} y={MID - 46} width={sx(3800) - sx(3200)} height={92} fill="none" stroke="var(--accent)" strokeDasharray="4 3" />
            <text x={(sx(3200) + sx(3800)) / 2} y={MID + 66} textAnchor="middle" className="av-note">E. 32nd – E. 38th: the last four families, 1928</text>
          </g>
        )}
        <polyline points={pts.join(' ')} fill="none" stroke="var(--fg)" strokeWidth={zoomed ? 2.2 : 1.6} strokeDasharray={len} strokeDashoffset={len * (1 - m.line)} pathLength={len} filter="url(#rough)" />
        {m.line > 0.3 && CROSS.map((c) => (
          <g key={c.no} opacity={Math.min(1, (m.line - 0.3) * 3)}>
            <line x1={sx(c.no)} x2={sx(c.no)} y1={lineY(c.no) - 26} y2={lineY(c.no) + 26} stroke="var(--fg)" strokeWidth={0.7} opacity={0.55} />
            <text x={sx(c.no)} y={lineY(c.no) + 44} textAnchor="middle" className="av-cross">{c.label}</text>
          </g>
        ))}
        {m.route > 0.001 && <Route sx={sx} t={m.route} />}
        {m.course > 0.001 && <Course sx={sx} t={m.course} />}
        {AVENUE.map((h) => {
          if (h.no > m.dots || h.built > m.year) return null;
          const x = sx(h.no);
          if (x < -40 || x > W + 40) return null;
          const y = lineY(h.no) + (h.north ? -14 : 14);
          const gone = h.gone === null ? m.wash > h.no + 150 : h.gone > 0 && m.year >= h.gone;
          const lit = h.survivor && m.survivors > 0.01;
          const fl = flare.includes(h.id);
          const r = zoomed ? 6 : 3.6;
          return (
            <g key={h.id}>
              {lit && <circle cx={x} cy={y} r={r + 9 * m.survivors} fill="var(--accent)" opacity={0.18 * m.survivors} />}
              {fl && <circle cx={x} cy={y} r={r + 10} fill="none" stroke="var(--accent)" strokeWidth={1.4} />}
              {m.focus === h.id && <circle cx={x} cy={y} r={r + 7} fill="none" stroke="var(--fg)" strokeWidth={1} strokeDasharray="2 2" />}
              <circle cx={x} cy={y} r={r} fill={gone && !lit ? 'none' : lit ? 'var(--accent)' : 'var(--fg)'} stroke="var(--fg)" strokeWidth={gone ? 0.8 : 0} opacity={gone && !lit ? 0.45 : 1} />
              {((zoomed && h.big && m.names > 0.01) || m.focus === h.id || fl || (lit && m.survivors > 0.5)) && (
                <text x={x} y={y + (h.north ? -12 : 20)} textAnchor="middle" className={`av-name ${gone && !lit ? 'gone' : ''}`} opacity={zoomed && h.big ? Math.max(m.names, m.focus === h.id || fl || lit ? 1 : 0) : 1}>
                  {h.name}{m.focus === h.id && h.gone ? `, ${h.gone}` : ''}{fl && h.gone ? `, ${h.gone}` : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {m.showYear > 0.01 && <div className="av-year" style={{ opacity: m.showYear }}>{Math.round(m.year)}</div>}
      <p className="av-key">Schematic, not to scale: each dot is a house placed by its street number, odd numbers north of the line.</p>
    </div>
  );
}

// The Line: east-bound streetcars swerved south off Euclid at E. 9th, up Prospect, and back at E. 40th
function Route({ sx, t }: { sx: (n: number) => number; t: number }) {
  const P = MID + 70; // Prospect, drawn as a parallel a block south (schematic)
  const d = `M ${sx(100)} ${MID} L ${sx(900)} ${MID} L ${sx(950)} ${P} L ${sx(3900)} ${P} L ${sx(3960)} ${MID} L ${sx(5500)} ${MID}`;
  return (
    <g>
      <rect x={sx(2200)} y={MID - 8} width={sx(3960) - sx(2200)} height={16} fill="var(--accent)" opacity={0.25 * Math.min(1, t * 2)} />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} strokeLinejoin="round" />
      <line x1={sx(950)} x2={sx(3900)} y1={P} y2={P} stroke="var(--fg)" strokeWidth={0.8} opacity={0.5} />
      <text x={sx(2400)} y={P + 20} textAnchor="middle" className="av-cross">Prospect</text>
      <text x={(sx(2200) + sx(3960)) / 2} y={MID - 18} textAnchor="middle" className="av-note" opacity={Math.min(1, t * 2)}>no streetcars, E. 22nd – E. 40th</text>
    </g>
  );
}

// The Starting Line: west from E. 40th to E. 9th
function Course({ sx, t }: { sx: (n: number) => number; t: number }) {
  const a = sx(3960), b = sx(900);
  return (
    <g>
      <line x1={a} x2={a + (b - a) * t} y1={MID - 4} y2={MID - 4} stroke="var(--accent)" strokeWidth={3} />
      <text x={a} y={MID - 24} textAnchor="middle" className="av-note">start</text>
      {t > 0.98 && <text x={b} y={MID - 24} textAnchor="middle" className="av-note">E. 9th</text>}
    </g>
  );
}
