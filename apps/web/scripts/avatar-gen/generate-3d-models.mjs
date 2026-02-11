/**
 * Step 1: Generate 3D models from 2D citizen avatars using fal.ai Triposr
 *
 * Run: FAL_KEY=your_key node apps/web/scripts/avatar-gen/generate-3d-models.mjs
 *
 * Requires: FAL_KEY environment variable
 *
 * This uses fal.ai's Triposr model to convert 2D images to 3D GLB models.
 */

import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local from repo root
const envPath = path.join(__dirname, '../../../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length) {
        process.env[key] = valueParts.join('=');
      }
    }
  }
}

const INPUT_DIR = path.join(__dirname, '../../public/assets/citizens/candidates');
const OUTPUT_DIR = path.join(__dirname, '../../public/assets/citizens/3d-models');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const falKey = process.env.FAL_KEY;
if (!falKey) {
  console.error('Error: FAL_KEY environment variable is required');
  console.error('       Add FAL_KEY to .env.local in the repo root');
  process.exit(1);
}

fal.config({
  credentials: falKey,
});

async function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

async function generate3DModel(imagePath, outputName) {
  console.log(`Generating 3D model for: ${outputName}...`);

  try {
    const imageBase64 = await imageToBase64(imagePath);

    const result = await fal.subscribe('fal-ai/triposr', {
      input: {
        image_url: imageBase64,
        mc_resolution: 256,
        foreground_ratio: 0.9,
        output_format: 'glb',
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log(`  Processing ${outputName}...`);
        }
      },
    });

    // Download the GLB file - response is nested under data
    const meshUrl = result.data?.model_mesh?.url || result.model_mesh?.url;
    if (meshUrl) {
      const response = await fetch(meshUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const outputPath = path.join(OUTPUT_DIR, `${outputName}.glb`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`  ✓ Saved: ${outputPath}`);
      return true;
    } else {
      console.log(`  ⚠ No model generated for ${outputName}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Error generating ${outputName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🦞 3D Model Generator (fal.ai Triposr)');
  console.log('======================================');
  console.log(`Input directory: ${INPUT_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Get all PNG files in the candidates directory
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} avatars to process\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const imagePath = path.join(INPUT_DIR, file);
    const outputName = path.basename(file, '.png');

    const success = await generate3DModel(imagePath, outputName);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n======================================');
  console.log(`Done! Generated ${successCount}/${files.length} 3D models`);
  if (failCount > 0) {
    console.log(`${failCount} failed - check errors above`);
  }
  console.log(`\nNext step: Run generate-spin-gifs.mjs to create spinning animations`);
}

main().catch(console.error);
