/**
 * Full Avatar Pipeline: 2D → 3D → Spinning GIF
 *
 * Run: FAL_KEY=your_key node apps/web/scripts/avatar-gen/run-full-pipeline.mjs
 *
 * This script runs the full pipeline:
 * 1. Generate 3D models from 2D avatars using fal.ai Triposr
 * 2. Render spinning GIF animations using Blender
 * 3. Copy static PNGs to final destination
 *
 * Prerequisites:
 * - FAL_KEY environment variable
 * - Blender installed and in PATH
 * - Candidate PNGs in public/assets/citizens/candidates/
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runScript(scriptPath, description) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`STEP: ${description}`);
  console.log('='.repeat(50) + '\n');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function copyStaticImages() {
  const candidatesDir = path.join(__dirname, '../../public/assets/citizens/candidates');
  const outputDir = path.join(__dirname, '../../public/assets/citizens');

  console.log('\nCopying static PNG images...');

  const files = fs.readdirSync(candidatesDir).filter(f => f.endsWith('.png'));

  for (const file of files) {
    const src = path.join(candidatesDir, file);
    // Rename from citizen_lobster_01 to citizen_01 format
    const baseName = file.replace(/citizen_(lobster|crab)_(\d+)/, 'citizen_$2');
    const dest = path.join(outputDir, baseName);
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied: ${baseName}`);
  }
}

async function main() {
  console.log('🦞🦀 Full Avatar Generation Pipeline');
  console.log('=====================================\n');

  // Check prerequisites
  if (!process.env.FAL_KEY) {
    console.error('Error: FAL_KEY environment variable is required');
    process.exit(1);
  }

  try {
    // Step 1: Generate 3D models
    await runScript(
      path.join(__dirname, 'generate-3d-models.mjs'),
      'Generating 3D models from 2D avatars (fal.ai Triposr)'
    );

    // Step 2: Render spinning GIFs
    await runScript(
      path.join(__dirname, 'generate-spin-gifs.mjs'),
      'Rendering spinning GIF animations (Blender)'
    );

    // Step 3: Copy static images
    await copyStaticImages();

    console.log('\n' + '='.repeat(50));
    console.log('PIPELINE COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Review generated assets in public/assets/citizens/');
    console.log('2. Update citizen-avatars.ts if needed');
    console.log('3. Test in the app');

  } catch (error) {
    console.error('\nPipeline failed:', error.message);
    process.exit(1);
  }
}

main();
