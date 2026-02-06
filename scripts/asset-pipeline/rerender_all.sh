#!/bin/bash
set -e

echo "Re-rendering all assets with fixed lighting..."

# Core buildings
for model in output/buildings/core/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name ==="
    python3 pipeline.py --model "$model" --name "${name}" --output-dir output/buildings/core
done

# Commercial buildings
for model in output/buildings/commercial/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name ==="
    python3 pipeline.py --model "$model" --name "${name}" --output-dir output/buildings/commercial
done

# Residential buildings
for model in output/buildings/residential/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name ==="
    python3 pipeline.py --model "$model" --name "${name}" --output-dir output/buildings/residential
done

# Props (with soft lighting)
for model in output/props/*.glb; do
    name=$(basename "$model" .glb)
    echo "=== Rendering $name (soft lighting) ==="
    python3 pipeline.py --model "$model" --name "${name}" --output-dir output/props --soft-lighting
done

echo "Done! Now copy to public:"
echo "  cp output/buildings/core/*_sprite_*.png ../../apps/web/public/assets/buildings/core/"
echo "  cp output/buildings/commercial/*_sprite_*.png ../../apps/web/public/assets/buildings/commercial/"
echo "  cp output/buildings/residential/*_sprite_*.png ../../apps/web/public/assets/buildings/residential/"
echo "  cp output/props/*_sprite_*.png ../../apps/web/public/assets/props/"
