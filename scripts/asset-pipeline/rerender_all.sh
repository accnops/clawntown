#!/bin/bash
set -e

# Assets are now stored directly in apps/web/public/assets
ASSETS_DIR="../../apps/web/public/assets"

echo "Re-rendering all assets with fixed lighting..."

# Core buildings
for model in "$ASSETS_DIR"/buildings/core/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name ==="
    python3 pipeline.py --model "$model" --name "${name}_sprite" --output-dir "$ASSETS_DIR/buildings/core"
done

# Commercial buildings
for model in "$ASSETS_DIR"/buildings/commercial/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name ==="
    python3 pipeline.py --model "$model" --name "${name}_sprite" --output-dir "$ASSETS_DIR/buildings/commercial"
done

# Residential buildings
for model in "$ASSETS_DIR"/buildings/residential/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name ==="
    python3 pipeline.py --model "$model" --name "${name}_sprite" --output-dir "$ASSETS_DIR/buildings/residential"
done

# Props (with soft lighting)
for model in "$ASSETS_DIR"/props/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name (soft lighting) ==="
    python3 pipeline.py --model "$model" --name "${name}_sprite" --output-dir "$ASSETS_DIR/props" --soft-lighting
done

echo "Done! Assets rendered directly to apps/web/public/assets/"
