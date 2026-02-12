# Auth Flow Redesign: Unverified User Creation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix magic link failure causing lost profile data by creating unverified users upfront with metadata stored server-side.

**Architecture:** Create user via admin API on signup form submit (email unverified), send magic link for verification only. Callback page creates `citizens` row when email is verified. Sign-in flow unchanged but also triggers citizen creation if missing.

**Tech Stack:** Next.js API routes, Supabase Admin API, TypeScript

---

## Problem

Users can get stuck during signup if their magic link fails (expired, network error, different browser). The profile data (name, avatar) is encoded in the magic link URL, so if it fails, that data is lost. Signing in as a "returning user" creates an account without their profile.

## Solution

Create the user upfront (unverified) when they submit the signup form. Profile data is stored in `user_metadata`, not the URL. The magic link becomes purely for email verification.

---

## Implementation Tasks

### Task 1: Create signup API route

**Files:**
- Create: `apps/web/src/app/api/auth/signup/route.ts`

**Step 1: Create the signup API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { email, name, avatarId, captchaToken } = await request.json();

    if (!email || !captchaToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify captcha
    const captchaResponse = await fetch(new URL('/api/captcha/verify', request.url).origin + '/api/captcha/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: captchaToken }),
    });

    if (!captchaResponse.ok) {
      const data = await captchaResponse.json();
      return NextResponse.json({ error: data.error || 'Captcha verification failed' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // User exists - just send a new magic link (works for both verified and unverified)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${request.headers.get('origin')}/auth/callback`,
        },
      });

      if (otpError) {
        console.error('Error sending magic link:', otpError);
        return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Magic link sent' });
    }

    // Create new unverified user with profile metadata
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        citizen_name: name || 'Anonymous Crab',
        citizen_avatar: avatarId || 'citizen_01',
        last_captcha_at: new Date().toISOString(),
        violation_count: 0,
        banned_until: null,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Send magic link for verification
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${request.headers.get('origin')}/auth/callback`,
      },
    });

    if (otpError) {
      console.error('Error sending magic link:', otpError);
      return NextResponse.json({ error: 'Account created but failed to send magic link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account created and magic link sent' });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
```

**Step 2: Verify the file compiles**

Run: `pnpm build:check`
Expected: No TypeScript errors for the new file

**Step 3: Commit**

```bash
git add apps/web/src/app/api/auth/signup/route.ts
git commit -m "feat(auth): add server-side signup API route"
```

---

### Task 2: Update CitizenRegistry to call new API

**Files:**
- Modify: `apps/web/src/components/town-hall/CitizenRegistry.tsx`

**Step 1: Replace onSendMagicLink with direct API call**

Change the `handleSubmitEmail` function to call the new `/api/auth/signup` endpoint directly, removing the dependency on the parent's `onSendMagicLink` prop for registration.

The key changes:
1. For `mode === 'register'`: call `/api/auth/signup` with name, avatarId, email, captchaToken
2. For `mode === 'signin'`: keep calling `onSendMagicLink` (which just sends OTP)

Update interface:
```typescript
interface CitizenRegistryProps {
  onSendMagicLink: (email: string) => Promise<{ error: Error | null }>;  // simplified - just email
  onBack: () => void;
}
```

Update `handleSubmitEmail`:
```typescript
const handleSubmitEmail = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!email.includes('@')) {
    setError('Please provide a valid correspondence address (email).');
    return;
  }

  if (!captchaToken) {
    setError('Please complete the verification challenge.');
    return;
  }

  setIsSubmitting(true);

  try {
    if (mode === 'register') {
      // New signup flow - call server-side API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name.trim(),
          avatarId,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
    } else {
      // Sign-in flow - verify captcha first, then send magic link
      const captchaResponse = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });

      if (!captchaResponse.ok) {
        const data = await captchaResponse.json();
        throw new Error(data.error || 'Captcha verification failed');
      }

      const result = await onSendMagicLink(email);
      if (result.error) {
        throw result.error;
      }
    }

    setStep('sent');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to send magic link. Please try again.');
    setCaptchaToken(null);
    captchaRef.current?.reset();
  } finally {
    setIsSubmitting(false);
  }
};
```

**Step 2: Verify the file compiles**

Run: `pnpm build:check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/components/town-hall/CitizenRegistry.tsx
git commit -m "feat(auth): update CitizenRegistry to use server-side signup"
```

---

### Task 3: Simplify useAuth hook

**Files:**
- Modify: `apps/web/src/hooks/useAuth.ts`

**Step 1: Remove pendingRegistration from sendMagicLink**

Simplify `sendMagicLink` to only take email - no more URL params for profile:

```typescript
const sendMagicLink = useCallback(async (email: string): Promise<{ error: Error | null }> => {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Auth not configured') };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error: error ? new Error(error.message) : null };
}, []);
```

Also remove the `PendingRegistration` interface since it's no longer used.

**Step 2: Verify the file compiles**

