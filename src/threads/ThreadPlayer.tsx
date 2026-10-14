import { useEffect, useState } from 'react';
import { useThread, type Archive } from './store';
import { player } from './player';
import { THREADS } from './index';

// The thread's panel (draft copy from the scripts), its archive prints, sound captions and the
// controls. Space pauses, ← → step between stops, Esc leaves.
export function ThreadPlayer({ soundOn, onSound }: { soundOn: boolean; onSound: () => void }) {
  const v = useThread();
  useEffect(() => {
    if (!v.id) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') player.exit();
      else if (e.key === ' ') { e.preventDefault(); player.toggle(); }
      else if (e.key === 'ArrowRight') player.next();
      else if (e.key === 'ArrowLeft') player.prev();
      else return;
      e.stopPropagation();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [v.id]);
  if (!v.id) return null;
  const stop = v.stops[v.stop];
  const p = stop?.panel ?? {};
  const listen = !!p.spoken;
  return (
    <div className={`thread ${listen ? 'listen' : ''}`}>
      <div className="thread-dark" style={{ opacity: v.dark }} />
      {!v.ended && stop && (
        <article className={`thread-panel ${listen ? 'spoken' : ''}`} key={v.stop} aria-live="polite">
          <p className="meta">{v.title} · {v.stop + 1} / {v.stops.length}</p>
          <h2>{stop.title}</h2>
          {p.text && <p className="text">{p.text}</p>}
          {p.quote && (
            <blockquote>
              <p>“{p.quote.text}”</p>
              <cite>{p.quote.who}</cite>
            </blockquote>
          )}
          {p.numbers && (
            <div className="numbers">
              {p.numbers.map((n) => (
                <div key={n.label}><b>{n.value}</b><span>{n.label}</span></div>
              ))}
            </div>
          )}
          {p.footer && <p className="footer">{p.footer}</p>}
        </article>
      )}
      {!v.ended && p.accounts && (
        <div className="accounts" key={`a${v.stop}`}>
          {p.accounts.map((a, i) => (
            <div className="account" key={a.claim} style={{ animationDelay: `${0.4 + i * 1.6}s` }}>
              <p>{a.claim}</p>
              <cite>{a.who}</cite>
            </div>
          ))}
        </div>
      )}
      {!v.ended && p.focus && (
        <figure className={`focus-print ${p.focus.img ? '' : 'pending'}`} key={`f${v.stop}`}>
          <div className="push">
            {p.focus.img ? <img src={p.focus.img} alt={p.focus.label} /> : <div className="ph"><span>{p.focus.id}</span><span>not yet in the build</span></div>}
          </div>
          <figcaption>{p.focus.label}{p.focus.note && <b>{p.focus.note}</b>}</figcaption>
        </figure>
      )}
      {!v.ended && p.blanks && (
        <ol className="blanks" key={`b${v.stop}`} aria-label={`${p.blanks} unnamed people`}>
          {Array.from({ length: p.blanks }, (_, i) => <li key={i} style={{ animationDelay: `${0.6 + i * 0.22}s` }}>name unknown</li>)}
        </ol>
      )}
      {!v.ended && p.archive && (
        <div className="prints" key={`p${v.stop}`}>
          {p.archive.map((a) => <Print key={a.label} a={a} />)}
        </div>
      )}
      {v.captions.length > 0 && (
        <div className="captions" aria-live="polite">
          {v.captions.map((c) => <span key={c}>{c}</span>)}
        </div>
      )}
      {v.ended && (
        <article className="thread-end">
          <p className="meta">{v.title}</p>
          <h2>{v.endCard}</h2>
          <div className="row">
            <button onClick={() => player.replay()}>Again</button>
            <button onClick={() => player.exit()}>{v.scene === 'street' ? 'Stay and walk' : 'Back to the Atlas'}</button>
          </div>
        </article>
      )}
      <nav className="thread-bar" aria-label="Thread controls">
        <button onClick={() => player.prev()} aria-label="Previous stop">‹</button>
        <button onClick={() => player.toggle()} aria-label={v.playing ? 'Pause' : 'Play'}>{v.ended ? '↺' : v.playing ? '❚❚' : '▶'}</button>
        <button onClick={() => player.next()} aria-label="Next stop">›</button>
        <ol className="ticks">
          {v.stops.map((s, i) => (
            <li key={s.title}>
              <button className={i === v.stop ? 'on' : i < v.stop ? 'past' : ''} onClick={() => player.seekStop(i)} title={s.title} aria-label={`Stop ${i + 1}: ${s.title}`} />
            </li>
          ))}
        </ol>
        {!soundOn && <button className="snd" onClick={onSound}>Sound on</button>}
        <button className="x" onClick={() => player.exit()} aria-label="Leave the thread">Leave</button>
      </nav>
    </div>
  );
}

function Print({ a }: { a: Archive }) {
  return (
    <figure className={a.img ? 'print' : 'print pending'}>
      {a.img ? <img src={a.img} alt={a.label} /> : <div className="ph"><span>Archive</span><span>not yet in the build</span></div>}
      <figcaption>{a.label}{a.id && <small>{a.id}</small>}</figcaption>
    </figure>
  );
}

export function ThreadMenu({ onClose, onPick }: { onClose: () => void; onPick: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="thread-menu" role="dialog" aria-label="Threads" onClick={onClose}>
      <div className="inner" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <h2>Threads</h2>
        <p className="lede">Pick your own way in. Each one is a short chapter, under two minutes.</p>
        <ol>
          {THREADS.map((t) => (
            <li key={t.id}>
              <button onMouseEnter={() => setHover(t.id)} onFocus={() => setHover(t.id)} onMouseLeave={() => setHover(null)} onClick={() => onPick(t.id)}>
                <span className="label">{t.label}</span>
                <span className="rt">{t.runtime}</span>
                <span className={`hover ${hover === t.id ? 'on' : ''}`}>{t.hover}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
