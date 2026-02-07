#!/usr/bin/env python3
"""
Council Member Avatar Generation for Clawntown
===============================================

Generates avatar portraits for all 7 council members:
1. Generate 2D portrait with Gemini
2. Remove background with fal.ai
3. Convert to 3D with Tripo3D
4. Render spinning animation with Blender
5. Create GIF

Usage:
    python generate_council_avatars.py --output-dir ./output/council
    python generate_council_avatars.py --member mayor_clawrence
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

# Council member definitions with prompts
COUNCIL_MEMBERS = {
    "mayor_clawrence": {
        "name": "Mayor Clawrence",
        "prompt": """Generate a portrait of Mayor Clawrence, the distinguished leader of a coastal lobster town.

Character design:
- A noble, dignified lobster with a warm expression
- Wearing a formal mayoral sash and possibly a top hat or chain of office
- Red/orange lobster coloring with golden accents
- Exudes warmth and civic pride
- Clean, stylized cartoon/game character art style
- Portrait bust view (head and shoulders)
- White or light background
- Suitable for a game avatar/icon
- No text or words"""
    },
    "treasurer_sheldon": {
        "name": "Treasurer Sheldon",
        "prompt": """Generate a portrait of Treasurer Sheldon, a single lobster character who is a penny-pinching treasurer.

Character design:
- ONE lobster only, single character, portrait view
- A meticulous lobster wearing small round spectacles perched on his face
- Slightly suspicious/scrutinizing expression, very careful with money
- Red/orange lobster with formal vest or accountant attire
- NO props, NO coins, NO ledgers, NO objects - just the lobster character
- Clean, stylized cartoon/game character art style
- Portrait bust view showing head and upper body only
- Centered composition, plain white background
- Simple clean silhouette suitable for 3D conversion
- Suitable for a game avatar/icon
- No text, no words, no extra elements"""
    },
    "clerk_barnacle": {
        "name": "Clerk Barnacle",
        "prompt": """Generate a portrait of Clerk Barnacle, a single lobster character who is a meticulous record keeper.

Character design:
- ONE lobster only, single head, single character
- A proper, formal lobster wearing a clerk's visor
- Small barnacles decorating the shell as natural markings
- Holding a quill pen or papers
- Very proper, by-the-book expression
- Red/orange lobster with formal vest
- Clean, stylized cartoon/game character art style
- Portrait bust view showing ONE head and shoulders
- Centered composition, white background
- Suitable for a game avatar/icon
- No text, no words, no multiple characters"""
    },
    "harbormaster_pincers": {
        "name": "Harbormaster Pincers",
        "prompt": """Generate a portrait of Harbormaster Pincers, the salty sea captain of a coastal lobster town.

Character design:
- A weathered, experienced lobster sea captain
- Wearing a captain's hat or maritime cap
- Gruff but trustworthy expression, weather-beaten look
- Red/orange lobster with nautical attire (rope, anchor motifs)
- Clean, stylized cartoon/game character art style
- Portrait bust view (head and shoulders)
- White or light background
- Suitable for a game avatar/icon
- No text or words"""
    },
    "chef_bisque": {
        "name": "Chef Bisque",
        "prompt": """Generate a portrait of Chef Bisque, the passionate head chef of a coastal lobster town.

Character design:
- An expressive, dramatic lobster chef
- Wearing a tall white chef's hat (toque)
- Passionate, artistic expression with flair
- Red/orange lobster with chef's apron and maybe a ladle
- Clean, stylized cartoon/game character art style
- Portrait bust view (head and shoulders)
- White or light background
- Suitable for a game avatar/icon
- No text or words"""
    },
    "lighthouse_keeper_luna": {
        "name": "Lighthouse Keeper Luna",
        "prompt": """Generate a portrait of Lighthouse Keeper Luna, the mysterious lighthouse guardian of a coastal lobster town.

Character design:
- A mysterious, contemplative lobster with a slight ethereal glow
- Perhaps holding a lantern or with stars/moon motifs
- Wise, knowing expression with a touch of mystery
- Red/orange lobster with subtle blue/purple mystical accents
- Clean, stylized cartoon/game character art style
- Portrait bust view (head and shoulders)
- White or light background (maybe with subtle starry elements)
- Suitable for a game avatar/icon
- No text or words"""
    },
    "sheriff_snapper": {
        "name": "Sheriff Snapper",
        "prompt": """Generate a portrait of Sheriff Snapper, the gruff lawkeeper of a coastal lobster town.

