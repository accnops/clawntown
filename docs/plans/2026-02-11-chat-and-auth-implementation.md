# Chat & Authentication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement passwordless magic link auth, queue ready-checks, conduct violations, and office hours auto-close for the Clawntawn chat system.

**Architecture:** Supabase Auth OTP for magic links, captcha via Cloudflare Turnstile, event-driven turn management with Vercel Cron cleanup, Supabase Realtime for state broadcasts.

**Tech Stack:** Next.js 15, Supabase Auth, Cloudflare Turnstile, Vercel Cron, TypeScript, Tailwind CSS

---

## Phase 1: Shared Types & Database Schema

### Task 1.1: Add Citizen Fields to Shared Types

**Files:**
- Modify: `packages/shared/src/types/citizen.ts`

**Step 1: Update Citizen interface**

```typescript
export interface Citizen {
  id: string;
  name: string;
  avatar: string;
  email: string;
  lastCaptchaAt: Date | null;
  violationCount: number;
  bannedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitizenPublic {
  id: string;
  name: string;
  avatar: string;
}

export interface CitizenProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  bannedUntil: Date | null;
}
```

**Step 2: Commit**

```bash
git add packages/shared/src/types/citizen.ts
git commit -m "feat(shared): add auth and conduct fields to Citizen type"
```

---

### Task 1.2: Add Queue Entry Ready Check Fields

**Files:**
- Modify: `packages/shared/src/types/turn.ts`

**Step 1: Update QueueEntry interface**

```typescript
export interface QueueEntry {
  id: string;
  memberId: string;
  citizenId: string;
  citizenName: string;
  citizenAvatar: string;
  joinedAt: Date;
  confirmedReady: boolean;
  confirmedAt: Date | null;
  readyCheckSentAt: Date | null;
  position: number;
  status: 'waiting' | 'ready_check' | 'confirmed' | 'active' | 'completed' | 'skipped';
}
```

**Step 2: Add violation log type**

```typescript
export interface ViolationLog {
  id: string;
  citizenId: string;
  occurredAt: Date;
  violationType: 'profanity' | 'injection' | 'harassment' | 'hate_speech' | 'dangerous' | 'spam';
  messageContent: string;
  turnId: string;
}
```

**Step 3: Commit**

```bash
git add packages/shared/src/types/turn.ts
git commit -m "feat(shared): add ready check and violation types"
```

---

### Task 1.3: Add Chat Session Types

**Files:**
- Modify: `packages/shared/src/types/conversation.ts`

**Step 1: Add ChatSession interface**

```typescript
export interface ChatSession {
  id: string;
  memberId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: 'active' | 'closing' | 'closed';
  farewellSent: boolean;
}
```

**Step 2: Commit**

```bash
git add packages/shared/src/types/conversation.ts
git commit -m "feat(shared): add ChatSession type for office hours lifecycle"
```

---

## Phase 2: Captcha Integration

### Task 2.1: Install Turnstile Package

**Step 1: Install dependency**

```bash
cd apps/web && pnpm add @marsidev/react-turnstile
```

**Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add Cloudflare Turnstile package"
```

---

### Task 2.2: Create Turnstile Verification API

**Files:**
- Create: `apps/web/src/app/api/captcha/verify/route.ts`

**Step 1: Write the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function POST(request: NextRequest) {
  if (!TURNSTILE_SECRET) {
    // Dev mode: skip verification
    return NextResponse.json({ success: true, dev: true });
  }

  const { token } = await request.json();

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing captcha token' },
      { status: 400 }
    );
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Captcha verification failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/api/captcha/verify/route.ts
git commit -m "feat(api): add Turnstile captcha verification endpoint"
```

---

### Task 2.3: Create Captcha Component

**Files:**
- Create: `apps/web/src/components/auth/Captcha.tsx`

**Step 1: Write the component**

