# Clawntown Creature Diversity Design

**Date**: 2026-02-11
**Status**: Approved

## Overview

Expand Clawntown beyond a lobster-only theme to include crabs as a significant minority, creating a more diverse crustacean community while maintaining the established lobster-led identity.

## Core Identity

**Lobster-led crustacean town with crab minority**

- Lobsters remain the dominant species and hold most leadership positions
- Crabs are a well-represented minority in the citizen population
- The "claw" theme and molt metaphor work equally well for both species

## Council Composition

7 council members total: **5 lobsters, 2 crabs**

### Lobsters (5)
| Character | Role | Notes |
|-----------|------|-------|
| Mayor Clawrence | Mayor | Town leader, keeps lobster puns but can add crab references |
| Treasurer Sheldon | Treasurer | Penny-pinching financial guardian |
| Clerk Barnacle | Clerk | Keeper of records and procedures |
| Chef Bisque | Chef | Culinary ambassador (name references lobster bisque) |
| Lighthouse Keeper Luna | Lighthouse Keeper | Mysterious guardian of the lighthouse |

### Crabs (2)
| Character | Role | Notes |
|-----------|------|-------|
| Sheriff Snapper | Sheriff | Gruff lawkeeper - "Snapper" fits crab perfectly |
| Harbormaster Pincers | Harbormaster | Runs the docks - crabs are quintessential harbor creatures |

**Required**: Regenerate avatar assets for Sheriff Snapper and Harbormaster Pincers as crab characters.

## Citizen Avatars

16 total avatars for citizen registration: **8 lobsters, 8 crabs (50/50 split)**

This creates a balanced citizenry while the council remains lobster-led, reflecting a "lobster-led government, diverse population" dynamic.

### Avatar Generation Guidelines
- Same art style as existing council members (clean cartoon illustration, bust portrait)
- Mix of genders, ages, and personality types for both species
- No backgrounds, borders, or pedestals - isolated characters only
- Diverse roles: workers, elders, kids, quirky characters, etc.

## Text & Lore Changes

### High Priority
| Location | Current | New |
|----------|---------|-----|
| Welcome (page.tsx:82) | "An evolving coastal lobster town" | "An evolving coastal crustacean town" |
| Molt Center (page.tsx:195) | "Just as lobsters shed their shells to grow..." | "Just as crustaceans shed their shells to grow..." |

### Medium Priority
- Mayor Clawrence's personality can include crab-friendly puns alongside lobster puns
- Forum tagline: "lobster tales" → "coastal tales" or "crustacean tales"
- Privacy/Terms pages: "lobster town" → "crustacean town" where it appears

### Keep As-Is
- Building names: "Lobster Dock", "The Claw & Tail Restaurant" (work as place names)
- Asset names: `lobster_traps` (real fishing term, catches all crustaceans)
- Character names: All current names work fine

## Technical Changes

### CSS Color Variables (globals.css)
| Current | New |
|---------|-----|
| `--color-lobster-red` | `--color-shell-red` |
| `--color-lobster-shell` | `--color-shell-dark` |

Also update all Tailwind class references:
- `text-lobster-red` → `text-shell-red`
- `bg-lobster-red` → `bg-shell-red`
- `border-lobster-red` → `border-shell-red`
- etc.

## Implementation Checklist

### Phase 1: Assets
- [ ] Regenerate Sheriff Snapper as a crab character
- [ ] Regenerate Harbormaster Pincers as a crab character
- [ ] Generate 8 lobster citizen avatars
- [ ] Generate 8 crab citizen avatars
- [ ] Run through fal.ai + Blender pipeline for spinning animations

### Phase 2: Code Changes
- [ ] Rename CSS color variables (`lobster-*` → `shell-*`)
- [ ] Update all Tailwind class references
- [ ] Update welcome text to "crustacean town"
- [ ] Update Molt Center lore text
- [ ] Update council member personalities if needed
- [ ] Update any other "lobster" text references

### Phase 3: Verification
- [ ] Visual review of all crab council member avatars
- [ ] Visual review of all citizen avatars
- [ ] Review all UI text for consistency
- [ ] Test build passes

## Success Criteria

- Sheriff Snapper and Harbormaster Pincers visually read as crabs
- Citizen avatar selection shows balanced lobster/crab options
- Public-facing text uses inclusive "crustacean" language
- Overall town aesthetic remains cohesive
