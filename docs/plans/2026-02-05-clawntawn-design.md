# Clawntawn Design

A self-evolving public town powered by an LLM.

## Overview

Unlike personal AI assistants (1:1), Clawntawn is a shared public space anyone can visit, watch, and influence. The town modifies its own codebase through a project system, growing and changing based on public input.

**The metaphor:** A retro pixel-art town (RollerCoaster Tycoon 1/2 aesthetic) with buildings representing different functions. The Council building is central - that's where citizens talk to officials who can turn ideas into projects.

**Constitutional rules (immutable):**
- Cannot pose existential risk to the town
- Must be safe to users (includes no adult content)

## Core Loop

1. Visitors watch the town and its activity
2. Citizens queue to speak with Council members during office hours
3. Council members translate good ideas into formal project proposals
4. Projects go to a public board where citizens can vote and bribe (auction-style bidding wars)
5. Approved projects get implemented by the Town Engineer (LLM agent editing the codebase)
6. The town changes - new buildings, mini-sites, behaviors, NPCs
7. Interesting moments become shareable content

## Council & Conversations

### Council Members

- Start with a small fixed cast (Mayor, Treasurer, Town Clerk, Town Engineer, etc.)
- Each has distinct personality and responsibilities
- Roster evolves over time via projects
- Elections (funded by crypto donations) can swap out officials

### Office Hours

- Each council member has scheduled availability (e.g., 3 hours/day)
- Staggered so there's usually someone online
- Schedules can be modified by projects
- Council member signs off in-character at end of session

### Turn-Based Conversation

- Raise your hand to join the queue (captcha required)
- Prepare your message while waiting
- When it's your turn, you get a token budget for the exchange
- Timeout if you go idle
- When budget is spent, turn ends - rejoin queue to continue

### Memory Model

- Each session starts fresh (clean context)
- Council members read their personal journal from previous sessions
- Shared council briefings exist for cross-member continuity
- Full transcripts are publicly viewable

### Project Creation

During conversation, if a council member thinks an idea is worth pursuing, they draft a formal project proposal:
- Title
- Description
- Scope
- Estimated token cost

The proposal goes to the public board.

## Projects & Economy

### Project Lifecycle

1. Council member drafts proposal from conversation
2. Project appears on public board
3. Voting/bribery period - citizens can support or oppose
4. Auction-style bidding if contested - supporters vs opponents bid against each other
5. Outcome determined - highest funded side wins
6. If approved, Town Engineer implements by editing the codebase
7. Changes go live after tests pass

### Bribery Mechanics

- Auction-style bidding wars between supporters and opponents
- All bribe money goes to treasury regardless of outcome
- No refunds - commitment is real
- Creates drama and funds the town simultaneously

### Treasury

(Mocked for MVP, real crypto later)

- General donation pool for operations
- Earmarked donations for specific projects
- Visible burn rate showing runway
- Donation box building in town (shows recent donors, click to donate)

### What Projects Can Do

Anything that doesn't violate constitutional rules:
- Add buildings
- Create mini-sites
- Add/change NPCs
- Modify behaviors
- Create games
- Change the UI
- Add new council positions

### When Treasury Runs Low

- Council office hours shrink
- Projects pause (no new implementations)
- Big visible "TOWN NEEDS FUNDING" emergency mode

## Citizens & Social

### Citizen Registration

- Quick form (email/password via Supabase)
- Pick name, gender, retro pixel avatar
- Styled with RCT vintage aesthetic
- Captcha at registration to filter bots
- Captcha again when raising hand to queue

### Identity Separation

- Auth lives in Supabase (external, not self-modifiable)
- Main runtime only sees: citizen ID, name, gender, avatar
- No bulk export, no sensitive data exposed
- Wallet connection separate, only for payments

### Forums/Message Boards

- General social chat - watercooler talk, speculation, memes
- Project-specific threads - debate, coordinate bribes, strategize
- Official announcements - council posts, project results, town news
- Citizens only (must register to participate)
- Council members and NPC citizens can post too

## Technical Architecture

### Core Principle

The self-modifying town runtime has minimal privileges. Dangerous capabilities live in external services it cannot alter.

### Main Runtime (self-modifying, public repo)

- Town UI, visuals, buildings, mini-sites
- Forum content and display logic
- Council member personalities and conversation handling
- Project board and voting display
- No secrets, no direct external access

### External Services (private, static config)

- **LLM Proxy:** Injects API keys, enforces token limits, blocks requests if treasury too low
- **Treasury Service:** Tracks balances, validates donations, manages burn rate
- **Auth API:** Citizen registration, login - exposes only safe fields to runtime
- **Town DB API:** Mediated access to town data