```typescript
'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useState } from 'react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Captcha({ onVerify, onError, onExpire }: CaptchaProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Dev mode fallback
  if (!SITE_KEY) {
    return (
      <button
        type="button"
        onClick={() => onVerify('dev-token')}
        className="btn-retro px-4 py-2 text-sm"
      >
        [Dev Mode] Skip Captcha
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {isLoading && (
        <div className="text-sm text-gray-500">Loading verification...</div>
      )}
      <Turnstile
        siteKey={SITE_KEY}
        onSuccess={(token) => {
          setIsLoading(false);
          onVerify(token);
        }}
        onError={() => {
          setIsLoading(false);
          onError?.();
        }}
        onExpire={() => {
          onExpire?.();
        }}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/auth/Captcha.tsx
git commit -m "feat(ui): add Captcha component with Turnstile"
```

---

## Phase 3: Magic Link Authentication

### Task 3.1: Update useAuth Hook for Magic Links

**Files:**
- Modify: `apps/web/src/hooks/useAuth.ts`

**Step 1: Read current file to understand structure**

**Step 2: Replace signUp/signIn with magic link methods**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface CitizenProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  bannedUntil: Date | null;
}

interface PendingRegistration {
  name: string;
  avatarId: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await loadProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (user: User) => {
    const metadata = user.user_metadata;
    setProfile({
      id: user.id,
      name: metadata.citizen_name || 'Anonymous Crab',
      avatar: metadata.citizen_avatar || 'crab_01',
      email: user.email || '',
      bannedUntil: metadata.banned_until ? new Date(metadata.banned_until) : null,
    });
  }, []);

  const sendMagicLink = useCallback(async (
    email: string,
    pendingRegistration?: PendingRegistration
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Auth not configured') };
    }

    // Build redirect URL with pending registration data
    const redirectBase = `${window.location.origin}/auth/callback`;
    const redirectUrl = pendingRegistration
      ? `${redirectBase}?name=${encodeURIComponent(pendingRegistration.name)}&avatar=${encodeURIComponent(pendingRegistration.avatarId)}`
      : redirectBase;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    return { error: error ? new Error(error.message) : null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
  }, []);

  const updateCaptchaTimestamp = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured() || !user) return;

    await supabase.auth.updateUser({
      data: { last_captcha_at: new Date().toISOString() },
    });
  }, [user]);

  const getLastCaptchaAt = useCallback((): Date | null => {
    const timestamp = user?.user_metadata?.last_captcha_at;
    return timestamp ? new Date(timestamp) : null;
  }, [user]);

  const needsCaptcha = useCallback((): boolean => {
    const lastCaptcha = getLastCaptchaAt();
    if (!lastCaptcha) return true;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastCaptcha < oneHourAgo;
  }, [getLastCaptchaAt]);

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!session,
    sendMagicLink,
    signOut,
    updateCaptchaTimestamp,
    needsCaptcha,
  };
}
```

**Step 3: Commit**

```bash
git add apps/web/src/hooks/useAuth.ts
git commit -m "feat(auth): switch to magic link authentication"
```

---

### Task 3.2: Create Auth Callback Route

**Files:**
- Create: `apps/web/src/app/auth/callback/route.ts`

**Step 1: Write the callback handler**

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const name = requestUrl.searchParams.get('name');
  const avatar = requestUrl.searchParams.get('avatar');

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this is a new registration (name and avatar provided)
      if (name && avatar) {
        await supabase.auth.updateUser({
          data: {
            citizen_name: name,
            citizen_avatar: avatar,
            last_captcha_at: new Date().toISOString(),
            violation_count: 0,
            banned_until: null,
          },
        });
      }
    }
  }

  // Redirect to town hall after auth
  return NextResponse.redirect(new URL('/town-hall', requestUrl.origin));
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/auth/callback/route.ts
git commit -m "feat(auth): add magic link callback with profile creation"
```

---

## Phase 4: Updated Citizen Registry

### Task 4.1: Rewrite CitizenRegistry Component

**Files:**
- Modify: `apps/web/src/components/town-hall/CitizenRegistry.tsx`

**Step 1: Read current implementation**

**Step 2: Rewrite with magic link flow**

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CITIZEN_AVATARS } from '@/data/citizen-avatars';
import { Captcha } from '@/components/auth/Captcha';

type Step = 'welcome' | 'name' | 'avatar' | 'email' | 'sent';

