// Dev-only: ?raf=timeout keeps animation ticking in a hidden/background preview pane.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('raf') === 'timeout') {
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}

import gsap from 'gsap';
// Dev-only: ?shots=1 for headless screenshots (virtual time makes big frame gaps; don't smooth them away)
if (import.meta.env.DEV && new URLSearchParams(location.search).get("shots")) { gsap.ticker.lagSmoothing(0); gsap.globalTimeline.timeScale(6); }

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
