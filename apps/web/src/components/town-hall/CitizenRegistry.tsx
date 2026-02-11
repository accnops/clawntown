'use client';

import { useState } from 'react';
import { CITIZEN_AVATARS, type CitizenAvatar } from '@/data/citizen-avatars';
import { Captcha } from '@/components/auth/Captcha';

type RegistryStep = 'welcome' | 'name' | 'avatar' | 'email' | 'sent';

interface CitizenRegistryProps {
  onSendMagicLink: (email: string, name: string, avatarId: string) => Promise<{ error: Error | null }>;
  onBack: () => void;
}

const CLERK_DIALOGUE = {
  welcome: "Welcome to the Citizen Registry Office! I am Clerk Barnacle, keeper of all official records. Are you here to register as a new citizen of Clawntown, or are you a returning resident?",
  name: "Excellent! Let's begin the official registration process. According to Town Ordinance 12-A, I shall require your name for the permanent records. What shall I inscribe in the Registry?",
  avatar: "Splendid! Now, for the official portrait. Please select how you wish to appear in the Citizen Registry. Choose wisely - this portrait shall represent you in all town proceedings!",
  email: "Almost done! For security purposes mandated by Town Ordinance 47-B, I require a valid correspondence address. A magical verification link shall be dispatched forthwith!",
  sent: "Excellent! The magical verification link has been dispatched to your correspondence address. Please check your inbox and click the link to complete your registration!",
  error: "Oh dear, there seems to be a problem with the paperwork. Perhaps we should try again?",
};

