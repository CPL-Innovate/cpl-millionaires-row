"""Synthesised stand-ins for Threads sounds that ElevenLabs hasn't generated yet (scripts/sounds.json,
tier "threads"). Plain numpy: additive bells, a thud, a dynamo hum, a flag. Writes public/audio/*.mp3
(skips files that exist, so a generated take always wins) and leaves levelling to normalize-audio.py.

usage: python3 -I scripts/synth-sounds.py [name …]
"""
import os, subprocess, sys
import numpy as np

SR = 44100
rng = np.random.default_rng(1888)
OUT = 'public/audio'


def reverb(x, secs=3.2, mix=0.35, damp=2.6):
    # convolution with exponentially decaying noise, low-passed: a stone street at night
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-damp * t)
    ir[: int(0.012 * SR)] = 0
    spec = np.fft.rfft(ir)
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (f / 2500) ** 2)
    ir = np.fft.irfft(spec, n)
    ir /= np.abs(ir).sum() ** 0.5 * 8
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x) + n]
    out = np.zeros(len(x) + n)
    out[: len(x)] += x * (1 - mix)
    out += y * mix / (np.abs(y).max() + 1e-9) * np.abs(x).max()
    return out


def bell(f0, dur=6.0, amp=1.0):
    # a church bell's partials (hum, prime, tierce, quint, nominal, …) with their own decays
    partials = [(0.5, 1.0, 0.9), (1.0, 0.8, 1.3), (1.2, 0.5, 1.7), (1.5, 0.35, 2.0), (2.0, 0.6, 2.4),
                (2.5, 0.25, 3.1), (2.67, 0.2, 3.4), (3.0, 0.18, 3.8), (4.17, 0.1, 5.0), (5.43, 0.06, 6.2)]
    t = np.arange(int(dur * SR)) / SR
    y = np.zeros_like(t)
    for m, a, d in partials:
        beat = 1 + 0.002 * rng.standard_normal()
        y += a * np.sin(2 * np.pi * f0 * m * beat * t + rng.uniform(0, 6.28)) * np.exp(-d * t / 1.4)
    strike = rng.standard_normal(len(t)) * np.exp(-t * 90) * 0.4  # clapper on bronze
    y = (y + strike) * amp
    return y


def bells_peal(secs=22.0):
    # six bells rung in rounds and a few changes, ~2.3 s per row (a slow tower peal)
    notes = [523.25, 466.16, 415.30, 392.00, 349.23, 311.13]  # C5 B♭4 A♭4 G4 F4 E♭4 (fundamental shown an octave up)
    rows = [[0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [1, 0, 3, 2, 5, 4], [1, 3, 0, 5, 2, 4], [3, 1, 5, 0, 4, 2], [3, 5, 1, 4, 0, 2], [5, 3, 4, 1, 2, 0], [5, 4, 3, 2, 1, 0], [0, 1, 2, 3, 4, 5]]
    y = np.zeros(int((secs + 7) * SR))
    t = 0.3
    for r, row in enumerate(rows):
        for b in row:
            if t > secs:
                break
            s = bell(notes[b] / 2, 6.5, 0.7 + 0.3 * rng.random())
            i = int(t * SR)
            y[i : i + len(s)] += s[: len(y) - i]
            t += 0.36 + 0.03 * rng.standard_normal()
        t += 0.36  # the handstroke gap
    y = reverb(y[: int((secs + 4) * SR)], 3.5, 0.45)
    fade = np.ones(len(y))
    n = int(3 * SR)
    fade[-n:] = np.linspace(1, 0, n) ** 2
    return y * fade


def thud():
    t = np.arange(int(1.6 * SR)) / SR
    f = 62 * np.exp(-t * 3) + 38
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    n = rng.standard_normal(len(t)) * np.exp(-t * 40)
    spec = np.fft.rfft(n)
    spec *= 1 / (1 + (np.fft.rfftfreq(len(n), 1 / SR) / 300) ** 4)
    y += np.fft.irfft(spec, len(n)) * 3
    return reverb(y, 1.2, 0.25, 5)


def hum(secs=10.0):
    # 60 Hz mains with odd harmonics and a faint brush buzz; whole cycles, so it loops cleanly
    n = int(secs * 60) * SR // 60
    t = np.arange(n) / SR
    y = sum(a * np.sin(2 * np.pi * 60 * k * t) for k, a in [(1, 1.0), (2, 0.4), (3, 0.5), (5, 0.18), (7, 0.08)])
    buzz = rng.standard_normal(n)
    spec = np.fft.rfft(buzz)
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= np.exp(-((f - 1800) / 700) ** 2)
    buzz = np.fft.irfft(spec, n)
    buzz *= 0.5 + 0.5 * np.sin(2 * np.pi * 120 * t)
    return y + buzz / np.abs(buzz).max() * 0.12


def flag(secs=6.0):
    n = int(secs * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= np.exp(-((f - 900) / 900) ** 2)
    x = np.fft.irfft(spec, n)
    gust = 0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t) ** 2
    flap = np.clip(np.sin(2 * np.pi * (7 + 3 * np.sin(2 * np.pi * 0.3 * t)) * t), 0, 1) ** 6
    env = np.minimum(1, t / 0.3) * np.minimum(1, (secs - t) / 0.8)
    return x * (0.35 + flap) * gust * env


SOUNDS = {'bells-peal': bells_peal, 'thud-soft': thud, 'hum-electric': hum, 'flag-flap': flag}

for name, fn in SOUNDS.items():
    if sys.argv[1:] and name not in sys.argv[1:]:
        continue
    out = f'{OUT}/{name}.mp3'
    if os.path.exists(out):
        print('skip', out)
        continue
    y = fn()
    y = y / (np.abs(y).max() + 1e-9) * 0.89
    wav = out[:-4] + '.wav'
    pcm = (y * 32767).astype('<i2')
    import wave
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', out], check=True)
    os.remove(wav)
    print('ok  ', out, f'{len(y) / SR:.1f} s')
