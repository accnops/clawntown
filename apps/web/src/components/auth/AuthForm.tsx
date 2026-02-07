'use client';

import { useState } from 'react';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, name: string) => Promise<void>;
  onClose?: () => void;
}

export function AuthForm({ onSignIn, onSignUp, onClose }: AuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter a citizen name');
        }
        await onSignUp(email, password, name.trim());
      }
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex mb-4 border-b border-gray-400">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 py-2 font-retro text-xs cursor-pointer ${
            mode === 'signin'
              ? 'bg-white border-t border-l border-r border-gray-400 -mb-px'
              : 'bg-gray-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 font-retro text-xs cursor-pointer ${
            mode === 'signup'
              ? 'bg-white border-t border-l border-r border-gray-400 -mb-px'
              : 'bg-gray-200'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="block font-retro text-xs text-gray-700 mb-1">
              Citizen Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-retro w-full font-retro text-xs"
              placeholder="Your name in Clawntown"
              required={mode === 'signup'}
            />
          </div>
        )}

        <div>
          <label className="block font-retro text-xs text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-retro w-full font-retro text-xs"
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label className="block font-retro text-xs text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-retro w-full font-retro text-xs"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
            <p className="font-retro text-xs">{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="btn-retro w-full"
          disabled={isLoading}
        >
          {isLoading
            ? 'Loading...'
            : mode === 'signin'
            ? '🔑 Sign In'
            : '🦞 Join Clawntown'}
        </button>
      </form>

      {mode === 'signup' && (
        <p className="font-retro text-[10px] text-gray-500 text-center mt-3">
          By registering, you agree to be a good citizen of Clawntown!
        </p>
      )}
    </div>
  );
}
