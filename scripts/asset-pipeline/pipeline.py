#!/usr/bin/env python3
"""
Asset Generation Pipeline for Clawntawn
========================================

Pipeline steps:
1. Generate concept art with Nano Banana Pro (Gemini 3 Pro Image)
2. Convert to 3D with Tripo3D via fal.ai
3. Render isometric sprite with Blender (headless)

Usage:
    python pipeline.py --prompt "A cozy lobster restaurant with red roof"
    python pipeline.py --image input.png  # Skip step 1, use existing image
"""

import os
import sys
import time
import argparse
import base64
import subprocess
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project root
env_path = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_path)


def step1_generate_concept(prompt: str, output_path: Path) -> Path:
    """Generate concept art using Nano Banana Pro (Gemini 3 Pro Image)."""
    print("\n" + "=" * 60)
    print("STEP 1: Generate Concept Art (Nano Banana Pro)")
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

    # Enhance prompt for isometric building generation
    enhanced_prompt = f"""Generate an isometric view of: {prompt}

Style requirements:
- Clean isometric/3/4 view angle
- Simple, stylized architectural design suitable for a game
- Solid colors, minimal texture detail
- White or light background
- Single building, no environment
- Suitable for conversion to 3D model"""

    print(f"Prompt: {enhanced_prompt[:100]}...")
    print("Generating image...")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",  # Nano Banana Pro
        contents=enhanced_prompt,
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
            print(f"Saved concept art to: {output_path}")
            return output_path

    print("ERROR: No image in response")
    print(f"Response: {response}")
    sys.exit(1)


def step2_convert_to_3d(image_path: Path, output_path: Path) -> Path:
    """Convert 2D image to 3D model using Tripo3D via fal.ai."""
    print("\n" + "=" * 60)
    print("STEP 2: Convert to 3D (Tripo3D via fal.ai)")
    print("=" * 60)

    try:
        import fal_client
    except ImportError:
        print("ERROR: fal-client not installed. Run: pip install fal-client")
        sys.exit(1)

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        print("ERROR: FAL_KEY not set in .env.local")
        print("Get your key from: https://fal.ai/dashboard/keys")
        sys.exit(1)

    os.environ["FAL_KEY"] = fal_key

    print(f"Input image: {image_path}")
    print("Uploading and converting to 3D...")

    # Upload the image first
    image_url = fal_client.upload_file(str(image_path))
    print(f"Uploaded to: {image_url}")

    # Call Tripo3D
    result = fal_client.subscribe(
        "tripo3d/tripo/v2.5/image-to-3d",
        arguments={
            "image_url": image_url,
            "texture": "standard",  # "no", "standard", or "HD"
        },
        with_logs=True,
    )

    print(f"Result: {result}")

    # Download the GLB file (check both "model" and "model_mesh" keys)
    model_data = result.get("model") or result.get("model_mesh")
    if model_data and "url" in model_data:
        model_url = model_data["url"]
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


