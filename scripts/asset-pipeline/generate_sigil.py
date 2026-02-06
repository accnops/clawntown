#!/usr/bin/env python3
"""
Sigil Generation Script for Clawntawn
======================================

Generates:
1. Static sigil PNG (town crest/emblem)
2. Spinning sigil GIF (medallion rotating on vertical axis)

Usage:
    python generate_sigil.py --output-dir ./output/sigil
"""

import os
import sys
import argparse
import base64
import subprocess
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project root
env_path = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_path)


def generate_sigil_concept(output_path: Path) -> Path:
    """Generate the sigil concept art using Gemini."""
    print("\n" + "=" * 60)
    print("STEP 1: Generate Sigil Concept (Gemini)")
    print("=" * 60)

    try:
        from google import genai
    except ImportError:
        print("ERROR: google-genai not installed. Run: pip install google-genai")
        sys.exit(1)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set in .env.local")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    prompt = """Generate a heraldic shield coat of arms for a coastal lobster fishing town.

Design requirements:
- Classic pointed heraldic shield shape (like a medieval knight's shield)
- Central motif: a stylized red lobster facing upward
- DO NOT include any text, words, letters, dates, years, or banners with writing
- NO TEXT AT ALL - pure visual imagery only
- Nautical elements: waves at the bottom, rope patterns, or anchor motifs
- Color palette: deep red, gold/bronze, navy blue, cream/white
- Traditional heraldic style like a family crest or town coat of arms
- Clean vector-style art suitable for a logo
- White or transparent background
- Front-facing flat view (no 3D perspective)
- High contrast, bold lines
- Should look good at small sizes (icon) and large sizes
- The shield should have a slight 3D bevel/border effect
- Keep the design contained within the shield outline"""

    print("Generating sigil...")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config={
            "response_modalities": ["image", "text"],
        }
    )

    # Extract image from response
    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data:
            image_data = part.inline_data.data
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(image_data) if isinstance(image_data, str) else image_data)
            print(f"Saved sigil to: {output_path}")
            return output_path

    print("ERROR: No image in response")
    sys.exit(1)


def convert_to_3d(image_path: Path, output_path: Path) -> Path:
    """Convert 2D sigil to 3D model using Tripo3D via fal.ai."""
    print("\n" + "=" * 60)
    print("Converting to 3D Model (Tripo3D via fal.ai)")
    print("=" * 60)

    try:
        import fal_client
    except ImportError:
        print("ERROR: fal-client not installed. Run: pip install fal-client")
        sys.exit(1)

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        print("ERROR: FAL_KEY not set in .env.local")
        sys.exit(1)

    os.environ["FAL_KEY"] = fal_key

    print(f"Input image: {image_path}")
    print("Uploading and converting to 3D...")

    # Upload the image
    image_url = fal_client.upload_file(str(image_path))
    print(f"Uploaded to: {image_url}")

    # Call Tripo3D v2.5
    result = fal_client.subscribe(
        "tripo3d/tripo/v2.5/image-to-3d",
        arguments={
            "image_url": image_url,
        },
        with_logs=True,
    )

    print(f"Result: {result}")

    # Download the GLB file
    if result and "model_mesh" in result and "url" in result["model_mesh"]:
        model_url = result["model_mesh"]["url"]
        print(f"Downloading model from: {model_url}")

        import httpx
        response = httpx.get(model_url)
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"Saved 3D model to: {output_path}")
        return output_path
    else:
        print(f"ERROR: Unexpected response format: {result}")
        sys.exit(1)


def render_spinning_sigil(model_path: Path, output_dir: Path, num_frames: int = 36) -> list:
    """Render multiple frames of the 3D sigil model spinning using Blender."""
    print("\n" + "=" * 60)
    print("Render Spinning Frames (Blender)")
    print("=" * 60)

    blender_script = '''
import bpy
import sys
import math
import mathutils

# Get command line arguments
argv = sys.argv
argv = argv[argv.index("--") + 1:]
model_path = argv[0]
output_dir = argv[1]
num_frames = int(argv[2])

# Clear default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import the 3D model
print(f"Importing model: {model_path}")
if model_path.endswith('.glb') or model_path.endswith('.gltf'):
    bpy.ops.import_scene.gltf(filepath=model_path)
else:
    print(f"Unsupported format: {model_path}")
    sys.exit(1)

# Select all imported objects and get bounding box
bpy.ops.object.select_all(action='SELECT')
objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']

if not objects:
    print("No mesh objects found!")
    sys.exit(1)

print(f"Found {len(objects)} mesh objects")

# Calculate scene bounds
min_coord = [float('inf')] * 3
max_coord = [float('-inf')] * 3

for obj in objects:
    for vertex in obj.bound_box:
        world_vertex = obj.matrix_world @ mathutils.Vector(vertex)
        for i in range(3):
            min_coord[i] = min(min_coord[i], world_vertex[i])
            max_coord[i] = max(max_coord[i], world_vertex[i])

center = mathutils.Vector([(min_coord[i] + max_coord[i]) / 2 for i in range(3)])
size = max(max_coord[i] - min_coord[i] for i in range(3))
print(f"Center: {center}, Size: {size}")

# Create an empty at the center to parent all objects and rotate
bpy.ops.object.empty_add(type='PLAIN_AXES', location=center)
pivot = bpy.context.object
pivot.name = "RotationPivot"

# Parent all mesh objects to the pivot
for obj in objects:
    obj.select_set(True)
    obj.parent = pivot

# Set up camera
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = size * 1.8

# Position camera to look at the model from the front
distance = size * 3
camera.location = (center.x, center.y - distance, center.z)
camera.rotation_euler = (math.radians(90), 0, 0)

bpy.context.scene.camera = camera

# Lighting
bpy.ops.object.light_add(type='SUN', location=(center.x, center.y - distance, center.z + size))
sun = bpy.context.object
sun.data.energy = 4.0
sun.rotation_euler = (math.radians(45), 0, 0)

bpy.ops.object.light_add(type='SUN', location=(center.x + size, center.y - distance/2, center.z))
fill = bpy.context.object
fill.data.energy = 2.0

bpy.ops.object.light_add(type='SUN', location=(center.x - size, center.y - distance/2, center.z))
fill2 = bpy.context.object
fill2.data.energy = 1.5

# Set up world (transparent background)
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Strength'].default_value = 0.5

# Render settings
scene = bpy.context.scene
scene.render.resolution_x = 256
scene.render.resolution_y = 256
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# Render spinning frames - model rotates around vertical (Z) axis
for i in range(num_frames):
    angle = (i / num_frames) * 2 * math.pi
    pivot.rotation_euler = (0, 0, angle)

    frame_path = f"{output_dir}/frame_{i:03d}.png"
    scene.render.filepath = frame_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered frame {i+1}/{num_frames}")

print("Done rendering frames!")
'''

    # Write the Blender script
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(blender_script)
        script_path = f.name

    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    print(f"Model: {model_path}")
    print(f"Frames dir: {frames_dir}")
    print(f"Num frames: {num_frames}")

    try:
        blender_exe = "/Applications/Blender.app/Contents/MacOS/Blender"
        if not os.path.exists(blender_exe):
            blender_exe = "blender"

        cmd = [
            blender_exe,
            "--background",
            "--python", script_path,
            "--", str(model_path), str(frames_dir), str(num_frames)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        print(result.stdout)
        if result.returncode != 0:
            print(f"Blender stderr: {result.stderr}")
            sys.exit(1)

    finally:
        os.unlink(script_path)

    # Return list of frame paths
    frames = sorted(frames_dir.glob("frame_*.png"))
    print(f"Rendered {len(frames)} frames")
    return frames


def create_gif(frame_paths: list, output_path: Path, duration: int = 50) -> Path:
    """Combine frames into an animated GIF."""
    print("\n" + "=" * 60)
    print("STEP 6: Create Animated GIF")
    print("=" * 60)

    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed. Run: pip install Pillow")
        sys.exit(1)

    frames = [Image.open(f) for f in frame_paths]

    # Save as GIF
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,  # ms per frame
        loop=0,  # infinite loop
        disposal=2,  # clear frame before next
    )

    print(f"Saved GIF to: {output_path}")
    return output_path


def remove_background(input_path: Path, output_path: Path) -> Path:
    """Remove background from image using fal.ai's background removal model."""
    print("\n" + "=" * 60)
    print("Removing Background (fal.ai)")
    print("=" * 60)

    try:
        import fal_client
    except ImportError:
        print("ERROR: fal-client not installed. Run: pip install fal-client")
        sys.exit(1)

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        print("ERROR: FAL_KEY not set in .env.local")
        sys.exit(1)

    os.environ["FAL_KEY"] = fal_key

    print(f"Input image: {input_path}")
    print("Uploading and removing background...")

    # Upload the image
    image_url = fal_client.upload_file(str(input_path))
    print(f"Uploaded to: {image_url}")

    # Call background removal model
    result = fal_client.subscribe(
        "fal-ai/birefnet",  # High-quality background removal
        arguments={
            "image_url": image_url,
        },
        with_logs=True,
    )

    print(f"Result: {result}")

    # Download the result
    if result and "image" in result and "url" in result["image"]:
        result_url = result["image"]["url"]
        print(f"Downloading from: {result_url}")

        import httpx
        response = httpx.get(result_url)
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"Saved background-removed sigil to: {output_path}")
        return output_path
    else:
        print(f"ERROR: Unexpected response format: {result}")
        sys.exit(1)


