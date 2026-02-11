#!/usr/bin/env python3
"""
Citizen Avatar Spinning Animation Pipeline
==========================================

Uses the same pipeline as council members:
1. Remove background with fal.ai birefnet
2. Convert to 3D with Tripo3D v2.5
3. Render spinning animation with Blender
4. Create GIF with proper transparency

Usage:
    python generate-citizen-spins.py
    python generate-citizen-spins.py --avatar citizen_crab_01
"""

import os
import sys
import argparse
import subprocess
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project root
env_path = Path(__file__).parent.parent.parent.parent.parent / ".env.local"
load_dotenv(env_path)

# Paths
SCRIPT_DIR = Path(__file__).parent
CANDIDATES_DIR = SCRIPT_DIR.parent.parent / "public" / "assets" / "citizens" / "candidates"
OUTPUT_DIR = SCRIPT_DIR.parent.parent / "public" / "assets" / "citizens"
WORK_DIR = OUTPUT_DIR / "work"


def step1_remove_background(input_path: Path, output_path: Path) -> Path:
    """Remove background using fal.ai birefnet."""
    print(f"\n{'='*60}")
    print("STEP 1: Remove Background")
    print("="*60)

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

    image_url = fal_client.upload_file(str(input_path))
    print(f"Uploaded to: {image_url}")

    result = fal_client.subscribe(
        "fal-ai/birefnet",
        arguments={"image_url": image_url},
        with_logs=True,
    )

    if result and "image" in result and "url" in result["image"]:
        import httpx
        response = httpx.get(result["image"]["url"])
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"Saved to: {output_path}")
        return output_path
    else:
        print(f"ERROR: Unexpected response: {result}")
        sys.exit(1)


def step1b_fill_holes_for_3d(input_path: Path, output_path: Path) -> Path:
    """
    Composite transparent image onto solid gray background for 3D conversion.
    This fills any holes (like white elements that birefnet incorrectly removed)
    so the 3D model doesn't have gaps.
    """
    print(f"\n{'='*60}")
    print("STEP 1b: Fill Holes for 3D Conversion")
    print("="*60)

    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed")
        sys.exit(1)

    img = Image.open(input_path).convert("RGBA")

    # Use a neutral gray background - not white (would blend with white objects)
    # and not too dark (would affect the 3D model coloring)
    background_color = (128, 128, 128, 255)  # Medium gray
    background = Image.new("RGBA", img.size, background_color)

    # Composite: character on gray background
    composite = Image.alpha_composite(background, img)

    # Save as PNG (keep RGB, no transparency needed for 3D conversion)
    composite.convert("RGB").save(output_path, "PNG")
    print(f"Saved composite for 3D: {output_path}")
    return output_path


def step2_convert_to_3d(image_path: Path, output_path: Path) -> Path:
    """Convert to 3D model using Tripo3D v2.5."""
    print(f"\n{'='*60}")
    print("STEP 2: Convert to 3D (Tripo3D)")
    print("="*60)

    try:
        import fal_client
    except ImportError:
        print("ERROR: fal-client not installed")
        sys.exit(1)

    fal_key = os.getenv("FAL_KEY")
    os.environ["FAL_KEY"] = fal_key

    image_url = fal_client.upload_file(str(image_path))
    print(f"Uploaded: {image_url}")

    # Use Tripo3D for consistent quality
    result = fal_client.subscribe(
        "tripo3d/tripo/v2.5/image-to-3d",
        arguments={"image_url": image_url},
        with_logs=True,
    )

    if result and "model_mesh" in result and "url" in result["model_mesh"]:
        import httpx
        response = httpx.get(result["model_mesh"]["url"])
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"Saved 3D model to: {output_path}")
        return output_path
    else:
        print(f"ERROR: Unexpected response: {result}")
        print(f"Keys: {result.keys() if result else 'None'}")
        sys.exit(1)


def step3_render_spinning(model_path: Path, output_dir: Path, num_frames: int = 36) -> list:
    """Render spinning frames using Blender - same setup as council members."""
    print(f"\n{'='*60}")
    print("STEP 3: Render Spinning Frames")
    print("="*60)

    blender_script = '''
import bpy
import sys
import math
import mathutils

argv = sys.argv
argv = argv[argv.index("--") + 1:]
model_path = argv[0]
output_dir = argv[1]
num_frames = int(argv[2])

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

if model_path.endswith('.glb') or model_path.endswith('.gltf'):
    bpy.ops.import_scene.gltf(filepath=model_path)

bpy.ops.object.select_all(action='SELECT')
objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']

if not objects:
    print("No mesh objects found!")
    sys.exit(1)

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

bpy.ops.object.empty_add(type='PLAIN_AXES', location=center)
pivot = bpy.context.object
pivot.name = "RotationPivot"

for obj in objects:
    obj.select_set(True)
    obj.parent = pivot

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = size * 1.8

distance = size * 3
camera.location = (center.x, center.y - distance, center.z)
camera.rotation_euler = (math.radians(90), 0, 0)
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type='SUN', location=(center.x, center.y - distance, center.z + size))
sun = bpy.context.object
sun.data.energy = 8.0
sun.rotation_euler = (math.radians(45), 0, 0)

bpy.ops.object.light_add(type='SUN', location=(center.x + size, center.y - distance/2, center.z))
fill = bpy.context.object
fill.data.energy = 4.0

world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Strength'].default_value = 1.0

scene = bpy.context.scene
scene.render.resolution_x = 128
scene.render.resolution_y = 128
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

for i in range(num_frames):
    angle = (i / num_frames) * 2 * math.pi
    pivot.rotation_euler = (0, 0, angle)
    frame_path = f"{output_dir}/frame_{i:03d}.png"
    scene.render.filepath = frame_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered frame {i+1}/{num_frames}")

print("Done!")
'''

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(blender_script)
        script_path = f.name

    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    try:
        blender_exe = "/Applications/Blender.app/Contents/MacOS/Blender"
        if not os.path.exists(blender_exe):
            blender_exe = "blender"

        cmd = [blender_exe, "--background", "--python", script_path,
               "--", str(model_path), str(frames_dir), str(num_frames)]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        print(result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout)
        if result.returncode != 0:
            print(f"Blender error: {result.stderr}")
            sys.exit(1)
    finally:
        os.unlink(script_path)

    return sorted(frames_dir.glob("frame_*.png"))


