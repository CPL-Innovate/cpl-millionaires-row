# Millionaires' Row: Euclid & Case, c. 1888

An experimental, browser-based reconstruction of the E. 40th (Case Avenue) intersection of Euclid
Avenue, Cleveland's "Millionaires' Row", as it stood in October 1888. It is built from the
Cleveland Public Library's historical photographs and the 1881 Hopkins plat atlas.

It is the rendering spike for CPL's Millionaire's Row immersive project. The rendering approach is
adapted from [chartogne-taillet.com](https://chartogne-taillet.com/en) (Immersive Garden, 2020),
with every technique written from scratch. The question it explores is **how to show a lost street
honestly: what is evidence, and what is impression.**

> Status: demo / design spike. Not a survey-grade reconstruction. See [Honest limits](#honest-limits).

## The idea

The rendering style carries the provenance.

- **Buildings are pencil drawings.** They are where the evidence is, and their drawing style says
  how much evidence there is:

  | State | Rendered as |
  |---|---|
  | Photographed | Ink, cross-hatched (on the Everett mesh, tone comes from the photo-derived texture) |
  | Inferred | Graphite hatching: footprints, massing |
  | Invented | Construction lines; the **Evidence** slider fades them to dashed ghosts |

- **Everything else is impressionist paint.** Trees, lawns, road, fences, lamps and shrubs are
  camera-facing dots, because the environment is the least evidenced layer. The **Evidence** slider
  thins the paint away and leaves only the drawing.
- **Colour is inferred everywhere,** because every source photograph is black and white.

## Run

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

## Using it

- **Atlas (prototype, the default map):** the 3D street seen from a bird's-eye view, drawn as an
  engraving and looking east along Euclid, so the avenue runs up the middle of the screen (west at
  the bottom, north on the left). The plate's linework is inked on bare paper. Each tree is a small
  paper crown seen from above (a lopsided, scalloped ink outline that varies tree to tree) over a
  soft grey shadow pool (`AtlasTrees`), and the houses are in pencil. The carriages are ink
  outlines on paper (coach, driver's hat, turning wheels, pole and the pair from above), drawn in
  screen-space ribbons 0.8–2 px wide so they stay legible at every zoom; their dots step aside. Euclid's and E. 40th's (Case
  Avenue's) curbs draw out from the corner, and their names write themselves onto the roadway each
  time the Atlas comes up. Hover a lot and it hatches in red with its name set large; click to
  select it and fly there; click again (or "Walk the street") to descend, and the paint takes over
  from the ink. Drag to fly, right-drag to turn, scroll to zoom. Nine lots are traced so far
  (`LOTS` in `data/site.ts`, plate px); the lot strip runs west to east along the bottom.
- **Map mode (1881 plate):** the 1881 Hopkins Plates 3 and 5, georeferenced into one north-up map. Pick a house
  or a station to descend.
- **Street mode:** drag to look, WASD or the arrow keys to walk, shift to hurry. Numbered pins are
  sourced story beats.
- **Stations:** at each matched view, the CPL photograph inks in over the scene. The
  **Photograph** slider fades between photo and drawing. Everett (CPL 63), Wade (8106) and
  Stager–Beckwith (the lawn stereoview with parasols, apparently Wilson II p. 73; source and
  rights to confirm) are registered to their photographs: the camera was searched by matching the
  house's silhouette against the sky to the photo's, then checked by eye (`photo.fit` in
  `data/site.ts` sets the print's size). *Everett, from the NE* shows the side no
  photograph records; push **Evidence** to see what the model invented.
- **Palettes:** Graphite, Sepia ink, Cyanotype.
- **Painterly / 1888:** Painterly (the default) is the impression, tuned for the eye: autumn
  crowns, mounded lawns, bright accents. 1888 is calibrated to the archive: nearly every photograph
  of that autumn shows bare-branched elms, so the crowns are near-bare and turned, the lawns mown
  and leaf-strewn, with no pink or lavender flecks. 1888 is a layer over Painterly
  (`ERA_1888` in `settings/schema.ts`), and the Generator edits whichever one is showing.
- **Modelled house looks** (all seven modelled houses; any massing blocks stay pencil):
  - **Pencil:** the drawing described above.
  - **Watercolour:** the model's texture, painted. It keeps the texture's detail and values, pulls
    the colour toward the palette's earths, lays washes with wet edges, leaves paper white where
    the sun lands, lets the foot of the wall bleed into the lawn, and keeps pencil hatching in the shadows.
  - **Texture:** the Tripo texture as generated, lit by the scene's sun, with a normal map.
  - **Watercolour · per house** (top of the Generator) tunes each house's wash: pigment load,
    shadow depth, lightness, pull toward the palette, saturation, violet shadows, warm light, edge
    wobble, wet edges, granulation, reserved whites, foot bleed, pencil, texture softness and
    relief, plus five roof settings (where the roof starts, pigment, reserved whites, slate colour,
    blue ↔ violet). Roofs are found by their cool slate colour above a height, because the jagged
    Tripo meshes make the surface angle useless. Each house keeps its own values (saved with presets, export and the project default);
    **Copy to all houses** and **Reset house** sit underneath. Wade Sr. starts grey because its
    wall material is unknown.
  - Switching looks blotches the new one in with the same noise as the street reveal. In every
    look, **Evidence** drains the (inferred) colour and fades the invented faces.
- **Generator** ("Tune the generator", or `?gen`): every generative parameter (motion, paint,
  ground, planting, tree form, foliage, colour ramps).
  - Unmarked sliders change instantly; ↻ sliders regrow the scene once you stop dragging.
  - Settings autosave in the browser. You can save named presets and export or import JSON.
  - In dev, **Save as project default** writes `public/settings.json`, which every build loads as
    its starting look.
- **Sound** (off until turned on; browsers need a click first). **Sound** and **Music** volume
  sliders sit under the switch (80% to start, remembered per browser; Music at 0 turns it off):
  - Background loops for the street, a distant 1880s city and the wind. 1888 gets wind in bare
    elms, Painterly a leafy rustle. Map mode is a hushed reading room.
  - In the scene: Brush's windmill and the nearest gas lamp get louder as you approach.
    Four carriages walk Euclid in dots (coach, driver, turning wheels, a pair of horses on a looped
    stride), and each one's sound is panned along with it as it passes you. Crows call from the trees (more of them in 1888).
  - Footsteps match what you're walking on: roadway, flagstone or lawn.
  - Story beats have their own sounds. At St. Paul's, or with "The silent bells" open, the street
    falls quiet and a single bell answers from far across the city.
  - Interface sounds: pencil and paper as the street draws itself, a shimmer as the dots gather,
    the photo developing, and a card tap on buttons.
  - **Music**: an original slow salon waltz for each era,
    generated with the ElevenLabs Music API. Painterly gets warm piano over a soft string pad, and
    1888 a sparse, hushed upright. It plays quietly under everything, rests a few seconds between
    repeats, crossfades when the era changes, and falls silent at St. Paul's.
  - The sounds are generated with ElevenLabs from the prompts in `docs/sound-brief.md`
    (`scripts/sounds.json`). `ELEVENLABS_API_KEY=… node scripts/gen-sounds.mjs tier1|tier2|later|music|all`
    fills in missing files, so delete a file and re-run it to re-roll that sound. Then run
    `python3 scripts/normalize-audio.py` to level everything to −20 LUFS. The mix is set in
    `src/audio/engine.ts`.
- **Performance:** Full or Light (fewer, larger bark and ground dots at 1× pixel density; the
  default on touch devices). **Show frame rate** (or `?fps`) puts frame time, point count and
  draw calls at the top of the screen.
- **Deep links:** `?map=plate` opens on the flat plate instead of the Atlas; `?station=everett&palette=sepia&evidence=0.6&look=wash&era=1888&gen` (`look` is
  `pencil`, `wash` or `texture`; `era` is `painterly` or `1888`)

## Threads (branch `threads`, 2026-10-14)

Eleven short animated chapters, picked from **Threads** in the station bar, from the vault's
`content/2026-10-14-threads-scripts` (v0.2). Each one is choreographed by hand as one paused gsap
timeline (`src/threads/<name>.ts`). Every state it touches is tweened on that timeline, so a stop can
be jumped to or replayed and lands in the right state. These include the camera, the grade, the houses,
ambience levels, looping beds, the map overlay and the sketched figures. When a thread ends, the walker
takes over wherever its camera stopped, or the map does.

| Thread | Stops | Runs | What it adds |
|---|---|---|---|
| Vanished | 8 | 1:56 | The whole Avenue as one ink line on paper, houses as dots by street number (`threads/avenue.ts`, from the mansion survey) |
| The Silent Bells | 6 | 1:25 | Night grade, window glow, the Wade villa dissolving into construction lines |
| The Line | 7 | 1:50 | The horsecar route on the map insert, a sketched 1908 crowd, rails that ink themselves down Euclid |
| Lit by Wind | 6 | 1:35 | Electric (even) vs gas (flickering) window light; a sketched walker |
| The Misfire | 5 | 1:05 | A handheld, deliberately unlocated 1884 stop |
| Follow the Money | 6 | 1:40 | A ghost massing block (the Burgert house) sliding down Case; smoke over the villas |
| Afterlives | 6 | 1:35 | Golf flags, the Arena crowd, the survivors coming up in watercolour |
| Who's Missing | 6 | 1:25 | Empty frames and blank "name unknown" cards: no invented people |
| The Starting Line | 5 | 1:10 | A winter: snow grade, falling snow, the carriages off the street, drawn sleighs |
| Listen | 8 | 2:15 | Narrated (ElevenLabs), the frame near-black, sound captions throughout |
| Four Corners | 8 | 1:55 | Two turns from the middle of the road |

- **Controls:** space pauses, ← → step between stops, Esc leaves. Sound captions are on throughout.
- **Deep links:** `?thread=<id>&stop=<n>&at=<seconds>&hold` (`hold` pauses there, for screenshots).
- **The shell:**
  - `threads/kit.ts` is the stop helpers the threads are written in.
  - `player.ts` starts, seeks and leaves a thread.
  - `ThreadStage.tsx` (in the Canvas) applies the rig.
  - `ThreadPlayer.tsx` holds the panel, the prints, the captions, the controls and the menu.
  - `AvenueMap.tsx` is the map overlay.
  - `Figures.tsx` has the sketched people, sleighs, flags, rails, the ghost block and the snow.
- **Shared effects:**
  - `gl/night.ts`: the night, smoke and winter grades, applied in three's colorspace chunks so every material gets them.
  - `uGone` / `uGlow` per house (`houseFx` in `gl/uniforms.ts`): dissolve to construction lines, and light where the photo-derived texture is dark.
- **Sound:**
  - `scripts/sounds.json` tier `threads`, made with `gen-sounds.mjs`.
  - Narration: `scripts/voice.json` with `gen-voice.mjs` (needs `ELEVENLABS_API_KEY`).
  - `scripts/synth-sounds.py`: numpy stand-ins, kept as a fallback.
- **Archive prints** not yet in the build show as "not yet in the build" cards with their record pointer.
- **Honest limits:**
  - Draft copy, not checked with L&GH.
  - Wilson quotes are not rights-cleared.
  - Every year in Vanished still needs a check.
  - Figures, crowds, sleighs, the golf flags and the ghost block are drawn inventions.
  - Several threads run past the script's ~1:30–1:45. The script says to cut stops, not speed up.

## How it's built

React + TypeScript + Vite + Three.js via React Three Fiber. GSAP handles transitions. There is no
backend, and everything runs in the browser.

```
src/
  App.tsx               UI shell: panels, stations, cards, deep links
  palettes.ts           Graphite / Sepia / Cyanotype: pencil, paper, foliage + earth colour ramps
  data/site.ts          Buildings (positions, meshes + per-face provenance, ledgers, sources),
                        stations, story beats
  gl/uniforms.ts        Shared shader uniforms (palette, evidence, reveal, looks, live generator params)
  gl/materials.ts       Shaders: pencil hatching, watercolour + texture looks, plate/ground, photo
                        ghost, pointillist dots
  gl/geometry.ts        Massing volumes, tree generator, windmill
  scene/World.tsx       Scene assembly: ground, buildings, trees, street kit, ground dots
  scene/CameraRig.tsx   Map ↔ street transitions, walking, station moves
  scene/Overlays.tsx    Photo ghosts, story pins, map labels
  scene/walk.ts         Walking state shared with the audio
  scene/Carriages.tsx   Carriages on Euclid: dots scattered over the slim rig, wheels spun, horse
                        dots blended between 16 stride keys each frame (scene/traffic.ts → audio);
                        in the Atlas, an ink outline instead (makeAtlasCarriage*Material)
  audio/engine.ts       Web Audio: ambience beds, positional sounds, footsteps, beats, music, mix
  audio/AudioDirector.tsx  Listener on the camera, windmill/lamp placement, footsteps by surface
  settings/             Generator schema + store (eras, quality, per-house watercolour, autosave,
                        presets, project defaults)
  ui/GeneratorPanel.tsx The Generator drawer (incl. Watercolour · per house)
  ui/Perf.tsx           Frame-rate probe (?fps)
  scene/AtlasLabels.tsx Atlas street names on the roadway, written in with a pen-sweep reveal
  scene/AtlasPicker.tsx Atlas hover/click: pointer → ground → plate px → lot
  scene/AtlasTrees.tsx  Atlas trees: one instanced paper crown + ground shadow per tree
  gl/lots.ts            Lot id texture for the ground shader, point-in-lot, lot centres
scripts/
  compose_plate.py      Georeferences Plates 3 + 5 into public/plates/euclid-case-1881.jpg
  strip-everett.mjs     Slims the Everett spike mesh (drops unused PBR maps)
  bake-carriage.py      Blender: Carriage/ FBX + .pc2 point cache → slim rig with baked vertex
                        colours and one looping stride as morph keys (then `gltf-transform meshopt`)
  slim-model.mjs        Slims a raw Tripo export: base colour only, ~85k triangles, 1K map, meshopt
  house-maps.mjs        Extracts a house's 2k colour + normal maps for the Watercolour and Texture looks
  gen-sounds.mjs        Generates sounds and music with ElevenLabs from sounds.json
  normalize-audio.py    Levels every sound to −20 LUFS
docs/
  sound-brief.md        Every sound and music prompt with its settings
public/
  plates/  img/  models/  audio/
  settings.json         Project default look (Generator → Save as project default)
```

### Techniques worth knowing

- **Reveal:** a noise threshold with a per-cell random offset makes the street sketch itself
  outward from where you land, instead of fading in. Ahead of the front, each dot waits a little
  further out and up, small, and is swept inward to its place as the front passes; going back to
  the map runs it in reverse.
- **Photo ghosts:** the CPL print develops from its centre outward with a ragged, wet front, and
  keeps a soft deckled edge instead of a hard rectangle.
- **Pencil hatching:** world-space strokes, made by measuring distance to a far point, wobbled by
  noise. Darker tones get crosshatching. Strokes merge into flat tone with distance to avoid moiré.
- **Pointillism:**
  - Opaque discs sized by 1/depth, with irregular rims and a little paper grain.
  - Crown dots are lit by where they sit in the crown relative to a low south-west sun.
  - Bark dots are lit by which side of the limb faces the sun.
- **Ground:** a box of points that wraps around the camera, so a fixed budget covers the whole
  block. There's a fine near layer and a coarse far layer. Each point is placed and coloured in the
  shader by what it lands on (lawn, sidewalk or roadway).
- **Motion:** each dot's drift is a sum of sines at unrelated frequencies with a per-dot phase. It
  looks like Brownian motion, has no state, and never wanders off.
- **Trees:** every tree is generated individually.
  - Form: mostly vase-shaped elms, with some round and some upright crowns.
  - Age, lean, crookedness, lopsidedness, and reach toward the street.
  - Planting: irregular spacing with gaps and pairs.
  - Each tree also turns colour at its own pace.
- **Plate georeferencing:** each plate gets its own least-squares affine fit to a frame where
  Euclid is straight and Case perpendicular, using four street control points per plate. A second
  pass pulls street lines measured on both plates (Euclid and Prospect lot lines, the Case lines)
  onto shared targets, so the streets run straight across the seam, which runs along Case. The
  targets come from the engraving: at the scale bar's 0.40 m/px, Euclid's lot lines are 74 px apart
  (99 ft, as annotated) and Case's 46 px (60 ft), so both centrelines land on the 3D street's.

## Honest limits

- Building positions are read off the georeferenced plates by eye, accurate to about ±5 m. The
  plates themselves disagree slightly (Case meets Euclid at about 93° on Plate 3 and 88° on
  Plate 5); the affine fit absorbs that.
- All seven houses are image-to-3D spikes, not reconstructions: Everett (A1, provisional score
  50–54/100), Stager-Beckwith (S1), Rockefeller (R1), Wade Sr. (W1), Randall Wade (RW1), St. Paul's
  (P1) and Brush (B1), all but Everett unscored. Each came from a GPT-cleaned photo through Tripo
  and was slimmed to about 85k triangles. The massing-block code remains for any house without a
  model.
  - **Scale comes from the footprint**, since the models have none: the photographed front's width
    against the 1912 Sanborn (Stager-Beckwith, Rockefeller, Randall Wade, St. Paul's, Brush) or the
    1881 plate (Wade Sr.). Height is the check: Stager-Beckwith's mansard lands at 11.2 m against
    Sanborn's 38 ft; St. Paul's tower at 23.8 m against its 75 ft and its eaves at 7.2 m against 24 ft.
    The Sanborns are tied to the scene through the Euclid and E. 40th lot lines (checked on
    Stager-Beckwith, within ~4 m).
  - Like W1, the new models fall short of the plates' depth: Randall Wade ~55% of its main block,
    St. Paul's ~75%, Brush ~65%. Randall's cornice matches its twin Wade Sr.'s eaves to half a
    metre; Tripo mirrored its west wing onto the east end, which is tagged invented.
  - St. Paul's ¾ view was laid out flat into one front (Euclid gable, tower, E. 40th range). The
    church survives, so its sides are invented *in this model*, not unknown.
  - Brush is a placeholder from a 600-px book halftone: all its carving is GPT's. Fitting its
    whole width to the footprint would make it too low, so the scale fits the two-gabled front
    block and the model runs ~5 m wider than the footprint. Sanborn 96 put it ~17 m west of the
    old massing guess.
  - Per-face provenance comes from an object-space heuristic (`MeshProvenance` in
    `src/data/site.ts`): roof, front, each side and rear, plus cut-offs where the evidence stops.
    It is not a per-face ledger.
  - Rockefeller's long wing behind the main block was invented by GPT and is tagged invented (the
    Sanborn does show a 2½-storey rear wing). The orientation of its source photo is a hypothesis.
  - Wade Sr.'s façade came out flat where the photo shows a break, and the model is only about 60%
    of the 1881 plate's depth. Its east end is invented, and which side the photo shows is
    unverified, so both sides are tagged inferred.
- The Everett texture is generated by Tripo from black-and-white photographs. Its colour and fine
  detail are AI-inferred everywhere, and on the invented faces it looks exactly as convincing as on
  the photographed front.
- Station cameras for Everett (63), Wade (8106) and Stager-Beckwith (the lawn stereoview) are
  registered by silhouette: the house's skyline against the sky, matched to the photo's over a grid
  of rendered poses. That is good to a degree or two, not a true camera solve (fSpy is still
  pending). The others are eyeballed. Everett's spike is squatter than the house, so its print is
  matched on the tower axis, turret and base rather than the spire.
- The environment (planting, lawns, colours) is an impression, not evidence. The current default
  look is painterly, not historically calibrated (see Next steps).
- Performance: on an Apple M2 Pro at 2× pixel density, Full holds the display's 120 fps cap
  (8.3 ms a frame, 95th percentile 9.3–9.4 ms) with about 1.6M points and seven ~85k-triangle
  houses (up to 512k triangles on screen in the Atlas). Uncapped, the three newest houses took
  frames from 5.0 to 5.8 ms in the Atlas and 3.8 to 5.1 ms at St. Paul's. Light draws
  about 880k points at 1× and is the default on touch devices. Phones and Quest headsets are
  still unmeasured.

## Next steps (pinned)

Where things stand (2026-10-14): seven modelled houses (Everett, Stager-Beckwith, Rockefeller,
Wade Sr., Randall Wade, St. Paul's, Brush) in Pencil / Watercolour / Texture with per-house watercolour tuning (Everett,
Rockefeller and Wade Sr. tuned and saved in `public/settings.json`); Painterly default with an 1888 toggle; the
Atlas as the default map, beside the flat 1881 plate; four dot-painted carriages on Euclid (ink
outlines in the Atlas); three
station cameras registered to their photographs; gathering dots and developing photos; frame-rate
readout and a Light setting; generated sound and music with volume sliders. In priority order:

1. **The Atlas, past the prototype:** trace the rest of the plate's lots; ink shields for the
   station and story pins; a compact station bar in the Atlas (it covers the foreground); turn the
   lot strip to match the east-facing view; check Sepia, Cyanotype and 1888 in the Atlas.
2. **Tune and review the remaining houses' watercolour** (Stager-Beckwith, and the new Randall
   Wade, St. Paul's and Brush, which run on the defaults), then Save as project default. Wade Sr.'s roof can't be found by colour (its walls and roof are
   both neutral), so its roof settings do little.
3. **Check the new spikes before anyone scores them:** Wade Sr. against the IoA ch04-48
   lithograph (the façade break; the rear wing is ~15 m short); a crop-first re-run for
   Rockefeller; confirm the source and rights of the Stager-Beckwith lawn stereoview. Re-run Brush
   from the CPL print (it is a placeholder); a photographed multi-view run for St. Paul's, which
   still stands; settle the Brush lot against the Worthington question in brush.md.
4. **A "Provenance" look** that picks the treatment per face: texture where photographed,
   watercolour where inferred, pencil where invented.
5. **Massing-block linework** (if more houses join without a model): contact dots, pencil window
   grids, string courses and cornices (marked inferred), an optional inferred-colour wash.
6. **The fSpy control pass** for photos 62/63/59/65: true camera solves (Everett, Wade and
   Stager-Beckwith are silhouette-registered for now) and a replacement for the facing-direction
   provenance heuristic.
7. **Measure on a phone** (Full now draws ~1.6M points plus seven ~85k-triangle meshes).
8. **A listening pass** on the 32 sounds and two music pieces; regenerate the sound effects on the
   paid ElevenLabs account before any public build (they were made on a free account). The
   carriage takes trot while the horses walk: a walking take would match.
9. Later: the winter sleigh race (a Generator preset plus the winter sounds already generated),
   figures drawn in dots (carriages done), and calibrating 1888's colours with L&GH.

Done since the first spike: Painterly / 1888, gathering dots and developing photos, frame rate and
Light, sound and music, the plate seam and registration, three more houses, the looks for every
modelled house; then (2026-10-13/14) carriages on Euclid, the Atlas map, the colour-pipeline fix
(palette hexes are now the colours on screen), photo-registered cameras for three stations, ink
carriages in the Atlas, and Randall Wade, St. Paul's and Brush as models.

## Dev-only helpers

- `?raf=timeout` keeps animation ticking in a hidden or background preview pane.
- `?shots=1` speeds up transitions for headless screenshots.
- `?nophoto` stops a station's CPL photograph fading in on arrival.
- `?map=plate` opens on the flat 1881 plate instead of the Atlas.
- In dev, `window.__pose([x, y, z], [tx, ty, tz])` sets a street camera by hand, `window.__cam`
  is the camera, and `window.__traffic` holds the carriages (move one in front of you with
  `__traffic[0].x = …`).
- `SNAP_DIR=… npm run dev` enables `POST /__snap?name=x`, which writes the canvas to `x.png`.
- `POST /__settings` is used by the Generator's **Save as project default**.

## Sources and rights

- Historical photographs and plat plates are from the **Cleveland Public Library Digital Gallery**
  (ContentDM pointers are in `src/data/site.ts`). They are pre-1931 and public domain. Please
  credit Cleveland Public Library when reusing them.
- The Stager-Beckwith lawn stereoview (`public/img/stager-beckwith-lawn.jpg`) appears to be the
  view lent to Wilson (*Famous Old Euclid Avenue* II, p. 73). The scan's source and rights are
  still to confirm.
- The carriage model's source files (`Carriage/`, not in git) came from the project owner. Their
  licence should be confirmed before a public build.
- Story beats cite Wilson, *Famous Old Euclid Avenue*; Ruminski & Dutka, *Cleveland in the Gilded
  Age* (2012); Dutka, *Misfortune on Cleveland's Millionaires' Row* (2015).
- The code is MIT licensed (see `LICENSE`). The license covers the code, not the historical images.
