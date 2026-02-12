# Auth Flow Redesign: Unverified User Creation

## Problem

Users can get stuck during signup if their magic link fails (expired, network error, different browser). The profile data (name, avatar) is encoded in the magic link URL, so if it fails, that data is lost. Signing in as a "returning user" creates an account without their profile.

## Solution

Create the user upfront (unverified) when they submit the signup form. Profile data is stored in `user_metadata`, not the URL. The magic link becomes purely for email verification.

## Design

### Signup Flow (New)

1. User fills form: name → avatar → email → captcha
2. Server-side API route (`/api/auth/signup`):
   - Call `admin.createUser({ email, email_confirm: false, user_metadata: { citizen_name, citizen_avatar } })`
   - If email already exists: just proceed to send magic link
   - Call `signInWithOtp({ email })` to send Supabase's built-in magic link email
3. Show "Magic link sent!" confirmation

### Callback Flow (Simplified)

1. User clicks magic link
2. Supabase verifies email (sets `email_confirmed_at`)
3. Callback page detects sign-in
4. Check: does user have a `citizens` row?
5. If not: create from `user_metadata`
6. Redirect to town with welcome

### Sign-In Flow (Unchanged for users)

- `signInWithOtp({ email })` sends magic link
- Works for both verified and unverified users
- Callback creates `citizens` row if missing

### Population Count (Unchanged)

- Queries `citizens` table
- Only verified users have `citizens` rows
- Unverified users don't affect count

## Edge Cases

**User signs up twice before verifying:**
- `admin.createUser` fails (email exists)
- Detect and send new magic link instead
- Original profile metadata preserved

**User wants different name/avatar on retry:**
- Original choices stick (stored from first signup)
- Future: add profile editing feature

**Abandoned unverified users:**
- Harmless (no `citizens` row)
- Optional future cleanup cron, not needed now

## Email Template Update

Update Supabase magic link template to include:

> "If this link has expired, you can request a new one by visiting [site] and choosing 'Sign In' with your email address."

## Files to Change

1. **New:** `/api/auth/signup/route.ts` - server-side user creation
2. **Modify:** `CitizenRegistry.tsx` - call new API instead of `sendMagicLink` directly
3. **Modify:** `useAuth.ts` - remove `pendingRegistration` URL param logic from `sendMagicLink`
4. **Modify:** `/auth/callback/page.tsx` - remove URL param handling, add `citizens` row creation
5. **Supabase Dashboard:** Update email template