def step3_render_isometric(model_path: Path, output_path: Path, orientation: int = None, soft_lighting: bool = False) -> Path:
    """Render isometric sprite from 3D model using Blender."""
    print("\n" + "=" * 60)
    print("STEP 3: Render Isometric Sprite (Blender)")
    if soft_lighting:
        print("Using SOFT LIGHTING (even illumination for props)")
    print("=" * 60)

    # Create Blender Python script for rendering
    blender_script = '''
import bpy
import sys
import math
import mathutils

# Get command line arguments after "--"
argv = sys.argv
argv = argv[argv.index("--") + 1:]
model_path = argv[0]
output_path = argv[1]

# Clear default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import the model
if model_path.endswith('.glb') or model_path.endswith('.gltf'):
    bpy.ops.import_scene.gltf(filepath=model_path)
elif model_path.endswith('.obj'):
    bpy.ops.wm.obj_import(filepath=model_path)
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

# Create an empty at the center for camera to track
bpy.ops.object.empty_add(type='PLAIN_AXES', location=center)
target = bpy.context.object
target.name = "CameraTarget"

# Create orthographic camera for isometric view
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = size * 1.5

# Add track-to constraint so camera always looks at center
track = camera.constraints.new(type='TRACK_TO')
track.target = target
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'

bpy.context.scene.camera = camera

# Lighting settings - check for soft lighting mode (last argument)
soft_lighting = argv[-1] == 'soft'

if soft_lighting:
    # SOFT LIGHTING - more even illumination for trees/props
    sun_energy = 5.0      # Lower key light
    fill_energy = 4.0     # Higher fill light (almost equal to key)
    ambient_strength = 1.2  # Higher ambient
else:
    # STANDARD LIGHTING - more contrast for buildings
    sun_energy = 8.0
    fill_energy = 2.5
    ambient_strength = 0.8

# Add lighting - main sun
bpy.ops.object.light_add(type='SUN', location=(10, -10, 10))
sun = bpy.context.object
sun.data.energy = sun_energy
sun.rotation_euler = (math.radians(45), math.radians(-15), math.radians(30))

# Add fill light from opposite side
bpy.ops.object.light_add(type='SUN', location=(-10, 10, 5))
fill = bpy.context.object
fill.data.energy = fill_energy
fill.rotation_euler = (math.radians(60), math.radians(15), math.radians(-150))

# Set up world ambient lighting
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Strength'].default_value = ambient_strength

# Set up render settings
scene = bpy.context.scene
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# Render orientations (isometric views from different corners)
distance = size * 2
iso_elevation = math.radians(35.264)  # True isometric angle
# Check for single orientation argument (must be a number, not "soft"/"normal")
if len(argv) > 2 and argv[2].isdigit():
    orientations = [int(argv[2])]
else:
    orientations = [0, 90, 180, 270]
base_output = output_path.replace('.png', '')

for angle in orientations:
    # Position camera at isometric angle, rotating around Z axis
    rad = math.radians(45 + angle)  # 45° offset for corner view
    camera.location = (
        center.x + distance * math.cos(rad) * math.cos(iso_elevation),
        center.y + distance * math.sin(rad) * math.cos(iso_elevation),
        center.z + distance * math.sin(iso_elevation)
    )

    # Set output path for this orientation
    render_path = f"{base_output}_{angle}.png"
    scene.render.filepath = render_path

    print(f"Rendering orientation {angle}...")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered to: {render_path}")
'''

    # Write the Blender script to a temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(blender_script)
        script_path = f.name

    print(f"Model: {model_path}")
    print(f"Output: {output_path}")
    print("Running Blender...")

    try:
        # Find Blender executable
        blender_paths = [
            "/Applications/Blender.app/Contents/MacOS/Blender",  # macOS
            "blender",  # Linux/Windows (if in PATH)
        ]
        blender_exe = None
        for path in blender_paths:
            if os.path.exists(path) or path == "blender":
                blender_exe = path
                break

        if not blender_exe:
            print("ERROR: Blender not found. Install from https://blender.org")
            sys.exit(1)

        # Run Blender in background mode
        cmd = [
            blender_exe,
            "--background",
            "--python", script_path,
            "--", str(model_path), str(output_path)
        ]
        if orientation is not None:
            cmd.append(str(orientation))
        # Pass soft lighting flag as separate argument (argv index 3 or 2 depending on orientation)
        cmd.append("soft" if soft_lighting else "normal")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)  # 10 min for Cycles

        print(result.stdout)
        if result.returncode != 0:
            print(f"Blender stderr: {result.stderr}")
            sys.exit(1)

    finally:
        os.unlink(script_path)

    print(f"Saved sprite to: {output_path}")
    return output_path


def transform_to_isometric(input_path: Path, output_path: Path) -> Path:
    """Transform a flat square texture to isometric (2:1 projection)."""
    from PIL import Image

    img = Image.open(input_path)

    # For 2:1 isometric: rotate 45°, then scale Y by 0.5
    # This creates the diamond shape

    # First rotate 45 degrees (expand to fit)
    rotated = img.rotate(45, expand=True, resample=Image.BICUBIC)

    # Scale Y by 0.5 for 2:1 isometric projection
    new_width = rotated.width
    new_height = int(rotated.height * 0.5)
    isometric = rotated.resize((new_width, new_height), Image.BICUBIC)

    # Save with transparency
    isometric.save(output_path, 'PNG')
    print(f"Transformed to isometric: {output_path}")
    return output_path


