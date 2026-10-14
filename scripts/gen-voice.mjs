// Narration for the Listen thread (scripts/voice.json) with ElevenLabs text-to-speech into
// public/audio/. Existing files are skipped; delete one to re-roll it.
// Usage: ELEVENLABS_API_KEY=… node scripts/gen-voice.mjs [name …]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Set ELEVENLABS_API_KEY');
const only = process.argv.slice(2);
const v = JSON.parse(readFileSync(new URL('./voice.json', import.meta.url)));
for (const [name, text] of Object.entries(v.lines)) {
  if (only.length && !only.includes(name)) continue;
  const out = `public/audio/${name}.mp3`;
  if (existsSync(out)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: v.model, voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true } }),
  });
  if (!res.ok) { console.log('fail', out, res.status, (await res.text()).slice(0, 200)); continue; }
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log('ok  ', out);
}