export function CitizenRegistry({
  onSendMagicLink,
  onBack,
}: CitizenRegistryProps) {
  const [step, setStep] = useState<RegistryStep>('welcome');
  const [mode, setMode] = useState<'register' | 'signin' | null>(null);
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hoveredAvatar, setHoveredAvatar] = useState<CitizenAvatar | null>(null);

  const selectedAvatar = CITIZEN_AVATARS.find(a => a.id === avatarId) || null;

  const handleNewCitizen = () => {
    setMode('register');
    setStep('name');
    setError(null);
  };

  const handleSignIn = () => {
    setMode('signin');
    setStep('email');
    setError(null);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Your name must be at least 2 characters, according to Town Ordinance 3-C.');
      return;
    }
    if (name.trim().length > 30) {
      setError('I apologize, but names longer than 30 characters cannot fit in the registry ledger.');
      return;
    }
    setError(null);
    setStep('avatar');
  };

  const handleAvatarSelect = (avatar: CitizenAvatar) => {
    setAvatarId(avatar.id);
  };

  const handleAvatarConfirm = () => {
    if (!avatarId) {
      setError('Please select a portrait for the official records.');
      return;
    }
    setError(null);
    setStep('email');
  };

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
      // Verify captcha
      const captchaResponse = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      });

      if (!captchaResponse.ok) {
        const data = await captchaResponse.json();
        throw new Error(data.error || 'Captcha verification failed');
      }

      // Send magic link
      const result = await onSendMagicLink(
        email,
        mode === 'register' ? name.trim() : '',
        mode === 'register' ? avatarId : ''
      );

      if (result.error) {
        throw result.error;
      }

      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClerkMessage = () => {
    if (error) return CLERK_DIALOGUE.error + ' ' + error;

    switch (step) {
      case 'welcome':
        return CLERK_DIALOGUE.welcome;
      case 'name':
        return CLERK_DIALOGUE.name;
      case 'avatar':
        return CLERK_DIALOGUE.avatar;
      case 'email':
        return CLERK_DIALOGUE.email;
      case 'sent':
        return CLERK_DIALOGUE.sent;
      default:
        return '';
    }
  };

  const displayedAvatar = hoveredAvatar || selectedAvatar;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-400">
        <button
          onClick={onBack}
          className="font-retro text-xs text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Lobby
        </button>
        <h2 className="font-pixel text-sm text-lobster-red">Citizen Registry Office</h2>
      </div>

      {/* Clerk Barnacle dialogue */}
      <div className="flex gap-3">
        <img
          src="/assets/council/clerk_barnacle.png"
          alt="Clerk Barnacle"
          className="w-16 h-16 object-contain shrink-0"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="bg-white border-2 border-gray-400 rounded p-3 relative flex-1">
          <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-400 border-b-8 border-b-transparent" />
          <div className="absolute -left-[6px] top-4 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent" />
          <p className="font-retro text-xs text-gray-700">{getClerkMessage()}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        {/* Welcome step */}
        {step === 'welcome' && (
          <div className="space-y-3">
            <button
              onClick={handleNewCitizen}
              className="btn-retro w-full text-xs py-3"
            >
              Register as New Citizen
            </button>
            <button
              onClick={handleSignIn}
              className="btn-retro w-full text-xs py-3"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Name step */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-3">
            <div>
              <label className="font-retro text-xs text-gray-600 block mb-1">
                Citizen Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="input-retro w-full font-retro text-sm"
                autoFocus
                maxLength={30}
              />
              <p className="font-retro text-[10px] text-gray-500 mt-1">
                {name.length}/30 characters
              </p>
              <p className="font-retro text-[10px] text-gray-400 mt-1">
                Choose a fun alias! This should be fictive, not your real name.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="btn-retro text-xs flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-retro text-xs flex-1"
                disabled={name.trim().length < 2}
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Avatar step */}
        {step === 'avatar' && (
          <div className="space-y-3">
            {/* Preview */}
            <div className="flex justify-center">
              <div className="bg-gray-100 border-2 border-gray-300 rounded p-2 w-24 h-24 flex items-center justify-center">
                {displayedAvatar ? (
                  <img
                    src={hoveredAvatar ? hoveredAvatar.srcSpinning : displayedAvatar.src}
                    alt="Selected avatar"
                    className="w-16 h-16 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="font-retro text-xs text-gray-400">Select</span>
                )}
              </div>
            </div>

            {/* Avatar grid - 4x4 */}
            <div className="grid grid-cols-4 gap-2">
              {CITIZEN_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar)}
                  onMouseEnter={() => setHoveredAvatar(avatar)}
                  onMouseLeave={() => setHoveredAvatar(null)}
                  className={`
                    p-1 rounded border-2 transition-all cursor-pointer
                    ${avatarId === avatar.id
                      ? 'border-lobster-red bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                    }
                  `}
                >
                  <img
                    src={avatar.src}
                    alt={avatar.id}
                    className="w-10 h-10 object-contain mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('name')}
                className="btn-retro text-xs flex-1"
              >
                Back
              </button>
              <button
                onClick={handleAvatarConfirm}
                className="btn-retro text-xs flex-1"
                disabled={!avatarId}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Email step */}
        {step === 'email' && (
          <form onSubmit={handleSubmitEmail} className="space-y-3">
            <div>
              <label className="font-retro text-xs text-gray-600 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-retro w-full font-retro text-sm"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {/* Captcha */}
            <div className="flex justify-center">
              <Captcha
                onVerify={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken(null)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>

            {/* Terms and Privacy */}
            <p className="font-retro text-[10px] text-gray-500 text-center">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(mode === 'register' ? 'avatar' : 'welcome')}
                className="btn-retro text-xs flex-1"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-retro text-xs flex-1"
                disabled={isSubmitting || !email || !captchaToken}
              >
                {isSubmitting ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
          </form>
        )}

        {/* Sent step */}
        {step === 'sent' && (
          <div className="space-y-3">
            <div className="bg-green-100 border border-green-400 rounded p-4 text-center">
              <div className="text-3xl mb-2">*</div>
              <p className="font-pixel text-sm text-green-800">
                Magic Link Sent!
              </p>
              <p className="font-retro text-xs text-green-700 mt-2">
                Check your inbox at:
              </p>
              <p className="font-retro text-xs text-green-800 font-bold">
                {email}
              </p>
            </div>
            <button
              onClick={onBack}
              className="btn-retro w-full text-xs py-3"
            >
              Return to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
