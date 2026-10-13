// Generate the sound effects in scripts/sounds.json with ElevenLabs (text-to-sound v2) into
// public/audio/. Existing files are skipped, so it can be re-run to fill gaps or, after deleting a
// file, to re-roll that take.
// Usage: ELEVENLABS_API_KEY=… node scripts/gen-sounds.mjs [tier1|tier2|later|all] [name …]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Set ELEVENLABS_API_KEY');
const [tier = 'tier1', ...only] = process.argv.slice(2);
const sounds = JSON.parse(readFileSync(new URL('./sounds.json', import.meta.url)));
mkdirSync('public/audio', { recursive: true });

let spent = 0;
const jobs = [];
for (const s of sounds) {
  if (tier !== 'all' && s.tier !== tier) continue;
  if (only.length && !only.includes(s.file)) continue;
  for (let v = 1; v <= s.vars; v++) {
    const out = `public/audio/${s.file}${s.vars > 1 ? `-${v}` : ''}.mp3`;
    if (!existsSync(out)) jobs.push({ s, out });
  }
}

async function gen({ s, out }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text: s.prompt,
        model_id: 'eleven_text_to_sound_v2',
        duration_seconds: s.duration,
        prompt_influence: s.influence,
        loop: s.loop,
      }),
    });
    if (res.ok) {
      writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      const cost = +(res.headers.get('character-cost') ?? 0);
      spent += cost;
      console.log('ok  ', out, `${cost} credits`);
      return;
    }
    const msg = await res.text();
    console.log(`fail ${out} (${res.status}) ${msg.slice(0, 200)}`);
    if (res.status < 500 && res.status !== 429) return;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

// three at a time
const queue = [...jobs];
await Promise.all([0, 1, 2].map(async () => { while (queue.length) await gen(queue.shift()); }));
console.log(`${jobs.length} requested, ${spent} credits`);
