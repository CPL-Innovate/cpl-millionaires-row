"""Level every sound in public/audio to the same loudness (−20 LUFS) with one plain gain per file:
no compression or limiting, so loops stay seamless and transients keep their shape. Gain is capped
so peaks stay below −1 dBFS; the mix (how loud each sound plays) is set in src/audio/.
Re-run after generating or re-rolling sounds. Needs ffmpeg.

usage: python3 scripts/normalize-audio.py [files…]   (default: public/audio/*.mp3)
"""
import glob, os, re, subprocess, sys

TARGET, CEILING = -20.0, -1.0

def measure(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=sample', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    summary = err[err.rfind('Summary:'):]
    lufs = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summary).group(1))
    peak = float(re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', summary).group(1))
    return lufs, peak

for path in sys.argv[1:] or sorted(glob.glob('public/audio/*.mp3')):
    lufs, peak = measure(path)
    gain = min(TARGET - lufs, CEILING - peak)
    if abs(gain) < 0.3:
        print(f'{path}: {lufs:.1f} LUFS, ok')
        continue
    tmp = path + '.tmp.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', path, '-af', f'volume={gain:.2f}dB',
                    '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', '44100', tmp], check=True)
    os.replace(tmp, path)
    print(f'{path}: {lufs:.1f} LUFS → {lufs + gain:.1f} ({gain:+.1f} dB, peak {peak + gain:.1f})')
