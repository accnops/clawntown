import bpy
print('Blender version:', bpy.app.version_string)
print('Has is_shadow_catcher:', hasattr(bpy.types.Object, 'is_shadow_catcher'))

# Test creating a shadow catcher
bpy.ops.mesh.primitive_plane_add(size=1)
plane = bpy.context.object
try:
    plane.is_shadow_catcher = True
    print('Shadow catcher set successfully')
except Exception as e:
    print(f'Error setting shadow catcher: {e}')