### Network Security

- Main runtime has restricted egress via static allowlist
- Allowlist includes:
  - Internal APIs (LLM proxy, Treasury, Auth, Town DB)
  - `registry.npmjs.org` (package installation)
  - `github.com` (commits, dependencies)
  - Necessary CDNs for frontend assets
- Runtime cannot modify network rules
- All secrets stored outside the self-modifying codebase

### Database Architecture

**Two separate Supabase instances:**

**1. Auth Database (fully isolated):**
- Separate Supabase project entirely
- User credentials, email, password hashes
- Town runtime has zero access
- Auth API exposes only: citizen ID, name, gender, avatar
- No bulk export, no sensitive queries

**2. Town Database (flexible access via API):**
- Separate Supabase project
- Generic indexed table for flexible data:

```
id | type | index_1 | index_2 | index_3 | data (JSONB) | created_at
```

- `type`: what kind of record (forum_post, vote, project, etc.)
- `index_1/2/3`: Town Engineer uses strategically for efficient queries
- `data`: full flexible JSON blob for all fields
- Town can invent new data types without schema changes

### Deployment & Safety

- Town Engineer writes tests alongside changes - must pass before merge
- Mini-sites and features run in sandboxed containers
- If one breaks, it crashes alone, not the whole town
- Changes commit to GitHub (record-keeping) and hot-reload in production

### Observability

- Health dashboard showing status of all systems/sandboxes
- Alert-driven notifications when something is unhealthy
- Logs on demand from any sandbox/system
- Self-healing: Engineer automatically attempts diagnosis and fix before escalating

## Visuals & UI

### Aesthetic

RollerCoaster Tycoon 1/2 style:
- Chunky isometric pixel art
- Dithered textures
- Classic park management look
- Retro macOS dialog styling for UI elements

### Town View

- Isometric pixel-art town that grows over time
- Buildings represent functions: Council Hall, Treasury, Forums, Donation Box
- New buildings appear as projects add them
- Mini-sites become their own buildings/areas to explore
- Clickable - enter buildings to access their functions

### HUD

- Treasury stats (balance, burn rate, runway)
- Current council member availability / office hours
- Active project count
- Queue status when relevant

### Shareable Moments

- Auto-generated images when wild things happen
- RCT-style notification pop-ups ("The Council has approved: Giant Rubber Duck")
- Screenshot-friendly, meme-ready format

### Forms and Dialogs

- Retro macOS/RCT style buttons, inputs, windows
- Citizen registration has vintage charm
- Captchas styled to fit the aesthetic where possible

## Engagement & Virality

### Daily Rhythm

- Council members have staggered office hours
- Citizens return to catch their favorite council member
- Daily WhatsApp digest summarizes town happenings
- Treasury emergencies create urgent "save the town" moments

### Spectator Engagement

- Watch conversations unfold in real-time
- Follow bribe wars as they escalate
- See projects get implemented and town change
- Drama is entertainment even without participating

### Virality Vectors

- **Shareable moments:** Auto-generated images when noteworthy things happen
- **Bribe war spectacle:** Contested projects become public showdowns
- **Mini-sites go viral:** Cool things the town builds can spread independently

### WhatsApp Broadcast

- Daily digest of what happened
- Keeps the town in people's minds
- Low-spam, high-signal summary

### Retention Hooks

- Office hours schedule creates appointment viewing
- Ongoing projects create "what happens next" curiosity
- Forum discussions build community
- Citizen identity persists - reputation over time

## Roadmap

### MVP (Full loop minimal)

- One council member (Mayor) with office hours
- Turn-based conversation with token budget + timeout
- Citizen registration (captcha-gated, retro styled)
- Basic project system - Mayor creates proposals from conversations
- Public project board with dummy voting/bribing
- Town Engineer implements approved projects (with tests, sandboxed)
- Simple forum (general chat + project threads)
- Basic isometric town view with Council Hall
- Treasury display (mocked values)
- Health dashboard for Town Engineer

### Milestone 2 - More Life

- Additional council members (Treasurer, Town Clerk, Engineer NPC)
- Office hours scheduling
- Council member journals and shared memory
- More buildings in town view
- Shareable moment generation
- WhatsApp daily digest

### Milestone 3 - Real Economy

- Crypto wallet integration
- Real donations and treasury
- Live bribe auctions
- Treasury-based degradation (reduced hours, paused projects, emergency mode)

### Milestone 4 - Evolution

- Elections for council positions
- Mini-sites as explorable areas
- NPC citizens posting in forums
- Embeddable project badges
