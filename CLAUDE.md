# Claude Code Guidelines for Clawntawn

## Build Commands

**NEVER run `pnpm build` to check if things compile.**

**ALWAYS use `pnpm build:check` instead** - it's faster and doesn't produce build artifacts.

## Commits

**DO NOT make micro-commits for every small change.** Wait until you have a meaningful chunk of work (a complete feature, a logical set of fixes, etc.) before committing. Batch related changes together into a single commit with a descriptive message.

---

## Wayfinder

```
apps/web/src/
  app/page.tsx              Main page - TownView + dialogs
  app/api/                  API routes (auth/, turn/, queue/, stats/, github/)
  components/town/          Phaser game, buildings.ts, townMap.ts
  components/town-hall/     Council office, lobby, registry
  components/ui/            Dialog, Sparkline, etc.
  hooks/                    useAuth, useCouncilOffice, useQueue, useStats
  lib/                      supabase, gemini, moderate, sanitize
  data/council-members.ts   Council definitions

apps/engine/src/
  index.ts                  Ticker entry point
  conversation/             handler, queue, turn logic
  council/office-hours.ts   Schedule checking

packages/shared/src/types/  Shared types (citizen, council, turn, conversation)
supabase/migrations/        Database schema (15 files)
scripts/asset-pipeline/     Asset rendering (pipeline.py, rerender_all.sh, generate_*.py)
```

**Stack**: Next.js 15, React 19, Phaser 3, Tailwind 4, Supabase, Gemini
