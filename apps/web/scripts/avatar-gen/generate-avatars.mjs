/**
 * Citizen Avatar Generator using Nano Banana (Gemini Image Generation)
 *
 * Run: node apps/web/scripts/avatar-gen/generate-avatars.mjs
 *
 * Requires: GEMINI_API_KEY environment variable
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../../public/assets/citizens/candidates');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Base style prompt for consistency - matching council member style
const BASE_STYLE = `anthropomorphic lobster character, head and upper torso bust portrait, clean cartoon illustration style, vibrant colors, friendly expression, completely transparent background, NO background elements, NO borders, NO circles, NO frames, NO pedestals, NO base, character floating in empty space, isolated character only, PNG with transparency`;

// 16 citizen avatars: 8 lobsters + 8 crabs (50/50 split)
// More age diversity - mostly young/middle-aged, fewer elderly
const AVATAR_PROMPTS = [
  // === LOBSTERS (8) ===
  { name: 'citizen_lobster_01', prompt: 'a friendly young female lobster with a sun hat and warm smile' },
  { name: 'citizen_lobster_02', prompt: 'a young male lobster sailor with a striped shirt and anchor necklace' },
  { name: 'citizen_lobster_03', prompt: 'a cheerful female lobster baker with flour on her shell and chef hat' },
  { name: 'citizen_lobster_04', prompt: 'a cool teen lobster with headphones around neck, relaxed smile' },
  { name: 'citizen_lobster_05', prompt: 'a stylish female lobster with sunglasses and a scarf' },
  { name: 'citizen_lobster_06', prompt: 'a friendly male lobster gardener with a straw hat and gentle smile' },
  { name: 'citizen_lobster_07', prompt: 'an artistic young lobster with a beret and paint-stained claws' },
  { name: 'citizen_lobster_08', prompt: 'a bookish female lobster with round glasses and a cozy sweater' },

  // === CRABS (8) ===
  { name: 'citizen_crab_01', prompt: 'a cheerful young female crab with a flower tucked behind her eyestalk' },
  { name: 'citizen_crab_02', prompt: 'a sturdy male crab dockworker with a bandana and strong pincers' },
  { name: 'citizen_crab_03', prompt: 'a hipster male crab with thick-rimmed glasses and a beanie' },
  { name: 'citizen_crab_04', prompt: 'a spunky young female crab with colorful shell decorations and bows' },
  { name: 'citizen_crab_05', prompt: 'a confident female crab with pearl earrings and a smart blazer, head portrait only' },
  { name: 'citizen_crab_06', prompt: 'a chill male crab with a backwards cap and relaxed expression, head portrait' },
  { name: 'citizen_crab_07', prompt: 'a nerdy female crab scientist with lab goggles pushed up on head' },
  { name: 'citizen_crab_08', prompt: 'a friendly male crab chef with a tall white hat and apron' },
];

async function generateAvatar(prompt, filename) {
  const fullPrompt = `${BASE_STYLE}, ${prompt}`;

  console.log(`Generating: ${filename}...`);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Nano Banana Pro - same as council members
      contents: fullPrompt,
    });

    // Extract image from response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `${filename}.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`  ✓ Saved: ${outputPath}`);
        return true;
      }
    }

    // If no image in response, log the text response
    const text = response.candidates[0]?.content?.parts?.find(p => p.text)?.text;
    if (text) {
      console.log(`  ⚠ No image generated. Response: ${text.substring(0, 100)}...`);
    }
    return false;
  } catch (error) {
    console.error(`  ✗ Error generating ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  // Limit to first N avatars (set to null for all)
  const LIMIT = null; // Generate all 16
  const prompts = LIMIT ? AVATAR_PROMPTS.slice(0, LIMIT) : AVATAR_PROMPTS;

  console.log('🦞 Clawntown Citizen Avatar Generator');
  console.log('=====================================');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Generating ${prompts.length} avatars...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const avatar of prompts) {
    const success = await generateAvatar(avatar.prompt, avatar.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=====================================');
  console.log(`Done! Generated ${successCount}/${AVATAR_PROMPTS.length} avatars`);
  if (failCount > 0) {
    console.log(`${failCount} failed - check errors above`);
  }
  console.log(`\nFind your avatars in: ${OUTPUT_DIR}`);
}

main().catch(console.error);
