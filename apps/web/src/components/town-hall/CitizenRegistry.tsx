'use client';

import { useState } from 'react';
import { CITIZEN_AVATARS, type CitizenAvatar } from '@/data/citizen-avatars';

type RegistryStep = 'welcome' | 'name' | 'avatar' | 'auth' | 'complete';

interface CitizenRegistryProps {
  onRegister: (data: { name: string; avatarId: string; email: string; password: string }) => Promise<void>;
  onSignIn: (data: { email: string; password: string }) => Promise<void>;
  onBack: () => void;
  isAuthenticated: boolean;
}

const CLERK_DIALOGUE = {
  welcome: {
    new: "Welcome to the Citizen Registry Office! I am Clerk Barnacle, keeper of all official records. Are you here to register as a new citizen of Clawntown, or are you a returning resident?",
    authenticated: "Ah, I see you're already registered in our records! Welcome back, citizen. Is there anything else I can help you with today?",
  },
  name: "Excellent! Let's begin the official registration process. According to Town Ordinance 12-A, I shall require your name for the permanent records. What shall I inscribe in the Registry?",
  avatar: "Splendid! Now, for the official portrait. Please select how you wish to appear in the Citizen Registry. Choose wisely - this portrait shall represent you in all town proceedings!",
  auth: "Almost done! For security purposes mandated by Town Ordinance 47-B, I require a secure method of identification. Please provide your credentials for future access to town services.",
  complete: "Congratulations! I hereby officially welcome you as a citizen of Clawntown! Your registration has been recorded in the permanent archives. May your time in our fair town be prosperous!",
  signIn: "Welcome back! Please provide your credentials to access your citizen record.",
  error: "Oh dear, there seems to be a problem with the paperwork. Perhaps we should try again?",
};

export function CitizenRegistry({
  onRegister,
  onSignIn,
  onBack,
  isAuthenticated,
}: CitizenRegistryProps) {
  const [step, setStep] = useState<RegistryStep>('welcome');
  const [mode, setMode] = useState<'register' | 'signin' | null>(null);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<CitizenAvatar | null>(null);
  const [hoveredAvatar, setHoveredAvatar] = useState<CitizenAvatar | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewCitizen = () => {
    setMode('register');
    setStep('name');
    setError(null);
  };

  const handleReturningCitizen = () => {
    setMode('signin');
    setStep('auth');
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
    setSelectedAvatar(avatar);
  };

  const handleAvatarConfirm = () => {
    if (!selectedAvatar) {
      setError('Please select a portrait for the official records.');
      return;
    }
    setError(null);
    setStep('auth');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@')) {
      setError('Please provide a valid correspondence address (email).');
      return;
    }

    if (password.length < 6) {
      setError('Your security key must be at least 6 characters for adequate protection.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('The security keys do not match. Please verify and try again.');
        return;
      }

      if (!selectedAvatar) {
        setError('Portrait selection is required.');
        return;
      }

      setIsLoading(true);
      try {
        await onRegister({
          name: name.trim(),
          avatarId: selectedAvatar.id,
          email,
          password,
        });
        setStep('complete');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await onSignIn({ email, password });
        setStep('complete');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign in failed. Please verify your credentials.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getClerkMessage = () => {
    if (error) return CLERK_DIALOGUE.error + ' ' + error;

    switch (step) {
      case 'welcome':
        return isAuthenticated ? CLERK_DIALOGUE.welcome.authenticated : CLERK_DIALOGUE.welcome.new;
      case 'name':
        return CLERK_DIALOGUE.name;
      case 'avatar':
        return CLERK_DIALOGUE.avatar;
      case 'auth':
        return mode === 'signin' ? CLERK_DIALOGUE.signIn : CLERK_DIALOGUE.auth;
      case 'complete':
        return CLERK_DIALOGUE.complete;
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
          className="font-retro text-xs text-blue-600 hover:underline"
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
        {step === 'welcome' && !isAuthenticated && (
          <div className="space-y-3">
            <button
              onClick={handleNewCitizen}
              className="btn-retro w-full text-xs py-3"
            >
              Register as New Citizen
            </button>
            <button
              onClick={handleReturningCitizen}
              className="btn-retro w-full text-xs py-3"
            >
              Returning Citizen Sign In
            </button>
          </div>
        )}

        {step === 'welcome' && isAuthenticated && (
          <div className="space-y-3">
            <div className="bg-green-100 border border-green-400 rounded p-3">
              <p className="font-retro text-xs text-green-800 text-center">
                You are registered and signed in!
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

            {/* Avatar grid */}
            <div className="grid grid-cols-4 gap-2">
              {CITIZEN_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar)}
                  onMouseEnter={() => setHoveredAvatar(avatar)}
                  onMouseLeave={() => setHoveredAvatar(null)}
                  className={`
                    p-1 rounded border-2 transition-all
                    ${selectedAvatar?.id === avatar.id
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
                disabled={!selectedAvatar}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Auth step */}
        {step === 'auth' && (
          <form onSubmit={handleAuthSubmit} className="space-y-3">
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
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="font-retro text-xs text-gray-600 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="input-retro w-full font-retro text-sm"
                disabled={isLoading}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="font-retro text-xs text-gray-600 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password..."
                  className="input-retro w-full font-retro text-sm"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(mode === 'register' ? 'avatar' : 'welcome')}
                className="btn-retro text-xs flex-1"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-retro text-xs flex-1"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? 'Processing...' : mode === 'register' ? 'Complete Registration' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        {/* Complete step */}
        {step === 'complete' && (
          <div className="space-y-3">
            <div className="bg-green-100 border border-green-400 rounded p-4 text-center">
              <div className="text-3xl mb-2">*</div>
              <p className="font-pixel text-sm text-green-800">
                {mode === 'register' ? 'Registration Complete!' : 'Welcome Back!'}
              </p>
              {selectedAvatar && (
                <img
                  src={selectedAvatar.srcSpinning}
                  alt="Your avatar"
                  className="w-16 h-16 object-contain mx-auto mt-2"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
            </div>
            <button
              onClick={onBack}
              className="btn-retro w-full text-xs py-3"
            >
              Enter Clawntown
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