def create_static_sigil(sigil_path: Path, output_path: Path, size: int = 256) -> Path:
    """Create a clean static version of the sigil at specified size."""
    print("\n" + "=" * 60)
    print("Creating Static Sigil")
    print("=" * 60)

    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed. Run: pip install Pillow")
        sys.exit(1)

    img = Image.open(sigil_path)

    # Resize to target size, maintaining aspect ratio
    img.thumbnail((size, size), Image.LANCZOS)

    # Create new image with transparent background at exact size
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    # Paste centered
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    result.paste(img, (x, y))

    result.save(output_path, 'PNG')
    print(f"Saved static sigil to: {output_path}")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Sigil Generation for Clawntawn")
    parser.add_argument("--output-dir", type=str, default="./output/sigil", help="Output directory")
    parser.add_argument("--skip-generate", action="store_true", help="Skip generation, use existing sigil_concept.png")
    parser.add_argument("--frames", type=int, default=36, help="Number of frames for spinning animation")

    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    concept_path = output_dir / "sigil_concept.png"
    clean_path = output_dir / "sigil_clean.png"
    model_path = output_dir / "sigil.glb"

    # Step 1: Generate sigil concept
    if args.skip_generate and concept_path.exists():
        print(f"Using existing sigil: {concept_path}")
    else:
        generate_sigil_concept(concept_path)

    # Step 2: Remove background
    remove_background(concept_path, clean_path)

    # Step 3: Create static versions at different sizes (from clean version)
    create_static_sigil(clean_path, output_dir / "sigil_256.png", 256)
    create_static_sigil(clean_path, output_dir / "sigil_128.png", 128)
    create_static_sigil(clean_path, output_dir / "sigil_64.png", 64)
    create_static_sigil(clean_path, output_dir / "sigil_32.png", 32)

    # Step 4: Convert to 3D model
    convert_to_3d(clean_path, model_path)

    # Step 5: Render spinning frames from 3D model
    frames = render_spinning_sigil(model_path, output_dir, args.frames)

    # Step 6: Create GIF
    gif_path = output_dir / "sigil_spin.gif"
    create_gif(frames, gif_path, duration=50)

    print("\n" + "=" * 60)
    print("SIGIL GENERATION COMPLETE")
    print("=" * 60)
    print(f"Concept:     {concept_path}")
    print(f"Static 256:  {output_dir / 'sigil_256.png'}")
    print(f"Static 128:  {output_dir / 'sigil_128.png'}")
    print(f"Static 64:   {output_dir / 'sigil_64.png'}")
    print(f"Static 32:   {output_dir / 'sigil_32.png'}")
    print(f"Spinning:    {gif_path}")
    print("\nCopy to web app:")
    print(f"  cp {output_dir}/sigil_*.png apps/web/public/assets/ui/")
    print(f"  cp {gif_path} apps/web/public/assets/ui/")


if __name__ == "__main__":
    main()