Character design:
- A stern, no-nonsense lobster sheriff
- Wearing a sheriff's star badge and maybe a western-style hat
- Tough but fair expression, protective demeanor
- Red/orange lobster with law enforcement accents
- Clean, stylized cartoon/game character art style
- Portrait bust view (head and shoulders)
- White or light background
- Suitable for a game avatar/icon
- No text or words"""
    }
}


def step1_generate_portrait(member_id: str, output_path: Path) -> Path:
    """Generate portrait using Gemini."""
    print(f"\n{'='*60}")
    print(f"STEP 1: Generate Portrait for {member_id}")
    print("="*60)

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

    prompt = COUNCIL_MEMBERS[member_id]["prompt"]
    print(f"Generating portrait for {COUNCIL_MEMBERS[member_id]['name']}...")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=prompt,
        config={
            "response_modalities": ["image", "text"],
        }
    )

    for part in response.candidates[0].content.parts:
        if hasattr(part, 'inline_data') and part.inline_data:
            image_data = part.inline_data.data
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(image_data) if isinstance(image_data, str) else image_data)
            print(f"Saved portrait to: {output_path}")
            return output_path

    print("ERROR: No image in response")
    sys.exit(1)


def step2_remove_background(input_path: Path, output_path: Path) -> Path:
    """Remove background using fal.ai."""
    print(f"\n{'='*60}")
    print("STEP 2: Remove Background")
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


def step3_convert_to_3d(image_path: Path, output_path: Path) -> Path:
    """Convert to 3D model using Tripo3D."""
    print(f"\n{'='*60}")
    print("STEP 3: Convert to 3D")
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
        sys.exit(1)


def step4_render_spinning(model_path: Path, output_dir: Path, num_frames: int = 36) -> list:
    """Render spinning frames using Blender."""
    print(f"\n{'='*60}")
    print("STEP 4: Render Spinning Frames")
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


def step5_create_gif(frame_paths: list, output_path: Path, duration: int = 50) -> Path:
    """Create animated GIF from frames with proper transparency handling."""
    print(f"\n{'='*60}")
    print("STEP 5: Create GIF")
    print("="*60)

    try:
        from PIL import Image
    except ImportError:
        print("ERROR: Pillow not installed")
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


def generate_member(member_id: str, output_dir: Path, skip_generate: bool = False, rerender_only: bool = False):
    """Generate all assets for a council member."""
    member_dir = output_dir / member_id
    member_dir.mkdir(parents=True, exist_ok=True)

    concept_path = member_dir / "concept.png"
    clean_path = member_dir / "clean.png"
    model_path = member_dir / "model.glb"
    static_path = output_dir / f"{member_id}.png"
    gif_path = output_dir / f"{member_id}_spin.gif"

    if rerender_only:
        # Only re-render frames and create GIF from existing model
        if not model_path.exists():
            print(f"ERROR: No model found at {model_path}")
            sys.exit(1)
        print(f"Re-rendering {member_id} with brighter lighting...")
        frames = step4_render_spinning(model_path, member_dir, 36)
        step5_create_gif(frames, gif_path, 50)
        print(f"COMPLETE: {member_id} -> {gif_path}")
        return

    # Step 1: Generate portrait
    if skip_generate and concept_path.exists():
        print(f"Using existing concept: {concept_path}")
    else:
        step1_generate_portrait(member_id, concept_path)

    # Step 2: Remove background
    step2_remove_background(concept_path, clean_path)

    # Step 3: Create static avatar
    create_static_avatar(clean_path, static_path, 128)

    # Step 4: Convert to 3D
    step3_convert_to_3d(clean_path, model_path)

    # Step 5: Render spinning frames
    frames = step4_render_spinning(model_path, member_dir, 36)

    # Step 6: Create GIF
    step5_create_gif(frames, gif_path, 50)

    print(f"\n{'='*60}")
    print(f"COMPLETE: {member_id}")
    print("="*60)
    print(f"Static: {static_path}")
    print(f"Spinning: {gif_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate Council Member Avatars")
    parser.add_argument("--output-dir", type=str, default="./output/council",
                        help="Output directory")
    parser.add_argument("--member", type=str, default=None,
                        help="Generate only this member (e.g., mayor_clawrence)")
    parser.add_argument("--skip-generate", action="store_true",
                        help="Skip generation, use existing concept images")
    parser.add_argument("--rerender-only", action="store_true",
                        help="Only re-render GIFs from existing 3D models (faster)")
    parser.add_argument("--list", action="store_true",
                        help="List all council members")

    args = parser.parse_args()

    if args.list:
        print("Council Members:")
        for mid, info in COUNCIL_MEMBERS.items():
            print(f"  {mid}: {info['name']}")
        return

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.member:
        if args.member not in COUNCIL_MEMBERS:
            print(f"ERROR: Unknown member '{args.member}'")
            print("Available:", list(COUNCIL_MEMBERS.keys()))
            sys.exit(1)
        generate_member(args.member, output_dir, args.skip_generate, args.rerender_only)
    else:
        # Generate all members
        for member_id in COUNCIL_MEMBERS:
            generate_member(member_id, output_dir, args.skip_generate, args.rerender_only)

    print("\n" + "="*60)
    print("ALL COUNCIL AVATARS COMPLETE")
    print("="*60)
    print(f"\nCopy to web app:")
    print(f"  cp {output_dir}/*.png apps/web/public/assets/council/")
    print(f"  cp {output_dir}/*_spin.gif apps/web/public/assets/council/")


if __name__ == "__main__":
    main()
