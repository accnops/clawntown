/**
 * Step 2: Generate spinning GIF animations from 3D models using Blender
 *
 * Run: node apps/web/scripts/avatar-gen/generate-spin-gifs.mjs
 *
 * Prerequisites:
 * - Blender installed and in PATH (or set BLENDER_PATH env var)
 * - 3D models generated in public/assets/citizens/3d-models/
 *
 * This script runs Blender in background mode to render spinning animations.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '../../public/assets/citizens/3d-models');
const OUTPUT_DIR = path.join(__dirname, '../../public/assets/citizens');
const BLENDER_SCRIPT = path.join(__dirname, 'render-spin-animation.py');

// Find Blender executable (macOS app location)
const BLENDER_PATH = process.env.BLENDER_PATH || '/Applications/Blender.app/Contents/MacOS/Blender';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function checkBlender() {
  try {
    execSync(`${BLENDER_PATH} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function renderSpinGif(glbPath, outputPath) {
  const filename = path.basename(glbPath, '.glb');
  console.log(`Rendering spin animation for: ${filename}...`);

  try {
    const command = `"${BLENDER_PATH}" --background --python "${BLENDER_SCRIPT}" -- "${glbPath}" "${outputPath}" 24`;
    execSync(command, { stdio: 'pipe', timeout: 120000 });

    // Verify the file was actually created
    if (fs.existsSync(outputPath)) {
      console.log(`  ✓ Saved: ${outputPath}`);
      return true;
    } else {
      console.error(`  ✗ File not created for ${filename}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Error rendering ${filename}:`, error.message);
    if (error.stderr) {
      console.error(`  stderr: ${error.stderr.toString().slice(-500)}`);
    }
    return false;
  }
}

async function main() {
  console.log('🦞 Spinning GIF Generator (Blender)');
  console.log('====================================');

  // Check if Blender is available
  if (!checkBlender()) {
    console.error('Error: Blender not found. Install Blender and ensure it\'s in PATH,');
    console.error('       or set BLENDER_PATH environment variable.');
    process.exit(1);
  }

  // Check if input directory exists
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Error: Input directory not found: ${INPUT_DIR}`);
    console.error('       Run generate-3d-models.mjs first to create 3D models.');
    process.exit(1);
  }

  // Get all GLB files
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.glb'));

  if (files.length === 0) {
    console.error('Error: No GLB files found in input directory.');
    console.error('       Run generate-3d-models.mjs first to create 3D models.');
    process.exit(1);
  }

  console.log(`Input directory: ${INPUT_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Found ${files.length} 3D models to render\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const glbPath = path.join(INPUT_DIR, file);
    const outputName = path.basename(file, '.glb');
    const outputPath = path.join(OUTPUT_DIR, `${outputName}_spin.gif`);

    const success = renderSpinGif(glbPath, outputPath);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n====================================');
  console.log(`Done! Rendered ${successCount}/${files.length} spinning GIFs`);
  if (failCount > 0) {
    console.log(`${failCount} failed - check errors above`);
  }
  console.log(`\nSpinning GIFs saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