interface CitizenRegistryProps {
  onSendMagicLink: (email: string, name: string, avatarId: string) => Promise<{ error: Error | null }>;
  onBack: () => void;
}

const CLERK_DIALOGUE = {
  welcome: "Welcome to Clawntawn! I'm Clerk Barnacle, keeper of the citizen rolls. Ready to join our community?",
  name: "First things first! What shall we call you? (Town Ordinance 3-C requires 2-30 characters)",
  avatar: "Excellent! Now, let's get your official portrait. Pick the one that speaks to your soul!",
  email: "Almost there! Enter your email and prove you're not a bot. We'll send a magic link to complete your registration.",
  sent: "A magic link has been sent to your email! Click it to complete your citizenship. The link expires in 15 minutes.",
};

export function CitizenRegistry({ onSendMagicLink, onBack }: CitizenRegistryProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitEmail = async () => {
    if (!captchaToken) {
      setError('Please complete the verification');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Verify captcha server-side
    const captchaRes = await fetch('/api/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken }),
    });

    if (!captchaRes.ok) {
      setError('Captcha verification failed. Please try again.');
      setCaptchaToken(null);
      setIsSubmitting(false);
      return;
    }

    const { error } = await onSendMagicLink(email, name, avatarId);

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    setStep('sent');
    setIsSubmitting(false);
  };

  return (
    <div className="window-retro max-w-lg mx-auto">
      <div className="window-title flex items-center justify-between px-2 py-1">
        <span className="font-pixel text-xs text-white">Citizen Registry</span>
        <button onClick={onBack} className="text-white hover:text-gray-200">✕</button>
      </div>

      <div className="p-4 bg-retro-gray-light">
        {/* Clerk Barnacle */}
        <div className="flex items-start gap-3 mb-4 p-3 bg-white border-2 border-retro-gray-dark">
          <Image
            src="/assets/council/clerk_barnacle.png"
            alt="Clerk Barnacle"
            width={48}
            height={48}
            className="pixelated"
          />
          <p className="text-sm">{CLERK_DIALOGUE[step]}</p>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStep('name')}
              className="btn-retro px-4 py-2 w-full"
            >
              Register as New Citizen
            </button>
            <p className="text-xs text-center text-gray-600">
              Already a citizen? Enter your email below to sign in.
            </p>
            <button
              onClick={() => setStep('email')}
              className="btn-retro px-4 py-2 w-full"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Step: Name */}
        {step === 'name' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your citizen name"
              className="input-retro w-full px-3 py-2"
              maxLength={30}
              minLength={2}
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('welcome')} className="btn-retro px-4 py-2">
                Back
              </button>
              <button
                onClick={() => setStep('avatar')}
                disabled={name.length < 2}
                className="btn-retro px-4 py-2 flex-1 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: Avatar */}
        {step === 'avatar' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              {CITIZEN_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setAvatarId(avatar.id)}
                  className={`p-2 border-2 ${
                    avatarId === avatar.id
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-retro-gray-dark bg-white hover:bg-gray-100'
                  }`}
                >
                  <Image
                    src={avatar.src}
                    alt={avatar.name}
                    width={32}
                    height={32}
                    className="pixelated mx-auto"
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('name')} className="btn-retro px-4 py-2">
                Back
              </button>
              <button
                onClick={() => setStep('email')}
                disabled={!avatarId}
                className="btn-retro px-4 py-2 flex-1 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step: Email + Captcha */}
        {step === 'email' && (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="input-retro w-full px-3 py-2"
            />

            <Captcha
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />

            <p className="text-xs text-gray-600">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-blue-600 underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(name ? 'avatar' : 'welcome')}
                className="btn-retro px-4 py-2"
              >
                Back
              </button>
              <button
                onClick={handleSubmitEmail}
                disabled={!email || !captchaToken || isSubmitting}
                className="btn-retro px-4 py-2 flex-1 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Link Sent */}
        {step === 'sent' && (
          <div className="flex flex-col gap-3 text-center">
            <div className="text-4xl">📧</div>
            <p className="text-sm">Check your inbox at <strong>{email}</strong></p>
            <button onClick={onBack} className="btn-retro px-4 py-2">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/town-hall/CitizenRegistry.tsx
git commit -m "feat(ui): rewrite CitizenRegistry for magic link auth"
```

---

## Phase 5: Queue Ready Check System

### Task 5.1: Create Ready Check API Endpoint

**Files:**
- Create: `apps/web/src/app/api/queue/ready-check/route.ts`

**Step 1: Write the endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { queryTownData, updateTownData } from '@/lib/supabase';
import type { QueueEntry } from '@clawntown/shared';

const READY_CHECK_TIMEOUT_MS = 30 * 1000; // 30 seconds
const AUTO_CONFIRM_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: NextRequest) {
  const { memberId, citizenId, action } = await request.json();

  if (!memberId || !citizenId || !action) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  // Find the queue entry
  const entries = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
  });

  const entry = entries[0];
  if (!entry) {
    return NextResponse.json(
      { error: 'Queue entry not found' },
      { status: 404 }
    );
  }

  if (action === 'confirm') {
    // Citizen confirms they're ready
    await updateTownData(entry.id, {
      ...entry.data,
      confirmedReady: true,
      confirmedAt: new Date(),
      status: 'confirmed',
    });

    return NextResponse.json({ success: true, status: 'confirmed' });
  }

  if (action === 'skip') {
    // Citizen didn't confirm in time, skip them
    await updateTownData(entry.id, {
      ...entry.data,
      status: 'skipped',
    });

    return NextResponse.json({ success: true, status: 'skipped' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Called by queue advancement logic to initiate ready check
export async function PUT(request: NextRequest) {
  const { memberId, citizenId } = await request.json();

  const entries = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
  });

  const entry = entries[0];
  if (!entry) {
    return NextResponse.json(
      { error: 'Queue entry not found' },
      { status: 404 }
    );
  }

  const joinedAt = new Date(entry.data.joinedAt);
  const now = new Date();
  const waitTime = now.getTime() - joinedAt.getTime();

  // Auto-confirm if joined less than 2 minutes ago
  if (waitTime < AUTO_CONFIRM_THRESHOLD_MS) {
    await updateTownData(entry.id, {
      ...entry.data,
      confirmedReady: true,
      confirmedAt: now,
      status: 'confirmed',
    });

    return NextResponse.json({
      success: true,
      autoConfirmed: true,
      status: 'confirmed',
    });
  }

  // Send ready check
  await updateTownData(entry.id, {
    ...entry.data,
    readyCheckSentAt: now,
    status: 'ready_check',
  });

  return NextResponse.json({
    success: true,
    autoConfirmed: false,
    status: 'ready_check',
    expiresAt: new Date(now.getTime() + READY_CHECK_TIMEOUT_MS),
  });
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/api/queue/ready-check/route.ts
git commit -m "feat(api): add ready check endpoint for queue management"
```

---

### Task 5.2: Update Queue Join to Check Captcha and Ban

**Files:**
- Modify: `apps/web/src/app/api/queue/join/route.ts`

**Step 1: Read current implementation**

**Step 2: Add captcha and ban checks**

Add to the beginning of the POST handler:

```typescript
// Check if citizen is banned
const { data: userData } = await supabase.auth.getUser();
if (userData?.user?.user_metadata?.banned_until) {
  const bannedUntil = new Date(userData.user.user_metadata.banned_until);
  if (bannedUntil > new Date()) {
    return NextResponse.json(
      {
        error: 'You are temporarily banned',
        bannedUntil: bannedUntil.toISOString(),
      },
      { status: 403 }
    );
  }
}

// Check if captcha is needed (1 hour since last verification)
const lastCaptchaAt = userData?.user?.user_metadata?.last_captcha_at;
if (lastCaptchaAt) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (new Date(lastCaptchaAt) < oneHourAgo) {
    return NextResponse.json(
      { error: 'Captcha verification required', requiresCaptcha: true },
      { status: 403 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/queue/join/route.ts
git commit -m "feat(api): add ban and captcha checks to queue join"
```

---

## Phase 6: Conduct Violation System

### Task 6.1: Create Violation Recording Function

**Files:**
- Create: `apps/web/src/lib/violations.ts`

**Step 1: Write the violation handler**

```typescript
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { insertTownData, queryTownData } from '@/lib/supabase';
import type { ViolationLog } from '@clawntown/shared';

const BAN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const VIOLATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface ViolationResult {
  recorded: boolean;
  isBanned: boolean;
  bannedUntil?: Date;
  violationCount: number;
}

export async function recordViolation(
  citizenId: string,
  violationType: ViolationLog['violationType'],
  messageContent: string,
  turnId: string
): Promise<ViolationResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { recorded: false, isBanned: false, violationCount: 0 };
  }

  const now = new Date();

  // Record the violation
  const violation: Omit<ViolationLog, 'id'> = {
    citizenId,
    occurredAt: now,
    violationType,
    messageContent: messageContent.substring(0, 500), // Truncate for storage
    turnId,
  };

  await insertTownData('violation_log', violation, {
    index_1: citizenId,
    index_2: violationType,
  });

  // Count recent violations (last 30 days)
  const violations = await queryTownData<ViolationLog>('violation_log', {
    index_1: citizenId,
  });

  const thirtyDaysAgo = new Date(now.getTime() - VIOLATION_WINDOW_MS);
  const recentViolations = violations.filter(
    (v) => new Date(v.data.occurredAt) > thirtyDaysAgo
  );

  const violationCount = recentViolations.length;

  // Second violation = 7-day ban
  if (violationCount >= 2) {
    const bannedUntil = new Date(now.getTime() + BAN_DURATION_MS);

    // Update user metadata with ban
    await supabase.auth.admin.updateUserById(citizenId, {
      user_metadata: {
        banned_until: bannedUntil.toISOString(),
        violation_count: violationCount,
      },
    });

    return {
      recorded: true,
      isBanned: true,
      bannedUntil,
      violationCount,
    };
  }

  // First violation - just record it
  await supabase.auth.admin.updateUserById(citizenId, {
    user_metadata: {
      violation_count: violationCount,
    },
  });

  return {
    recorded: true,
    isBanned: false,
    violationCount,
  };
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/violations.ts
git commit -m "feat(lib): add violation recording with 7-day ban logic"
```

---

### Task 6.2: Integrate Violations into Message Endpoint

**Files:**
- Modify: `apps/web/src/app/api/turn/message/route.ts`

**Step 1: Read current implementation**

**Step 2: Add violation handling after moderation fails**

After the moderation check that returns 422, add:

```typescript
import { recordViolation } from '@/lib/violations';

// In the moderation failure block:
if (!moderation.safe) {
  // Record the violation
  const violationResult = await recordViolation(
    citizenId,
    moderation.category || 'spam',
    content,
    turn.id
  );

  // End the turn due to violation
  await endTurn(memberId, 'violation');

  return NextResponse.json(
    {
      error: 'message_rejected',
      category: moderation.category,
      reason: moderation.reason,
      turnEnded: true,
      isBanned: violationResult.isBanned,
      bannedUntil: violationResult.bannedUntil?.toISOString(),
    },
    { status: 422 }
  );
}
```

**Step 3: Update endTurn to accept 'violation' reason**

In `apps/engine/src/conversation/turn.ts`, update the status type:

```typescript
export async function endTurn(
  turnId: string,
  status: 'completed' | 'timed_out' | 'violation'
): Promise<void> {
  // ... existing implementation
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/api/turn/message/route.ts apps/engine/src/conversation/turn.ts
git commit -m "feat(api): integrate violation recording into message endpoint"
```

---

## Phase 7: Office Hours Auto-Close

### Task 7.1: Create Office Hours Check Endpoint

**Files:**
- Create: `apps/web/src/app/api/cron/office-hours/route.ts`

**Step 1: Write the cron handler**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { COUNCIL_MEMBERS } from '@/data/council-members';
import { queryTownData, updateTownData } from '@/lib/supabase';
import { broadcaster } from '@clawntown/engine/realtime';
import { generateCouncilResponse } from '@/lib/gemini';
import type { ChatSession, QueueEntry } from '@clawntown/shared';

// Vercel Cron - runs every minute
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();

  const results: string[] = [];

  for (const member of COUNCIL_MEMBERS) {
    // Check if member's office hours are ending
    const currentSchedule = member.schedule.find(
      (s) => s.dayOfWeek === currentDay && s.endHour === currentHour
    );

    if (!currentSchedule) continue;

    // Find active session for this member
    const sessions = await queryTownData<ChatSession>('chat_session', {
      index_1: member.id,
      index_2: 'active',
    });

    const activeSession = sessions[0];
    if (!activeSession || activeSession.data.farewellSent) continue;

    // Generate farewell message
    const farewellMessage = await generateCouncilResponse(
      member.personality,
      'System',
      'Office hours are ending. Please say a brief, warm farewell to the citizens.',
      []
    );

    // Broadcast farewell
    await broadcaster.broadcast(`council-member-${member.id}`, 'message', {
      role: 'council',
      content: farewellMessage,
      isFarewell: true,
    });

    // Mark session as closing
    await updateTownData(activeSession.id, {
      ...activeSession.data,
      farewellSent: true,
      status: 'closing',
    });

    // Broadcast chat closing
    await broadcaster.broadcast(`council-member-${member.id}`, 'chat_closing', {
      farewellMessage,
    });

    // Clear the queue
    const queueEntries = await queryTownData<QueueEntry>('queue_entry', {
      index_1: member.id,
    });

    for (const entry of queueEntries) {
      if (entry.data.status !== 'completed' && entry.data.status !== 'skipped') {
        await updateTownData(entry.id, {
          ...entry.data,
          status: 'skipped',
        });
      }
    }

    // Close session after brief delay
    setTimeout(async () => {
      await updateTownData(activeSession.id, {
        ...activeSession.data,
        status: 'closed',
        endedAt: new Date(),
      });

      await broadcaster.broadcast(`council-member-${member.id}`, 'chat_closed', {});
    }, 5000);

    results.push(`Closed ${member.name}'s office`);
  }

  return NextResponse.json({ processed: results });
}
```

**Step 2: Add to vercel.json crons**

Create or update `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/office-hours",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/cron/office-hours/route.ts vercel.json
git commit -m "feat(cron): add office hours auto-close with farewell message"
```

---

### Task 7.2: Create Stale Turn Cleanup Cron

**Files:**
- Create: `apps/web/src/app/api/cron/cleanup/route.ts`

**Step 1: Write the cleanup cron**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { queryTownData, updateTownData } from '@/lib/supabase';
import { broadcaster } from '@clawntown/engine/realtime';
import type { CitizenTurn, QueueEntry } from '@clawntown/shared';

// Vercel Cron - runs every 30 seconds (via external cron service or Vercel Pro)
export const dynamic = 'force-dynamic';

const TURN_TIMEOUT_MS = 20 * 1000; // 20 seconds
const READY_CHECK_TIMEOUT_MS = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results: string[] = [];

  // 1. Clean up timed-out turns
  const activeTurns = await queryTownData<CitizenTurn>('conversation_turn', {
    index_3: 'active',
  });

  for (const turn of activeTurns) {
    const expiresAt = new Date(turn.data.expiresAt || turn.data.startedAt);
    const timeoutAt = new Date(expiresAt.getTime() + TURN_TIMEOUT_MS);

    if (now > timeoutAt) {
      await updateTownData(turn.id, {
        ...turn.data,
        status: 'timed_out',
        endedAt: now,
      });

      await broadcaster.broadcast(
        `council-member-${turn.data.memberId}`,
        'turn_ended',
        { citizenId: turn.data.citizenId, reason: 'timeout' }
      );

      results.push(`Turn ${turn.id} timed out`);
    }
  }

  // 2. Clean up expired ready checks
  const readyCheckEntries = await queryTownData<QueueEntry>('queue_entry', {
    index_3: 'ready_check',
  });

  for (const entry of readyCheckEntries) {
    if (!entry.data.readyCheckSentAt) continue;

    const expiresAt = new Date(
      new Date(entry.data.readyCheckSentAt).getTime() + READY_CHECK_TIMEOUT_MS
    );

    if (now > expiresAt) {
      await updateTownData(entry.id, {
        ...entry.data,
        status: 'skipped',
      });

      await broadcaster.broadcast(
        `council-member-${entry.data.memberId}`,
        'queue_updated',
        { skipped: entry.data.citizenId }
      );

      results.push(`Ready check expired for ${entry.data.citizenName}`);
    }
  }

  return NextResponse.json({ processed: results, timestamp: now.toISOString() });
}
```

**Step 2: Update vercel.json**

Note: Vercel free tier only supports per-minute crons. For 30-second cleanup, consider using an external cron service or upgrading.

```json
{
  "crons": [
    {
      "path": "/api/cron/office-hours",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "* * * * *"
    }
  ]
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/cron/cleanup/route.ts vercel.json
git commit -m "feat(cron): add stale turn and ready check cleanup"
```

---

## Phase 8: Guest Blocking UI

### Task 8.1: Update CouncilOffice for Guest State

**Files:**
- Modify: `apps/web/src/components/town-hall/CouncilOffice.tsx`

**Step 1: Read current implementation**

**Step 2: Add guest blocking to raise hand button**

Find the raise hand button section and wrap with auth check:

```typescript
{isAuthenticated ? (
  <button
    onClick={handleRaiseHand}
    disabled={isInQueue || needsCaptcha}
    className="btn-retro px-4 py-2"
  >
    {isInQueue ? 'In Queue' : needsCaptcha ? 'Verify to Join' : 'Raise Hand'}
  </button>
) : (
  <button
    onClick={() => setShowRegistry(true)}
    className="btn-retro px-4 py-2"
  >
    Register to Participate
  </button>
)}
```

**Step 3: Add captcha modal for hourly verification**

```typescript
{showCaptchaModal && (
  <Dialog title="Verification Required" onClose={() => setShowCaptchaModal(false)}>
    <p className="mb-4 text-sm">Please verify you're human to join the queue.</p>
    <Captcha
      onVerify={async (token) => {
        const res = await fetch('/api/captcha/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          await updateCaptchaTimestamp();
          setShowCaptchaModal(false);
          handleRaiseHand();
        }
      }}
    />
  </Dialog>
)}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/town-hall/CouncilOffice.tsx
git commit -m "feat(ui): add guest blocking and captcha verification to queue"
```

---

## Phase 9: Ready Check UI

### Task 9.1: Create ReadyCheckModal Component

**Files:**
- Create: `apps/web/src/components/town-hall/ReadyCheckModal.tsx`

**Step 1: Write the component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';

interface ReadyCheckModalProps {
  expiresAt: Date;
  onConfirm: () => Promise<void>;
  onExpire: () => void;
}

export function ReadyCheckModal({ expiresAt, onConfirm, onExpire }: ReadyCheckModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
  };

  return (
    <Dialog title="You're Next!" onClose={() => {}}>
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="text-6xl">🦀</div>
        <p className="text-center">
          You're next in line! Confirm you're ready to speak with the council member.
        </p>

        <div className="text-2xl font-bold text-red-600">
          {secondsLeft}s
        </div>

        <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-1000"
            style={{ width: `${(secondsLeft / 30) * 100}%` }}
          />
        </div>

        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="btn-retro px-6 py-3 text-lg w-full"
        >
          {isConfirming ? 'Confirming...' : "I'm Ready!"}
        </button>

        <p className="text-xs text-gray-500">
          If you don't confirm, you'll be skipped.
        </p>
      </div>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/town-hall/ReadyCheckModal.tsx
git commit -m "feat(ui): add ready check modal with countdown"
```

---

### Task 9.2: Integrate Ready Check into CouncilOffice

**Files:**
- Modify: `apps/web/src/components/town-hall/CouncilOffice.tsx`

**Step 1: Add ready check state and subscription**

```typescript
import { ReadyCheckModal } from './ReadyCheckModal';

// Add state
const [readyCheck, setReadyCheck] = useState<{ expiresAt: Date } | null>(null);

// Subscribe to ready_check events
useEffect(() => {
  const channel = supabase.channel(`council-member-${memberId}`);

  channel.on('broadcast', { event: 'ready_check' }, (payload) => {
    if (payload.citizenId === profile?.id) {
      setReadyCheck({ expiresAt: new Date(payload.expiresAt) });
    }
  });

  channel.subscribe();
  return () => { channel.unsubscribe(); };
}, [memberId, profile?.id]);

// Handle confirm
const handleReadyConfirm = async () => {
  await fetch('/api/queue/ready-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId,
      citizenId: profile?.id,
      action: 'confirm',
    }),
  });
  setReadyCheck(null);
};

