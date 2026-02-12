# Build Your Own Town - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Build your own town!" button in the header that opens a modal with instructions for forking Clawntown to create a sister town.

**Architecture:** A new `BuildYourOwnTownDialog` component renders the modal content with 5 sections. The dialog uses the existing `Dialog` component. A `CodeBlock` component with copy-to-clipboard handles the code snippets. The button lives in `TownView.tsx` header area.

**Tech Stack:** React, TypeScript, existing Dialog component, Tailwind CSS

---

### Task 1: Create .env.example file

**Files:**
- Create: `.env.example`

**Step 1: Create the env template file**

```bash
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

**Step 2: Verify file exists**

Run: `cat .env.example`
Expected: Contents of the file displayed

**Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example template for sister towns"
```

---

### Task 2: Create CodeBlock component with copy-to-clipboard

**Files:**
- Create: `apps/web/src/components/ui/CodeBlock.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Step 1: Create the CodeBlock component**

```tsx
'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy to clipboard"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}
```

**Step 2: Export from index.ts**

Add to `apps/web/src/components/ui/index.ts`:
```ts
export { CodeBlock } from './CodeBlock';
```

**Step 3: Verify build passes**

Run: `pnpm build:check`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/web/src/components/ui/CodeBlock.tsx apps/web/src/components/ui/index.ts
git commit -m "feat: add CodeBlock component with copy-to-clipboard"
```

---

### Task 3: Create BuildYourOwnTownDialog component

**Files:**
- Create: `apps/web/src/components/ui/BuildYourOwnTownDialog.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Step 1: Create the dialog component**

```tsx
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
        <p className="font-retro text-[10px] text-gray-500 mt-2">
          That's it. Claude will guide you through setting up Vercel, Supabase, Gemini, and other services as needed.
        </p>
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
            <p className="font-retro text-[10px] text-gray-600 mb-1">
              1. <a href="https://github.com/accnops/clawntown/fork" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Fork on GitHub</a> (change the repository name!)
            </p>
            <p className="font-retro text-[10px] text-gray-600 mb-1">2. Then:</p>
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
          code={`/superpowers:brainstorm I just forked Clawntown to create my own sister town. Help me brainstorm a unique theme (space colony, medieval kingdom, underwater city, zombie apocalypse, etc.) and guide me through the setup process. Start by removing the existing Clawntown assets since I'll be creating my own.`}
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
        <p className="font-retro text-[10px] text-gray-500 mt-2">
          You can also provide your own assets if you prefer.
        </p>
      </section>
    </Dialog>
  );
}
```

**Step 2: Export from index.ts**

Add to `apps/web/src/components/ui/index.ts`:
```ts
export { BuildYourOwnTownDialog } from './BuildYourOwnTownDialog';
```

**Step 3: Verify build passes**

Run: `pnpm build:check`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/web/src/components/ui/BuildYourOwnTownDialog.tsx apps/web/src/components/ui/index.ts
git commit -m "feat: add BuildYourOwnTownDialog component"
```

---

### Task 4: Add header button to TownView

**Files:**
- Modify: `apps/web/src/components/town/TownView.tsx`

**Step 1: Add state and import**

At top of file, update imports:
```tsx
import { useState, useRef, useCallback } from "react";
```

Inside the `TownView` component, add state:
```tsx
const [showBuildDialog, setShowBuildDialog] = useState(false);
```

**Step 2: Add the button to the header area**

Find the existing header div (around line 51-62) that contains "CLAWNTOWN" and population. Add the button as a sibling in a wrapper, making the header a flex container:

Replace the existing header overlay with:
```tsx
{/* Header HUD */}
<div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
  {/* Left spacer for balance */}
  <div className="w-32" />

  {/* Town name (center) */}
  <div className="text-center">
    <div className="flex items-center justify-center gap-2 mb-1">
      <span className="text-2xl md:text-3xl drop-shadow-lg">🦀</span>
      <h1 className="font-pixel text-lg md:text-2xl text-white drop-shadow-lg">
        CLAWNTOWN
      </h1>
      <span className="text-2xl md:text-3xl drop-shadow-lg scale-x-[-1]">🦀</span>
    </div>
    <p className="font-retro text-xs md:text-sm text-white/80 drop-shadow">
      Population: {population ?? '--'}
    </p>
  </div>

  {/* Build your own town button (right) */}
  <button
    onClick={() => setShowBuildDialog(true)}
    className="pointer-events-auto bg-amber-500 hover:bg-amber-400 text-white font-retro text-xs px-3 py-1.5 rounded shadow-lg border-2 border-amber-600 hover:border-amber-500 transition-colors"
  >
    🏗️ Build your own!
  </button>
</div>
```

**Step 3: Add the dialog component**

Import at top of file:
```tsx
import { BuildYourOwnTownDialog } from "@/components/ui";
```

Add before the closing `</div>` of the return:
```tsx
<BuildYourOwnTownDialog
  isOpen={showBuildDialog}
  onClose={() => setShowBuildDialog(false)}
/>
```

**Step 4: Verify build passes**

Run: `pnpm build:check`
Expected: Build succeeds

**Step 5: Test manually**

Run: `pnpm dev`
Expected: Button visible in header, clicking opens dialog with all sections

**Step 6: Commit**

```bash
git add apps/web/src/components/town/TownView.tsx
git commit -m "feat: add Build your own town button to header"
```

---

### Task 5: Final verification and cleanup

**Step 1: Run full build check**

Run: `pnpm build:check`
Expected: Build succeeds

**Step 2: Run tests**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Manual verification checklist**

Run: `pnpm dev`

Verify:
- [ ] Button visible in top-right of header
- [ ] Button has amber/gold color that stands out but fits theme
- [ ] Clicking button opens dialog
- [ ] Dialog has all 5 sections
- [ ] Code blocks have copy buttons that work
- [ ] Links open in new tabs
- [ ] Dialog closes on X button
- [ ] Dialog closes on Escape key
- [ ] Dialog closes on backdrop click

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "feat: complete Build your own town feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create .env.example | `.env.example` |
| 2 | Create CodeBlock component | `apps/web/src/components/ui/CodeBlock.tsx` |
| 3 | Create BuildYourOwnTownDialog | `apps/web/src/components/ui/BuildYourOwnTownDialog.tsx` |
| 4 | Add header button to TownView | `apps/web/src/components/town/TownView.tsx` |
| 5 | Final verification | - |
