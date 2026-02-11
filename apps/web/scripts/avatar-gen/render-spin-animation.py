"""
Blender script to render spinning animation from GLB model.

Run: blender --background --python render-spin-animation.py -- input.glb output.gif

This script:
1. Imports a GLB model
2. Centers and scales it
3. Sets up camera and lighting
4. Renders a 360° rotation animation
5. Exports as GIF
"""

import bpy
import sys
import os
import math

def clear_scene():
    """Remove all objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_glb(filepath):
    """Import a GLB file."""
    bpy.ops.import_scene.gltf(filepath=filepath)
    # Get imported objects
    imported_objects = [obj for obj in bpy.context.selected_objects]
    return imported_objects

def center_and_scale_objects(objects, target_size=2.0):
    """Center objects and scale to fit target size."""
    if not objects:
        return

    # Get bounding box
    min_coords = [float('inf')] * 3
    max_coords = [float('-inf')] * 3

    for obj in objects:
        if obj.type == 'MESH':
            for vertex in obj.data.vertices:
                world_coord = obj.matrix_world @ vertex.co
                for i in range(3):
                    min_coords[i] = min(min_coords[i], world_coord[i])
                    max_coords[i] = max(max_coords[i], world_coord[i])

    # Calculate center and size
    center = [(min_coords[i] + max_coords[i]) / 2 for i in range(3)]
    size = max(max_coords[i] - min_coords[i] for i in range(3))

    # Create empty parent for all objects
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    parent = bpy.context.active_object
    parent.name = "Model_Parent"

    # Parent all objects and center
    for obj in objects:
        obj.parent = parent
        obj.location.x -= center[0]
        obj.location.y -= center[1]
        obj.location.z -= center[2]

    # Scale to target size
    if size > 0:
        scale_factor = target_size / size
        parent.scale = (scale_factor, scale_factor, scale_factor)

    return parent

def setup_camera():
    """Set up camera for front view - closer for head portrait."""
    bpy.ops.object.camera_add(location=(0, -3, 0.5))
    camera = bpy.context.active_object
    camera.name = "SpinCamera"
    camera.rotation_euler = (math.radians(80), 0, 0)

    # Set as active camera
    bpy.context.scene.camera = camera

    # Adjust camera to be orthographic for cleaner look
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 2.5

    return camera

def setup_lighting():
    """Set up soft lighting."""
    # Key light
    bpy.ops.object.light_add(type='AREA', location=(3, -3, 4))
    key_light = bpy.context.active_object
    key_light.data.energy = 200
    key_light.data.size = 3

    # Fill light
    bpy.ops.object.light_add(type='AREA', location=(-3, -3, 2))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 100
    fill_light.data.size = 2

    # Rim light
    bpy.ops.object.light_add(type='AREA', location=(0, 3, 3))
    rim_light = bpy.context.active_object
    rim_light.data.energy = 80
    rim_light.data.size = 2

def setup_render_settings(output_path, frame_count=24):
    """Configure render settings for GIF output."""
    scene = bpy.context.scene

    # Animation settings
    scene.frame_start = 1
    scene.frame_end = frame_count

    # Render settings
    scene.render.resolution_x = 128
    scene.render.resolution_y = 128
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True  # Transparent background

    # Output settings for image sequence
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = output_path

    # Use Eevee for faster rendering
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = 16

def animate_rotation(parent, frame_count=24):
    """Add 360° rotation animation to parent object."""
    scene = bpy.context.scene

    # Set initial rotation keyframe
    parent.rotation_euler = (0, 0, 0)
    parent.keyframe_insert(data_path="rotation_euler", frame=1)

    # Set final rotation keyframe (360 degrees around Z axis)
    parent.rotation_euler = (0, 0, math.radians(360))
    parent.keyframe_insert(data_path="rotation_euler", frame=frame_count + 1)

    # Make rotation linear (Blender 5.x compatible)
    if parent.animation_data and parent.animation_data.action:
        action = parent.animation_data.action
        # Try the new API first
        if hasattr(action, 'fcurves'):
            fcurves = action.fcurves
        elif hasattr(action, 'layers') and action.layers:
            # Blender 5.x NLA-based animation
            fcurves = []
            for layer in action.layers:
                for strip in layer.strips:
                    if hasattr(strip, 'fcurves'):
                        fcurves.extend(strip.fcurves)
        else:
            fcurves = []

        for fcurve in fcurves:
            for keyframe in fcurve.keyframe_points:
                keyframe.interpolation = 'LINEAR'

def render_animation():
    """Render the animation as image sequence."""
    bpy.ops.render.render(animation=True)

def images_to_gif(image_dir, output_gif, frame_count):
    """Convert image sequence to GIF using ffmpeg."""
    import subprocess
    import glob

    # Find all rendered frames
    pattern = os.path.join(image_dir, "*.png")
    frames = sorted(glob.glob(pattern))

    if not frames:
        print(f"No frames found in {image_dir}")
        return False

    # Use ffmpeg to create GIF with transparency
    try:
        # Create palette for better GIF quality
        palette_path = os.path.join(image_dir, "palette.png")
        frame_pattern = os.path.join(image_dir, "frame_%04d.png")

        # Generate palette
        subprocess.run([
            "ffmpeg", "-y",
            "-i", frame_pattern,
            "-vf", "palettegen=reserve_transparent=1",
            palette_path
        ], check=True, capture_output=True)

        # Create GIF using palette
        subprocess.run([
            "ffmpeg", "-y",
            "-framerate", "20",
            "-i", frame_pattern,
            "-i", palette_path,
            "-lavfi", "paletteuse=alpha_threshold=128",
            "-loop", "0",
            output_gif
        ], check=True, capture_output=True)

        print(f"Created GIF: {output_gif}")
        return True

    except subprocess.CalledProcessError as e:
        print(f"ffmpeg error: {e}")
        return False
    except FileNotFoundError:
        print("ffmpeg not found. Please install ffmpeg.")
        return False

def main():
    # Parse command line arguments (after --)
    argv = sys.argv
    if "--" not in argv:
        print("Usage: blender --background --python render-spin-animation.py -- input.glb output.gif")
        sys.exit(1)

    argv = argv[argv.index("--") + 1:]
    if len(argv) < 2:
        print("Usage: blender --background --python render-spin-animation.py -- input.glb output.gif")
        sys.exit(1)

    input_glb = argv[0]
    output_gif = argv[1]
    frame_count = int(argv[2]) if len(argv) > 2 else 24

    print(f"Input: {input_glb}")
    print(f"Output: {output_gif}")
    print(f"Frames: {frame_count}")

    # Create temp directory for frames
    temp_dir = os.path.join(os.path.dirname(output_gif), "temp_frames")
    os.makedirs(temp_dir, exist_ok=True)

    # Clear scene and import model
    clear_scene()
    objects = import_glb(input_glb)

    if not objects:
        print("Error: No objects imported from GLB")
        sys.exit(1)

    # Set up scene
    parent = center_and_scale_objects(objects)
    setup_camera()
    setup_lighting()
    setup_render_settings(os.path.join(temp_dir, "frame_"), frame_count)
    animate_rotation(parent, frame_count)

    # Render
    print("Rendering animation...")
    render_animation()

    # Convert to GIF
    images_to_gif(temp_dir, output_gif, frame_count)

    # Clean up temp files
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)

    print("Done!")

if __name__ == "__main__":
    main()