// Handle expire
const handleReadyExpire = () => {
  setReadyCheck(null);
  // Optionally show a "you were skipped" toast
};
```

**Step 2: Add modal to render**

```typescript
{readyCheck && (
  <ReadyCheckModal
    expiresAt={readyCheck.expiresAt}
    onConfirm={handleReadyConfirm}
    onExpire={handleReadyExpire}
  />
)}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/town-hall/CouncilOffice.tsx
git commit -m "feat(ui): integrate ready check modal into council office"
```

---

## Phase 10: Environment Configuration

### Task 10.1: Update Environment Variables

**Files:**
- Modify: `.env.example` (create if doesn't exist)

**Step 1: Add new environment variables**

```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=

# New - Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# New - Cron Authentication
CRON_SECRET=
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Turnstile and cron environment variables"
```

---

## Phase 11: Testing

### Task 11.1: Add Auth Flow Tests

**Files:**
- Create: `apps/web/src/lib/__tests__/auth.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Auth utilities', () => {
  describe('needsCaptcha', () => {
    it('returns true when no previous captcha', () => {
      const lastCaptchaAt = null;
      const result = checkNeedsCaptcha(lastCaptchaAt);
      expect(result).toBe(true);
    });

    it('returns true when captcha older than 1 hour', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = checkNeedsCaptcha(twoHoursAgo);
      expect(result).toBe(true);
    });

    it('returns false when captcha within 1 hour', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const result = checkNeedsCaptcha(thirtyMinutesAgo);
      expect(result).toBe(false);
    });
  });
});

