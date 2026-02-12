'use client';

import { Dialog } from './Dialog';
import { CodeBlock } from './CodeBlock';

interface BuildYourOwnTownDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BuildYourOwnTownDialog({ isOpen, onClose }: BuildYourOwnTownDialogProps) {
  return (
    <Dialog
      title="Build Your Own Town"
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg"
      bodyClassName="p-4 bg-retro-gray overflow-y-auto flex-1 space-y-6"
    >
      {/* Section 1: Intro */}
      <section>
        <h3 className="font-retro text-sm font-bold mb-2">What's a Sister Town?</h3>
        <p className="font-retro text-xs text-gray-700 mb-2">
          By forking Clawntown, you create a sister town - your own self-evolving community with a unique theme. Vikings, cyberpunk, underwater kingdoms, zombie apocalypse... you decide.
        </p>
        <p className="font-retro text-xs text-gray-600">
          The code is MIT licensed. The crab/lobster assets aren't included - you'll generate your own during setup.
        </p>
      </section>

      {/* Section 2: Requirements */}
      <section>
        <h3 className="font-retro text-sm font-bold mb-2">To get started:</h3>
        <ul className="font-retro text-xs text-gray-700 space-y-1">
          <li>
            • <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Claude Code</a> installed
          </li>
          <li>
            • <a href="https://github.com/obra/superpowers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Superpowers</a> plugin for Claude Code
          </li>
        </ul>
      </section>

      {/* Section 3: Quick Start */}
      <section>
        <h3 className="font-retro text-sm font-bold mb-2">Quick Start</h3>

        <div className="space-y-3">
          <div>
            <p className="font-retro text-xs text-gray-700 mb-1 font-semibold">Option A: Using GitHub CLI</p>
            <CodeBlock
              code={`TOWN_NAME=my-town-name
gh repo fork accnops/clawntown --clone --fork-name $TOWN_NAME
cd $TOWN_NAME
claude`}
            />
          </div>

          <div>
            <p className="font-retro text-xs text-gray-700 mb-1 font-semibold">Option B: Manual fork</p>
            <p className="font-retro text-xs text-gray-600 mb-1">
              1. <a href="https://github.com/accnops/clawntown/fork" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Fork on GitHub</a> (change the repository name!)
            </p>
            <p className="font-retro text-xs text-gray-600 mb-1">2. Then:</p>
            <CodeBlock
              code={`git clone https://github.com/YOUR_USERNAME/your-town-name
cd your-town-name
claude`}
            />
          </div>
        </div>
      </section>

      {/* Section 4: Start Brainstorming */}
      <section>
        <h3 className="font-retro text-sm font-bold mb-2">Start Brainstorming</h3>
        <p className="font-retro text-xs text-gray-700 mb-2">
          Once Claude is ready, paste this to begin:
        </p>
        <CodeBlock
          code={`/superpowers:brainstorm I just forked Clawntown to create my own sister town.

## What I need help with:

1. **Choose a theme** - Help me brainstorm a unique theme for my town. Examples: space colony, medieval kingdom, underwater city, zombie apocalypse, viking settlement, stone age tribe, roman empire, fantasy realm, cyberpunk district, post-apocalyptic wasteland, etc.

2. **Pick a town name** - Based on my chosen theme, help me come up with a creative name for my town.

3. **Remove Clawntown assets and references** - Go through the entire codebase and remove/replace ALL references to Clawntown, crabs, lobsters, and crustacean theming. This includes file names, variable names, comments, UI text, and any themed content.

4. **Buildings** - Review the existing buildings in Clawntown (Town Hall, Forum, Lighthouse, Lobster Restaurant, etc.). For each building:
   - Rename to match my new theme
   - Ask if I want to keep, remove, or modify it
   - Suggest new buildings that fit my theme

5. **Tiles and terrain** - Choose what kind of ground tiles match my theme (grass, sand, stone, snow, metal, alien terrain, etc.)

6. **Asset generation pipeline** - Guide me through creating new visual assets:
   - Start with Gemini to generate 2D concept art (cheap, for iteration)
   - Show me the concepts and ask for feedback
   - Iterate on the designs until I'm happy
   - Then use Fal.ai to turn approved concepts into 3D models
   - Then use Blender to render final assets
   - (Or I can provide my own assets if I prefer)

7. **Setup services** - Help me set up:
   - Vercel (hosting)
   - Supabase (database + auth)
   - API keys (check .env.example for required: GEMINI_API_KEY, SUPABASE keys, CRON_SECRET, GITHUB_TOKEN)
   - Optional: Cloudflare Turnstile (bot protection), Fal.ai (better asset generation)

8. **Platform awareness** - This repo was developed on macOS. Adapt any commands for my platform if needed.

Start by asking me about the theme I'm interested in!`}
        />
      </section>

      {/* Section 5: What's Next */}
      <section>
        <h3 className="font-retro text-sm font-bold mb-2">What's Next</h3>
        <p className="font-retro text-xs text-gray-700 mb-2">
          After brainstorming your theme, Claude will guide you through:
        </p>
        <ul className="font-retro text-xs text-gray-700 space-y-1">
          <li>• Setting up Vercel, Supabase, and API keys</li>
          <li>• Generating concept art for your theme (Gemini)</li>
          <li>• Turning concepts into 3D models (Fal.ai → Blender)</li>
          <li>• Deploying your town</li>
        </ul>
        <p className="font-retro text-xs text-gray-500 mt-2">
          You can also provide your own assets if you prefer.
        </p>
      </section>
    </Dialog>
  );
}