def render_cube_tile(texture_path: Path, output_path: Path) -> Path:
    """Render a 3D cube tile with texture on top using Blender."""
    print("\n" + "=" * 60)
    print("CUBE TILE RENDERING (Blender)")
    print("=" * 60)

    # Create Blender Python script for cube tile rendering
    blender_script = '''
import bpy
import sys
import math

# Get command line arguments after "--"
argv = sys.argv
argv = argv[argv.index("--") + 1:]
texture_path = argv[0]
output_path = argv[1]

# Clear default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create a cube with isometric proportions
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
cube = bpy.context.object
cube.scale = (1, 1, 0.5)  # Half height for isometric cube
bpy.ops.object.transform_apply(scale=True)

# Manually assign UVs to each face so every face shows the full texture
import bmesh
mesh = cube.data
bm = bmesh.new()
bm.from_mesh(mesh)

# Ensure UV layer exists
uv_layer = bm.loops.layers.uv.verify()

# Standard UV coordinates for a quad face (full texture)
uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]

# Assign UVs to each face
for face in bm.faces:
    for i, loop in enumerate(face.loops):
        loop[uv_layer].uv = uvs[i % 4]

bm.to_mesh(mesh)
bm.free()

# Create material with texture using UV coordinates
mat = bpy.data.materials.new(name="TileMaterial")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links

# Clear default nodes
for node in nodes:
    nodes.remove(node)

# Create nodes for textured material
output_node = nodes.new('ShaderNodeOutputMaterial')
output_node.location = (400, 0)

bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.location = (0, 0)
bsdf.inputs['Roughness'].default_value = 0.9  # Matte surface

tex_node = nodes.new('ShaderNodeTexImage')
tex_node.location = (-400, 0)
tex_node.image = bpy.data.images.load(texture_path)

# Connect using UV coordinates
tex_coord = nodes.new('ShaderNodeTexCoord')
tex_coord.location = (-600, 0)
links.new(tex_coord.outputs['UV'], tex_node.inputs['Vector'])
links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])

# Assign material to cube
cube.data.materials.append(mat)

# Set up camera for isometric view
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.5  # Adjust to fit the cube

# Isometric camera position
distance = 5
iso_elevation = math.radians(35.264)  # True isometric angle
angle = math.radians(45)  # 45 degree corner view

camera.location = (
    distance * math.cos(angle) * math.cos(iso_elevation),
    distance * math.sin(angle) * math.cos(iso_elevation),
    distance * math.sin(iso_elevation)
)

# Create empty at origin for camera to track
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
target = bpy.context.object
target.name = "CameraTarget"

# Add track-to constraint
track = camera.constraints.new(type='TRACK_TO')
track.target = target
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'

bpy.context.scene.camera = camera

# Add lighting - main sun (MODERATE for tiles - darker than buildings)
bpy.ops.object.light_add(type='SUN', location=(10, -10, 10))
sun = bpy.context.object
sun.data.energy = 4.0  # Lower than buildings (8.0) for better ground contrast
sun.rotation_euler = (math.radians(45), math.radians(-15), math.radians(30))

# Add fill light from opposite side (MODERATE for tiles)
bpy.ops.object.light_add(type='SUN', location=(-10, 10, 5))
fill = bpy.context.object
fill.data.energy = 1.5  # Lower than buildings (2.5)
fill.rotation_euler = (math.radians(60), math.radians(15), math.radians(-150))

# Set up world ambient lighting (MODERATE for tiles)
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg:
    bg.inputs['Strength'].default_value = 0.4  # Lower than buildings (0.8)

# Set up render settings
scene = bpy.context.scene
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# Render
scene.render.filepath = output_path
print(f"Rendering cube tile...")
bpy.ops.render.render(write_still=True)
print(f"Rendered to: {output_path}")
'''

    # Write the Blender script to a temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(blender_script)
        script_path = f.name

    print(f"Texture: {texture_path}")
    print(f"Output: {output_path}")
    print("Running Blender...")

    try:
        # Find Blender executable
        blender_paths = [
            "/Applications/Blender.app/Contents/MacOS/Blender",  # macOS
            "blender",  # Linux/Windows (if in PATH)
        ]
        blender_exe = None
        for path in blender_paths:
            if os.path.exists(path) or path == "blender":
                blender_exe = path
                break

        if not blender_exe:
            print("ERROR: Blender not found. Install from https://blender.org")
            sys.exit(1)

        # Run Blender in background mode
        cmd = [
            blender_exe,
            "--background",
            "--python", script_path,
            "--", str(texture_path), str(output_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        print(result.stdout)
        if result.returncode != 0:
            print(f"Blender stderr: {result.stderr}")
            sys.exit(1)

    finally:
        os.unlink(script_path)

    print(f"Saved cube tile to: {output_path}")
    return output_path


def generate_tile(prompt: str, output_path: Path) -> Path:
    """Generate a tile texture directly with Gemini (no 3D conversion)."""
    print("\n" + "=" * 60)
    print("TILE GENERATION (Gemini Direct)")
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

    # Tile-specific prompt - flat seamless texture
    enhanced_prompt = f"""Generate a seamless tileable texture: {prompt}

CRITICAL requirements:
- Top-down view (looking straight down, no angle)
- Square image that tiles perfectly (edges must match when repeated)
- Fill the ENTIRE image with the texture (no borders, no empty space)
- Simple, stylized game texture
- Even lighting, no strong shadows
- Pattern should repeat seamlessly in all directions"""

    print(f"Prompt: {enhanced_prompt[:100]}...")
    print("Generating tile...")

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=enhanced_prompt,
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
            print(f"Saved tile to: {output_path}")
            return output_path

    print("ERROR: No image in response")
    print(f"Response: {response}")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Asset Generation Pipeline")
    parser.add_argument("--prompt", type=str, help="Prompt for concept art generation")
    parser.add_argument("--image", type=str, help="Skip step 1, use existing image")
    parser.add_argument("--model", type=str, help="Skip steps 1-2, use existing 3D model")
    parser.add_argument("--output-dir", type=str, default="./output", help="Output directory")
    parser.add_argument("--name", type=str, default="building", help="Output file base name")
    parser.add_argument("--orientation", type=int, help="Single orientation to render (0, 90, 180, or 270)")
    parser.add_argument("--tile", action="store_true", help="Generate a tile texture (skip 3D conversion)")
    parser.add_argument("--cube-tile", action="store_true", help="Generate 3D cube tile (elevated tile with visible sides)")
    parser.add_argument("--texture", type=str, help="Use existing texture for cube tile (skip generation)")
    parser.add_argument("--soft-lighting", action="store_true", help="Use softer, more even lighting (good for trees/props)")

    args = parser.parse_args()

    if not args.prompt and not args.image and not args.model and not args.texture:
        parser.error("Must provide --prompt, --image, --model, or --texture")

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Tile mode - simplified pipeline
    if args.tile:
        if not args.prompt:
            parser.error("--tile requires --prompt")
        tile_path = output_dir / f"{args.name}.png"
        generate_tile(args.prompt, tile_path)

        # Transform to isometric
        iso_path = output_dir / f"{args.name}_iso.png"
        transform_to_isometric(tile_path, iso_path)

        print("\n" + "=" * 60)
        print("TILE COMPLETE")
        print("=" * 60)
        print(f"Flat tile: {tile_path}")
        print(f"Isometric: {iso_path}")
        return

    # Cube tile mode - 3D cube with texture
    if args.cube_tile:
        if not args.prompt and not args.texture:
            parser.error("--cube-tile requires --prompt or --texture")

        # Generate or use existing texture
        if args.texture:
            texture_path = Path(args.texture)
            print(f"Using existing texture: {texture_path}")
        else:
            texture_path = output_dir / f"{args.name}.png"
            generate_tile(args.prompt, texture_path)

        # Render as 3D cube
        cube_path = output_dir / f"{args.name}_cube.png"
        render_cube_tile(texture_path, cube_path)

        print("\n" + "=" * 60)
        print("CUBE TILE COMPLETE")
        print("=" * 60)
        print(f"Texture: {texture_path}")
        print(f"Cube tile: {cube_path}")
        return

    concept_path = output_dir / f"{args.name}_concept.png"
    model_path = output_dir / f"{args.name}.glb"
    sprite_path = output_dir / f"{args.name}_sprite.png"

    # Step 1: Generate concept art (or use provided image)
    if args.model:
        model_path = Path(args.model)
        print(f"Skipping steps 1-2, using model: {model_path}")
    elif args.image:
        concept_path = Path(args.image)
        print(f"Skipping step 1, using image: {concept_path}")
    else:
        step1_generate_concept(args.prompt, concept_path)

    # Step 2: Convert to 3D
    if not args.model:
        step2_convert_to_3d(concept_path, model_path)

    # Step 3: Render isometric sprite
    step3_render_isometric(model_path, sprite_path, args.orientation, args.soft_lighting)

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print(f"Concept art: {concept_path}")
    print(f"3D model:    {model_path}")
    print(f"Sprite:      {sprite_path}")


if __name__ == "__main__":
    main()