Run: `pnpm build:check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/hooks/useAuth.ts
git commit -m "refactor(auth): simplify sendMagicLink - remove URL params"
```

---

### Task 4: Update page.tsx to match new interface

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Step 1: Simplify onSendMagicLink prop**

Update the CitizenRegistry usage:
```typescript
{townHallView === 'registry' && (
  <CitizenRegistry
    onSendMagicLink={async (email) => {
      return sendMagicLink(email);
    }}
    onBack={handleBackToLobby}
  />
)}
```

**Step 2: Verify the file compiles**

Run: `pnpm build:check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "refactor(auth): update page.tsx for simplified magic link"
```

---

### Task 5: Update callback page to create citizens row

**Files:**
- Modify: `apps/web/src/app/auth/callback/[[...params]]/page.tsx`

**Step 1: Remove URL params handling, add citizens creation**

Replace the entire callback page with simplified version that:
1. Waits for auth state change (SIGNED_IN)
2. Calls a new API endpoint to ensure citizen row exists
3. Redirects to town

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Wait for Supabase to process the magic link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // No session yet - wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === 'SIGNED_IN' && session?.user) {
                await ensureCitizenExists(session.user.id);
                setStatus('success');
                subscription.unsubscribe();
                setTimeout(() => router.push('/?welcome=citizen'), 1000);
              }
            }
          );

          // Timeout after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            setError('Authentication timed out. Please try again.');
            setStatus('error');
          }, 10000);

          return;
        }

        // Session exists - ensure citizen record
        await ensureCitizenExists(session.user.id);
        setStatus('success');
        setTimeout(() => router.push('/?welcome=citizen'), 1000);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleAuth();
  }, [router]);

  // Helper to ensure citizen row exists
  const ensureCitizenExists = async (userId: string) => {
    const response = await fetch('/api/auth/ensure-citizen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create citizen record');
    }
  };

  return (
    <div className="min-h-screen bg-sky-200 flex items-center justify-center">
      <div className="bg-white border-4 border-gray-800 rounded-lg p-8 max-w-md text-center shadow-lg">
        {status === 'processing' && (
          <>
            <div className="text-4xl mb-4 animate-bounce">🦞</div>
            <p className="font-pixel text-lg text-gray-800">Verifying your citizenship...</p>
            <p className="font-retro text-sm text-gray-600 mt-2">Please wait while we process your credentials.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <p className="font-pixel text-lg text-green-700">Welcome to Clawntown!</p>
            <p className="font-retro text-sm text-gray-600 mt-2">Redirecting you to the town...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <p className="font-pixel text-lg text-red-700">Authentication Failed</p>
            <p className="font-retro text-sm text-gray-600 mt-2">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="btn-retro mt-4 px-4 py-2 text-sm"
            >
              Return to Town
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `pnpm build:check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/app/auth/callback/[[...params]]/page.tsx
git commit -m "refactor(auth): simplify callback - remove URL params, add citizen creation"
```

---

### Task 6: Create ensure-citizen API route

**Files:**
- Create: `apps/web/src/app/api/auth/ensure-citizen/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user data
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userData.user;
    const citizenName = user.user_metadata?.citizen_name || 'Anonymous Crab';
    const citizenAvatar = user.user_metadata?.citizen_avatar || 'citizen_01';

    // Upsert citizen record
    const { error: upsertError } = await supabase
      .from('citizens')
      .upsert({
        id: userId,
        name: citizenName,
        avatar: citizenAvatar,
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting citizen:', upsertError);
      return NextResponse.json({ error: 'Failed to create citizen record' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ensure citizen error:', error);
    return NextResponse.json({ error: 'Failed to ensure citizen' }, { status: 500 });
  }
}
```

**Step 2: Verify the file compiles**

Run: `pnpm build:check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/app/api/auth/ensure-citizen/route.ts
git commit -m "feat(auth): add ensure-citizen API route for callback"
```

---

### Task 7: Final verification and cleanup

**Step 1: Run full type check**

Run: `pnpm build:check`
Expected: No TypeScript errors

**Step 2: Test the flows manually**

1. New signup: name → avatar → email → magic link → click → verify citizen created
2. Sign-in: email → magic link → click → verify sign-in works
3. Failed magic link retry: sign in again → new link → click → works

**Step 3: Final commit with all changes**

```bash
git add -A
git commit -m "feat(auth): complete auth flow redesign - unverified user creation

- Create users upfront with admin API (email_confirm: false)
- Store profile data in user_metadata, not URL
- Magic link purely for email verification
- Callback creates citizens row on verification
- Sign-in flow can recover stuck users

Closes the 'stuck user' problem where magic link failure lost profile data."
```

---

## Manual Step: Update Supabase Email Template

In Supabase Dashboard → Authentication → Email Templates → Magic Link:

Add to the email body:
> "If this link has expired or doesn't work, you can request a new one by visiting clawntown.com and choosing 'Sign In' with your email address."
