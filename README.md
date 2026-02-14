# Clawntown

A self-evolving coastal crustacean town, where citizens shape the future and lobsters and crabs run the council.

**See it live:** [clawntown.lol](https://clawntown.lol)

## Build Your Own Town

### What's a Sister Town?

By forking Clawntown, you create a sister town - your own self-evolving community with a unique theme. Vikings, cyberpunk, underwater kingdoms, zombie apocalypse... you decide.

The code is MIT licensed. The crab/lobster assets aren't included - you'll generate your own during setup.

### Requirements

- [Claude Code](https://claude.ai/download) installed
- [Superpowers](https://github.com/obra/superpowers) plugin for Claude Code

That's it. Claude will guide you through setting up Vercel, Supabase, Gemini, and other services as needed during the process.

### Quick Start

**Option A: Using GitHub CLI**

```bash
TOWN_NAME=my-town-name
gh repo fork accnops/clawntown --clone --fork-name $TOWN_NAME
cd $TOWN_NAME
claude
```

**Option B: Manual fork**

1. [Fork on GitHub](https://github.com/accnops/clawntown/fork) (change the repository name!)
2. Then:

```bash
git clone https://github.com/YOUR_USERNAME/your-town-name
cd your-town-name
claude
```

### Start Brainstorming

Once Claude is ready, paste this to begin:

```
/superpowers:brainstorm I just forked Clawntown to create my own sister town.

## What I need help with:

1. **Choose a theme** - Help me brainstorm a unique theme for my town. Examples: space colony, medieval kingdom, underwater city, zombie apocalypse, viking settlement, stone age tribe, roman empire, fantasy realm, cyberpunk district, post-apocalyptic wasteland, etc.

2. **Pick a town name** - Based on my chosen theme, help me come up with a creative name for my town.

3. **Remove Clawntown assets and references** - Go through the entire codebase and remove/replace ALL references to Clawntown, crabs, lobsters, and crustacean theming. This includes file names, variable names, comments, UI text, themed content, and repository URLs (accnops/clawntown). The only acceptable reference is acknowledging that the project was forked from Clawntown.

4. **Buildings** - Review the existing buildings in Clawntown (Town Hall, Forum, Lighthouse, Lobster Restaurant, etc.). For each building:
   - Rename to match my new theme
   - Ask if I want to keep, remove, or modify it
   - Suggest new buildings that fit my theme

5. **Tiles and terrain** - Choose what kind of ground tiles match my theme (grass, sand, stone, snow, metal, alien terrain, etc.)

6. **Asset generation pipeline** - Guide me through creating new visual assets:
   - Start with Gemini to generate 2D concept art (cheap, for iteration)
   - Show me the concepts and ask for feedback
   - Iterate on the designs until I'm happy
   - Then use Fal.ai to turn approved concepts into 3D models (uses tripo3d at ~$0.30/model - estimate total cost based on number of assets needed)
   - Then use Blender to render final assets
   - (Or I can provide my own assets if I prefer)

7. **Setup services** - Help me set up:
   - Vercel (hosting)
   - Supabase (database + auth)
   - API keys (check .env.example for required: GEMINI_API_KEY, SUPABASE keys, CRON_SECRET, GITHUB_TOKEN)
   - Optional: Cloudflare Turnstile (bot protection), Fal.ai (3D model generation)

8. **Platform awareness** - This repo was developed on macOS. Adapt any commands for my platform if needed.

Start by asking me about the theme I'm interested in!
```

### What's Next

After brainstorming your theme, Claude will guide you through:

- Setting up Vercel, Supabase, and API keys
- Generating concept art for your theme (Gemini)
- Turning concepts into 3D models (Fal.ai → Blender)
- Deploying your town

You can also provide your own assets if you prefer.
