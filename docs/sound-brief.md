# Sound brief: ElevenLabs sound effects

Euclid & Case, late October 1888. A quiet residential avenue of mansions: horses, not engines; gas,
not electricity (except Brush's windmill). Sound follows the same rule as the picture: the
**ambience is the impression**, and the **sounds tied to evidence and story beats are specific**.

## How to generate

- **Model:** `eleven_text_to_sound_v2` (needed for `loop`).
- **Takes:** generate 3–4 takes of each and keep the best. For anything with "vars" below, keep that
  many good takes as `-1`, `-2`, … so repeats don't sound identical.
- **Format:** MP3 44.1 kHz, 128 kbps or better.
- **Delivery:** `scripts/gen-sounds.mjs` generates them from `scripts/sounds.json` into
  `public/audio/` (tiers 1 and 2 generated 2026-10-13 for ~3,200 credits at 10 credits/second), and
  `scripts/normalize-audio.py` levels them.
- **Prompts:** end every prompt with "no music, no voices" unless voices are wanted. Period
  matters: if a take has a car, engine or modern hum in it, discard it.
- **Loops:** set `loop: true` and the longest duration (30 s). Longer loops repeat less obviously.

## Tier 1: enough for a first pass

| File | Use | Duration | Loop | Prompt influence | Prompt |
|---|---|---|---|---|---|
| `amb-street.mp3` | Street-mode bed, everywhere | 30 s | yes | 0.4 | Quiet residential avenue in the 1880s on a calm late-October afternoon: soft wind, a horse trotting on a packed dirt street far away, a few sparrows chirping, a dog barking very far off. Spacious and peaceful. No cars, no engines, no music, no voices. |
| `amb-wind-bare.mp3` | Wind layer for **1888** (bare elms) | 30 s | yes | 0.5 | Cool autumn wind moving through tall bare elm branches, soft airy gusts and faint whistling, bare twigs knocking gently, a few dry leaves skittering along the ground. No birds, no traffic, no music, no voices. |
| `amb-wind-leafy.mp3` | Wind layer for **Painterly** (crowns in leaf) | 30 s | yes | 0.5 | Gentle breeze through large trees still full of dry autumn leaves, a soft continuous rustle that swells and settles. Calm and warm. No birds, no traffic, no music, no voices. |
| `amb-map.mp3` | Map mode (the 1881 plate) | 30 s | yes | 0.4 | Hushed library reading room: a slow ticking wall clock, an occasional soft page turn, the quiet air of a large room. No voices, no music. |
| `step-flagstone.mp3` | Walking on sidewalks | 8 s | no | 0.6 | Eight separate footsteps of leather-soled boots on stone flagstones, walking at an even pace, about one step per second, close and dry, no background. No music, no voices. |
| `step-dirt.mp3` | Walking on the roadway | 8 s | no | 0.6 | Eight separate footsteps of leather boots on a packed dirt and gravel road, even walking pace, about one step per second, close, slight crunch, no background. No music, no voices. |
| `step-lawn.mp3` | Walking on lawns | 8 s | no | 0.6 | Eight separate footsteps on short mown grass scattered with dry fallen leaves, even walking pace, about one step per second, soft crunch of leaves, close, no background. No music, no voices. |
| `carriage-pass.mp3` (vars 2) | A carriage passes now and then | 14 s | no | 0.5 | A single horse-drawn carriage passing on a packed dirt street: trotting hooves, iron-rimmed wooden wheels rolling and crunching, harness bells and tack jingling. It approaches from the distance, passes close by, and fades away. 1880s. No engines, no music, no voices. |
| `windmill.mp3` | Brush's windmill (station + beat 6) | 30 s | yes | 0.45 | A huge 19th-century wooden wind turbine turning slowly in a steady wind: the deep rhythmic whoosh of a sixty-foot rotor with many wooden blades, a creaking timber tower, groaning iron gears, and a faint low electric dynamo hum. No music, no voices. |
| `ui-sketch.mp3` | The street drawing itself on arrival | 6 s | no | 0.6 | Graphite pencil sketching quickly on rough paper, fast scratchy hatching strokes, close-up and intimate, nothing else. No music, no voices. |
| `ui-gather.mp3` | Dots gathering on arrival | 3 s | no | 0.4 | A soft granular shimmer, like fine sand or seeds gently pouring and settling onto paper, airy and delicate, rising and then resolving. No music, no voices. |
| `ui-photo.mp3` | The CPL photograph inking in | 4 s | no | 0.4 | A photographic print developing in a darkroom tray: a gentle slosh of liquid, then a soft rising shimmer as the image appears. Quiet and subtle. No music, no voices. |
| `ui-tap.mp3` (vars 3) | Buttons and pins | 0.5 s | no | 0.6 | A single soft tap of a fingertip on thick card stock, very short and dry. |

## Tier 2: story beats and texture

| File | Use | Duration | Loop | Prompt influence | Prompt |
|---|---|---|---|---|---|
| `bell-far.mp3` | **The silent bells** (St. Paul's). At St. Paul's the ambience drops away and a bell answers from far across the city: the silence is the point. | 12 s | no | 0.5 | A single church bell tolling three slow strokes very far away across a city, faint, with a long natural reverb tail fading to silence. No music, no voices. |
| `horse-snort.mp3` (vars 2) | Near hitching posts and passing carriages | 3 s | no | 0.5 | A horse standing still, snorting softly and shaking its head so the harness jingles, close. No music, no voices. |
| `gate-iron.mp3` | **Seven thousand dollars of fence** (Wade gate piers) | 4 s | no | 0.6 | A heavy wrought-iron gate swinging slowly open on old hinges: a long creak, then a deep metallic clank as it stops. No music, no voices. |
| `misfire.mp3` | **The misfire** (beat 1) | 3 s | no | 0.6 | An old revolver misfiring: a hammer falls with a sharp dry metallic click on a dud cartridge, a beat of silence, then a second click. No gunshot, no music, no voices. |
| `streetcar-bell.mp3` | **The misfire** (the streetcar conductor) | 3 s | no | 0.5 | The hand-rung bell of an 1880s horse-drawn streetcar, two quick bright dings at mid distance. No music, no voices. |
| `greased-logs.mp3` | **The house on greased logs** (Rockefeller) | 10 s | no | 0.4 | A wooden house being slowly moved on greased logs: deep timber groaning and creaking, ropes straining, logs rolling, a few distant shouted work calls. Slow and heavy. |
| `crows.mp3` (vars 2) | Occasional birds in bare trees (1888) | 6 s | no | 0.5 | Two or three crows cawing in bare trees at mid distance on a cool autumn afternoon. No music, no voices. |
| `city-far.mp3` | Very faint layer under everything | 30 s | yes | 0.35 | A 19th-century industrial city heard from far away in a quiet suburb: a faint steam locomotive whistle in the distance, a low rumble of a rail yard, a distant factory bell, all very soft and far. No modern sounds, no music, no voices. |
| `gaslamp.mp3` | Close to a gas lamp | 10 s | yes | 0.5 | The soft steady hiss of a gas street lamp burning, close, very quiet and constant. No music, no voices. |
| `ui-wash.mp3` | Switching to the Watercolour look | 2 s | no | 0.6 | A wet watercolour brush making one long sweeping stroke across textured paper. No music, no voices. |
| `ui-erase.mp3` | Evidence slider | 2 s | no | 0.6 | A pencil eraser rubbing on paper in short quick strokes, close. No music, no voices. |
| `ui-paper.mp3` | Map ↔ street descent | 2.5 s | no | 0.5 | A large sheet of paper lifted and turned over with a soft airy whoosh. No music, no voices. |

## Later: the winter sleigh race

| File | Use | Duration | Loop | Prompt influence | Prompt |
|---|---|---|---|---|---|
| `sleigh-race.mp3` | **The starting line** (winter preset) | 22 s | no | 0.4 | Dozens of horse-drawn sleighs racing past on a snowy avenue: many sleigh bells jingling, hooves muffled in packed snow, runners hissing, a crowd cheering and calling out, sweeping past and away into the distance. |
| `amb-winter.mp3` | Winter bed | 30 s | yes | 0.4 | A still, snowy residential avenue in the 1880s: soft muffled quiet, a light wind, a distant sleigh bell now and then. No cars, no music, no voices. |

## How it will play (so the takes fit)

- **Layers:** `amb-street` plus one wind bed (bare or leafy, by era), with `city-far` very low
  underneath. Carriages, crows and horses play as occasional one-shots, placed in 3D (Web Audio
  panner) along the road and in the trees.
- **Footsteps:** I'll slice each 8-step take into single steps and choose the surface by what you're
  standing on (flagstone, roadway or lawn), the same way the ground dots are coloured.
- **Places:** the windmill, lamps and gate are positional, so they get louder as you approach.
- **St. Paul's:** the ambience ducks almost to nothing at that station. The far bell is the only
  sound, which makes "the silent bells" something you hear rather than read.
- **Volume:** everything starts muted until the visitor turns sound on (browsers require a click).
  There will be a sound toggle in the panel.
