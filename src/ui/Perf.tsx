import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Frame-rate probe. Lives inside the Canvas, samples every frame, and twice a second writes a
// summary into the HUD element (no React re-render per frame) and onto window.__perf, so headless
// runs can read it too.
export interface PerfSample {
  fps: number;
  ms: number; // mean frame time
  p95: number; // 95th-percentile frame time: the hitches you feel
  calls: number;
  points: number;
  triangles: number;
  dpr: number;
}

export function PerfProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  if (import.meta.env.DEV) (window as unknown as { __scene: typeof scene }).__scene = scene;
  const buf = useRef<number[]>([]);
  const last = useRef(0);
  const since = useRef(0);
  useFrame(() => {
    const now = performance.now();
    if (!last.current) last.current = since.current = now;
    buf.current.push(now - last.current);
    last.current = now;
    if (now - since.current < 500) return;
    since.current = now;
    const t = buf.current.splice(0).sort((a, b) => a - b);
    const ms = t.reduce((a, b) => a + b, 0) / t.length;
    const r = gl.info.render;
    const s: PerfSample = {
      fps: Math.round(1000 / ms),
      ms: +ms.toFixed(1),
      p95: +t[Math.min(t.length - 1, Math.floor(t.length * 0.95))].toFixed(1),
      calls: r.calls,
      points: r.points,
      triangles: r.triangles,
      dpr: gl.getPixelRatio(),
    };
    (window as unknown as { __perf: PerfSample }).__perf = s;
    const el = document.getElementById('perf-hud');
    if (el) {
      el.textContent = `${s.fps} fps · ${s.ms} ms (p95 ${s.p95}) · ${(s.points / 1000).toFixed(0)}k pts · ${(s.triangles / 1000).toFixed(0)}k tris · ${s.calls} calls · ${s.dpr}×`;
      el.dataset.slow = s.fps < 30 ? '1' : '0';
    }
  });
  return null;
}
