# Clawntawn Asset Manifest

All assets generated from scratch using AI pipeline (not using pogicity assets due to license).

## Pipeline Configuration
- **Concept Art**: Nano Banana Pro (gemini-3-pro-image-preview)
- **3D Conversion**: Tripo3D via fal.ai (tripo3d/tripo/v2.5/image-to-3d)
- **Rendering**: Blender 5.0.1 (EEVEE, orthographic isometric, 512x512)
- **Lighting**: Sun 4.5, Fill 1.2, Ambient 0.5
- **Tiles**: Gemini direct → isometric transform (rotate 45°, scale Y 50%)

---

## Buildings

### Core Buildings

| Asset | Prompt | Orient. |
|-------|--------|---------|
| town_hall | "A charming town hall building with a clock tower, colonial style architecture, warm brick facade" | 0° |
| lighthouse | "A tall coastal lighthouse with red and white stripes, traditional design with a light beacon on top, rocky base" | 0° |
| forum | "A cozy community forum building with a notice board outside, wooden construction, welcoming porch with benches" | 0° |
| project_board | "A project planning board building, modern office style with large windows, whiteboard visible inside, startup vibe" | 0° |
| lobster_dock | "A rustic lobster dock with wooden pier, lobster traps stacked, small fishing shack, nautical decorations" | 270° |
| lobster_restaurant | "A cozy lobster restaurant with red roof" | 0° |
| boat | "A charming wooden fishing boat, lobster boat style, red and blue colors, small cabin, nets and buoys" | 270° |

### Residential Buildings

| Asset | Prompt | Orient. |
|-------|--------|---------|
| fishermans_cottage | "A small cozy fisherman's cottage, weathered wood siding, blue shutters, red door, fishing nets hanging outside, chimney with smoke, coastal New England style" | 0° |
| beach_house | "A colorful beach house on stilts, pastel blue and white, large windows, wraparound porch, beach umbrella nearby, coastal vacation home style" | 0° |

### Commercial Buildings

| Asset | Prompt | Orient. |
|-------|--------|---------|
| bait_tackle_shop | "A rustic bait and tackle shop, weathered wooden building, fishing rods displayed outside, bait buckets, hand-painted signs, fishing nets on walls" | 0° |
| fish_market | "A small open-air fish market stall, wooden structure with canvas awning, fresh fish on ice display, hanging scales, crates of seafood" | 0° |
| general_store | "A quaint general store, clapboard siding, large front window display, striped awning, barrels outside, old-fashioned country store style" | 0° |
| arcade | "A retro arcade building for a lobster beach town, purple neon lights, claw machine visible through window, pixel art style, coastal themed" | 0° |

---

## Props

| Asset | Prompt |
|-------|--------|
| coastal_pine | "A windswept coastal pine tree, bent from ocean winds, rugged bark, sparse needles, rocky base, isolated tree on cliff" |
| lobster_traps | "A stack of traditional wooden lobster traps, rope handles, rectangular wire mesh cages, weathered wood slats, three traps stacked" |
| wooden_bench | "A rustic wooden bench, weathered gray wood, simple plank design, coastal style, sits two people, slightly worn" |
| fishing_buoy | "A colorful fishing buoy, red and white striped, spherical float with rope attached, maritime decoration" |

---

## Tiles

Generated as flat square textures, then transformed to isometric (rotate 45°, scale Y 50%).

| Asset | Prompt | Files |
|-------|--------|-------|
| sand_tile | "Sandy beach texture, light tan sand with subtle ripples, small pebbles and shells scattered" | `.png`, `_iso.png` |
| water_tile | "Ocean water surface, blue-green water with gentle ripple patterns, stylized game texture" | `.png`, `_iso.png` |
| grass_tile | "Green grass texture, lush lawn with varied grass blades, some small flowers, stylized game look" | `.png`, `_iso.png` |
| dock_planks_tile | "Wooden dock planks, weathered gray-brown boards with wood grain, gaps between planks" | `.png`, `_iso.png` |
| cobblestone_tile | "Cobblestone path, rounded gray stones fitted together, moss in cracks, old village style" | `.png`, `_iso.png` |

---

## File Structure

Assets are stored directly in the web app public folder:

```
apps/web/public/assets/
├── buildings/
│   ├── core/           # 7 buildings (town_hall, lighthouse, etc.)
│   │   ├── *_concept.png    # Concept art from Gemini
│   │   ├── *.glb            # 3D models from Tripo3D
│   │   └── *_sprite_*.png   # Rendered sprites (0, 90, 180, 270)
│   ├── residential/    # 2 buildings (fishermans_cottage, beach_house)
│   └── commercial/     # 4 buildings (bait_tackle_shop, fish_market, general_store, arcade)
├── props/              # 4 props (coastal_pine, lobster_traps, wooden_bench, fishing_buoy)
├── tiles/              # 5 tiles (sand, water, grass, dock_planks, cobblestone)
│   ├── *_tile.png      # Flat square textures
│   ├── *_tile_iso.png  # Isometric diamond transforms
│   └── *_tile_cube.png # 3D cube renders
├── council/            # Council member avatars
│   ├── *.png           # Static portraits
│   ├── *_spin.gif      # Animated versions
│   └── */              # Source frames for animations
└── ui/                 # UI elements
    ├── sigil_*.png     # Town sigil at various sizes
    ├── sigil_spin.gif  # Animated sigil
    └── sigil.glb       # 3D sigil model
```

---

## Assets Still Needed

### Props
- anchor, barrel, crate, fishing_net, seagull, dinghy

### Landmarks
- bell_tower, harbor_master, old_pier, shipwreck

---

## Generation Commands

```bash
# Building (full pipeline) - outputs directly to apps/web/public/assets
python3 pipeline.py --prompt "description" --name asset_name --output-dir ../../apps/web/public/assets/buildings/category

# Tile (Gemini + isometric transform)
python3 pipeline.py --tile --prompt "description" --name tile_name --output-dir ../../apps/web/public/assets/tiles

# Re-render existing model
python3 pipeline.py --model ../../apps/web/public/assets/buildings/category/model.glb --name asset_name --output-dir ../../apps/web/public/assets/buildings/category

# Re-render all assets
./rerender_all.sh
```