def step4_create_gif(frame_paths: list, output_path: Path, duration: int = 50) -> Path:
    """Create animated GIF from frames with proper transparency handling."""
    print(f"\n{'='*60}")
    print("STEP 4: Create GIF")
    print("="*60)

    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed. Run: pip install Pillow")
        sys.exit(1)

    processed_frames = []
    for f in frame_paths:
        img = Image.open(f).convert("RGBA")

        # Create a new image with transparent background
        # Convert alpha to 1-bit (fully transparent or fully opaque)
        alpha = img.split()[3]
        # Threshold: pixels with alpha > 128 are opaque, others transparent
        mask = alpha.point(lambda x: 255 if x > 128 else 0)

        # Create palette image with transparency
        # Use a unique color for transparency that's unlikely to appear in the image
        transparent_color = (0, 0, 0)

        # Composite onto a solid background first to remove semi-transparency
        background = Image.new("RGBA", img.size, transparent_color + (255,))
        composite = Image.alpha_composite(background, img)

        # Convert to palette mode
        p_img = composite.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=255)

        # Set transparency for pixels that were transparent in original
        # Find the palette index closest to our transparent color
        p_img.paste(0, mask=Image.eval(mask, lambda x: 255 - x))

        processed_frames.append(p_img)

    processed_frames[0].save(
        output_path,
        save_all=True,
        append_images=processed_frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
        transparency=0,
    )
    print(f"Saved GIF to: {output_path}")
    return output_path


def create_static_avatar(input_path: Path, output_path: Path, size: int = 128) -> Path:
    """Create static avatar at specified size."""
    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed")
        sys.exit(1)

    img = Image.open(input_path)
    img.thumbnail((size, size), Image.LANCZOS)

    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    result.paste(img, (x, y))

    result.save(output_path, 'PNG')
    print(f"Saved static avatar to: {output_path}")
    return output_path


def process_avatar(avatar_id: str, skip_existing: bool = False):
    """Process a single citizen avatar through the full pipeline."""
    print(f"\n{'#'*60}")
    print(f"Processing: {avatar_id}")
    print("#"*60)

    # Paths
    input_path = CANDIDATES_DIR / f"{avatar_id}.png"
    work_avatar_dir = WORK_DIR / avatar_id
    work_avatar_dir.mkdir(parents=True, exist_ok=True)

    clean_path = work_avatar_dir / "clean.png"
    model_path = work_avatar_dir / "model.glb"

    # Map avatar names: citizen_lobster_01 -> citizen_01, citizen_crab_01 -> citizen_09
    # Actually, let's keep the original names for now and figure out the mapping later
    output_name = avatar_id.replace("citizen_lobster_", "citizen_").replace("citizen_crab_", "citizen_crab_")
    static_path = OUTPUT_DIR / f"{output_name}.png"
    gif_path = OUTPUT_DIR / f"{output_name}_spin.gif"

    if not input_path.exists():
        print(f"ERROR: Input not found: {input_path}")
        return False

    if skip_existing and gif_path.exists():
        print(f"Skipping {avatar_id} - already exists")
        return True

    try:
        # Step 1: Remove background
        step1_remove_background(input_path, clean_path)

        # Step 2: Create static avatar
        create_static_avatar(clean_path, static_path, 128)

        # Step 3: Convert to 3D
        step2_convert_to_3d(clean_path, model_path)

        # Step 4: Render spinning frames
        frames = step3_render_spinning(model_path, work_avatar_dir, 36)

        # Step 5: Create GIF
        step4_create_gif(frames, gif_path, 50)

        print(f"\n{'='*60}")
        print(f"COMPLETE: {avatar_id}")
        print("="*60)
        print(f"Static: {static_path}")
        print(f"Spinning: {gif_path}")
        return True

    except Exception as e:
        print(f"ERROR processing {avatar_id}: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate Citizen Avatar Spinning Animations")
    parser.add_argument("--avatar", type=str, default=None,
                        help="Process only this avatar (e.g., citizen_crab_01)")
    parser.add_argument("--skip-existing", action="store_true",
                        help="Skip avatars that already have GIFs")
    parser.add_argument("--list", action="store_true",
                        help="List all candidate avatars")

    args = parser.parse_args()

    # Ensure directories exist
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Get all candidate avatars
    candidates = sorted([f.stem for f in CANDIDATES_DIR.glob("*.png")])

    if args.list:
        print("Candidate avatars:")
        for c in candidates:
            print(f"  {c}")
        return

    if args.avatar:
        if args.avatar not in candidates:
            print(f"ERROR: Unknown avatar '{args.avatar}'")
            print("Available:", candidates)
            sys.exit(1)
        process_avatar(args.avatar, args.skip_existing)
    else:
        # Process all
        success = 0
        failed = 0
        for avatar_id in candidates:
            if process_avatar(avatar_id, args.skip_existing):
                success += 1
            else:
                failed += 1

        print("\n" + "="*60)
        print("CITIZEN AVATAR PIPELINE COMPLETE")
        print("="*60)
        print(f"Success: {success}/{len(candidates)}")
        if failed > 0:
            print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
