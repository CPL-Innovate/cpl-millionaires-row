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

- **Map mode:** the 1881 Hopkins Plates 3 and 5, georeferenced into one north-up map. Pick a house
  or a station to descend.
- **Street mode:** drag to look, WASD or the arrow keys to walk, shift to hurry. Numbered pins are
  sourced story beats.
- **Stations:** at each matched view, the CPL photograph inks in over the scene. The
  **Photograph** slider fades between photo and drawing. *Everett, from the NE* shows the side no
  photograph records; push **Evidence** to see what the model invented.
- **Palettes:** Graphite, Sepia ink, Cyanotype.
- **Painterly / 1888:** Painterly (the default) is the impression, tuned for the eye: autumn
  crowns, mounded lawns, bright accents. 1888 is calibrated to the archive: nearly every photograph
  of that autumn shows bare-branched elms, so the crowns are near-bare and turned, the lawns mown
  and leaf-strewn, with no pink or lavender flecks. 1888 is a layer over Painterly
  (`ERA_1888` in `settings/schema.ts`), and the Generator edits whichever one is showing.
- **Everett house looks** (experimental, Everett only for now):
  - **Pencil:** the drawing described above.
  - **Watercolour:** the model's texture, painted. It keeps the texture's detail and values, pulls
    the colour toward the palette's earths, lays washes with wet edges, leaves paper white where
    the sun lands, lets the base bleed into the lawn, and keeps pencil hatching in the shadows.
  - **Texture:** the Tripo texture as generated, lit by the scene's sun, with a normal map.
  - Switching looks blotches the new one in with the same noise as the street reveal. In every
    look, **Evidence** drains the (inferred) colour and fades the invented faces.
- **Generator** ("Tune the generator", or `?gen`): every generative parameter (motion, paint,
  ground, planting, tree form, foliage, colour ramps).
  - Unmarked sliders change instantly; ↻ sliders regrow the scene once you stop dragging.
  - Settings autosave in the browser. You can save named presets and export or import JSON.
  - In dev, **Save as project default** writes `public/settings.json`, which every build loads as
    its starting look.
- **Sound** (off until turned on; browsers need a click first):
  - Background loops for the street, a distant 1880s city and the wind. 1888 gets wind in bare
    elms, Painterly a leafy rustle. Map mode is a hushed reading room.
  - In the scene: Brush's windmill and the nearest gas lamp get louder as you approach.
    Carriages trot past along Euclid, and crows call from the trees (more of them in 1888).
  - Footsteps match what you're walking on: roadway, flagstone or lawn.
  - Story beats have their own sounds. At St. Paul's, or with "The silent bells" open, the street
    falls quiet and a single bell answers from far across the city.
  - Interface sounds: pencil and paper as the street draws itself, a shimmer as the dots gather,
    the photo developing, and a card tap on buttons.
  - The sounds are generated with ElevenLabs from the prompts in `docs/sound-brief.md`
    (`scripts/sounds.json`). `ELEVENLABS_API_KEY=… node scripts/gen-sounds.mjs tier1|tier2|all`
    fills in missing files, so delete a file and re-run it to re-roll that sound. Then run
    `python3 scripts/normalize-audio.py` to level everything to −20 LUFS. The mix is set in
    `src/audio/engine.ts`.
- **Performance:** Full or Light (fewer, larger bark and ground dots at 1× pixel density; the
  default on touch devices). **Show frame rate** (or `?fps`) puts frame time, point count and
  draw calls at the top of the screen.
- **Deep links:** `?station=everett&palette=sepia&evidence=0.6&look=wash&era=1888&gen` (`look` is
  `pencil`, `wash` or `texture`; `era` is `painterly` or `1888`)

## How it's built

React + TypeScript + Vite + Three.js via React Three Fiber. GSAP handles transitions. There is no
backend, and everything runs in the browser.