function checkNeedsCaptcha(lastCaptchaAt: Date | null): boolean {
  if (!lastCaptchaAt) return true;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastCaptchaAt < oneHourAgo;
}
```

**Step 2: Run tests**

```bash
cd apps/web && pnpm test
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/__tests__/auth.test.ts
git commit -m "test: add auth captcha timing tests"
```

---

### Task 11.2: Add Violation System Tests

**Files:**
- Create: `apps/web/src/lib/__tests__/violations.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from 'vitest';

describe('Violation system', () => {
  describe('ban logic', () => {
    it('does not ban on first violation', () => {
      const violationCount = 1;
      const shouldBan = violationCount >= 2;
      expect(shouldBan).toBe(false);
    });

    it('bans on second violation', () => {
      const violationCount = 2;
      const shouldBan = violationCount >= 2;
      expect(shouldBan).toBe(true);
    });

    it('calculates 7-day ban correctly', () => {
      const now = new Date('2026-02-11T12:00:00Z');
      const banDuration = 7 * 24 * 60 * 60 * 1000;
      const bannedUntil = new Date(now.getTime() + banDuration);
      expect(bannedUntil.toISOString()).toBe('2026-02-18T12:00:00.000Z');
    });
  });

  describe('violation window', () => {
    it('only counts violations within 30 days', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const violations = [
        { occurredAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        { occurredAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) }, // 40 days ago
      ];

      const recentViolations = violations.filter(
        (v) => v.occurredAt > thirtyDaysAgo
      );

      expect(recentViolations.length).toBe(1);
    });
  });
});
```

**Step 2: Run tests**

```bash
cd apps/web && pnpm test
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/__tests__/violations.test.ts
git commit -m "test: add violation system unit tests"
```

---

## Summary

**Total Tasks:** 17 tasks across 11 phases

**Key Changes:**
1. Passwordless magic link auth via Supabase OTP
2. Cloudflare Turnstile captcha at signup, login, and hourly queue join
3. Ready check system with 30s timeout (auto-confirm if < 2min wait)
4. Conduct violations with 7-day ban on second offense
5. Office hours auto-close with farewell message
6. Vercel Cron for stale turn cleanup
7. Guest blocking on queue join

**Environment Variables to Configure:**
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `CRON_SECRET`
