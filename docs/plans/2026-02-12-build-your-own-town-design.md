# Build Your Own Town - Design

Add a "Build your own town!" feature that guides developers through forking Clawntown to create their own themed sister town.

## Overview

A prominent button in the header opens a modal dialog with instructions for forking the project and starting a guided brainstorming session. The goal is to make it easy for developers to spin up their own themed towns (space colony, medieval kingdom, underwater city, etc.) while creating an ecosystem of sister towns.

## Components

### Header Button

- Location: Main header bar, always visible
- Label: "Build your own town!"
- Style: Retro aesthetic, subtle accent to make it noticeable
- Action: Opens modal dialog

### Modal Dialog

Single scrollable page with 5 sections. Retro macOS/RCT dialog styling with chunky borders and classic button styles. Each code block has a copy-to-clipboard button.

## Dialog Content

### Section 1: Intro

> **What's a Sister Town?**
>
> By forking Clawntown, you create a sister town - your own self-evolving community with a unique theme. Vikings, cyberpunk, underwater kingdoms, zombie apocalypse... you decide.
>
> The code is MIT licensed. The crab/lobster assets aren't included - you'll generate your own during setup.

### Section 2: Requirements

> **To get started:**
> - [Claude Code](https://claude.ai/download) installed
> - [Superpowers](https://github.com/obra/superpowers) plugin for Claude Code
>
> That's it. Claude will guide you through setting up Vercel, Supabase, Gemini, and other services as needed during the process.

### Section 3: Quick Start

> **Quick Start**
>
> **Option A: Using GitHub CLI**
> ```bash
> TOWN_NAME=my-town-name
> gh repo fork accnops/clawntown --clone --fork-name $TOWN_NAME
> cd $TOWN_NAME
> claude
> ```
>
> **Option B: Manual fork**
> 1. [Fork on GitHub](https://github.com/accnops/clawntown/fork) (change the repository name!)
> 2. Then:
> ```bash
> git clone https://github.com/YOUR_USERNAME/your-town-name
> cd your-town-name
> claude
> ```

### Section 4: Start Brainstorming

> **Start Brainstorming**
>
> Once Claude is ready, paste this to begin:
>
> ```
> /superpowers:brainstorm I just forked Clawntown to create my own sister town. Help me brainstorm a unique theme (space colony, medieval kingdom, underwater city, zombie apocalypse, etc.) and guide me through the setup process. Start by removing the existing Clawntown assets since I'll be creating my own.
> ```

### Section 5: What's Next

> **What's Next**
>
> After brainstorming your theme, Claude will guide you through:
>
> - Setting up Vercel, Supabase, and API keys
> - Generating concept art for your theme (Gemini)
> - Turning concepts into 3D models (Fal.ai → Blender)
> - Deploying your town
>
> You can also provide your own assets if you prefer.

## Additional Files

### `.env.example`

Create a `.env.example` file in the repo root:

```
# Required
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
GITHUB_TOKEN=

# Optional - bot protection
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# Optional - high quality assets
FAL_KEY=
```

## Implementation Notes

- Modal should match existing retro UI aesthetic
- Code blocks need click-to-copy functionality
- The brainstorm prompt instructs Claude to remove existing assets as its first action
- Asset pipeline: Gemini (2D concepts) → Fal.ai (3D models) → Blender (rendering)
- Platform awareness: repo was developed on macOS, Claude should adapt commands for user's platform during guided setup