```
src/
  App.tsx               UI shell: panels, stations, cards, deep links
  palettes.ts           Graphite / Sepia / Cyanotype: pencil, paper, foliage + earth colour ramps
  data/site.ts          Buildings (positions, provenance ledgers, sources), stations, story beats
  gl/uniforms.ts        Shared shader uniforms (palette, evidence, reveal, live generator params)
  gl/materials.ts       Shaders: pencil hatching, plate/ground, photo ghost, pointillist dots
  gl/geometry.ts        Massing volumes, tree generator, windmill
  scene/World.tsx       Scene assembly: ground, buildings, trees, street kit, ground dots
  scene/CameraRig.tsx   Map ↔ street transitions, walking, station moves
  scene/Overlays.tsx    Photo ghosts, story pins, map labels
  settings/             Generator schema + store (autosave, presets, project defaults)
  ui/GeneratorPanel.tsx The Generator drawer
scripts/
  compose_plate.py      Georeferences Plates 3 + 5 into public/plates/euclid-case-1881.jpg
  strip-everett.mjs     Slims the Everett spike mesh (drops unused PBR maps)
  everett-maps.mjs      Extracts 2k colour + normal maps for the Watercolour and Texture looks
public/
  plates/  img/  models/
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
- Every house except Everett is a typology-level massing block (inferred), not a reconstruction.
- The Everett mesh is reconstruction spike A1: image-to-3D from a cleaned copy of CPL photo 62. It
  has been decimated to about 85k triangles. Its north and east faces are invented by the model.
  Per-face provenance comes from an object-space normal heuristic, not from a per-face ledger.
- The Everett texture is generated by Tripo from black-and-white photographs. Its colour and fine
  detail are AI-inferred everywhere, and on the invented faces it looks exactly as convincing as on
  the photographed front.
- Station camera positions are eyeballed. fSpy camera solves are pending.
- The environment (planting, lawns, colours) is an impression, not evidence. The current default
  look is painterly, not historically calibrated (see Next steps).
- Performance: on an Apple M2 Pro at 2× pixel density, Full holds the display's 120 fps cap
  (8.4 ms a frame, 95th percentile 10 ms) with about 1.5M points, 60% of them bark. Light draws
  about 880k points at 1× and is the default on touch devices. Phones and Quest headsets are
  still unmeasured.

## Next steps (pinned)

In priority order, from the last review:

1. **Bring the buildings into the painting while keeping them as drawings.**
   - Contact dots and foundation planting where each wall meets the ground. *(Everett done; the
     massing blocks still need them.)*
   - Everett now has Watercolour and Texture looks to compare against Pencil. Proposed next: a
     "Provenance" look that picks the treatment per face (texture where photographed, watercolour
     where inferred, pencil where invented).
   - Pencil window grids, string courses and cornices on the massing (marked inferred).
   - An optional inferred-colour wash on the walls (sandstone, brick).
2. ~~An "1888" preset alongside a "Painterly" one.~~ Done: Painterly is the default, 1888 the
   toggle. Still worth calibrating 1888's colours against the photographs with L&GH.
3. ~~Dots gathering on arrival, and station photos dissolving in at their edges.~~ Done.
4. ~~A frame-rate counter and a "light" preset.~~ Done (`?fps`, Performance → Light). Next:
   measure on a phone.
5. ~~Sound.~~ First pass in: 30 generated sounds, needing a listening pass to re-roll weak takes.
6. Later: the winter sleigh-race moment (a Generator preset, plus the winter sounds in the brief),
   and figures and carriages drawn in dots.

## Dev-only helpers

- `?raf=timeout` keeps animation ticking in a hidden or background preview pane.
- `?shots=1` speeds up transitions for headless screenshots.
- `SNAP_DIR=… npm run dev` enables `POST /__snap?name=x`, which writes the canvas to `x.png`.
- `POST /__settings` is used by the Generator's **Save as project default**.

## Sources and rights

- Historical photographs and plat plates are from the **Cleveland Public Library Digital Gallery**
  (ContentDM pointers are in `src/data/site.ts`). They are pre-1931 and public domain. Please
  credit Cleveland Public Library when reusing them.
- Story beats cite Wilson, *Famous Old Euclid Avenue*; Ruminski & Dutka, *Cleveland in the Gilded
  Age* (2012); Dutka, *Misfortune on Cleveland's Millionaires' Row* (2015).
- The code is MIT licensed (see `LICENSE`). The license covers the code, not the historical images.
