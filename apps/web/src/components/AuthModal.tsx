'use client';

import { useState } from 'react';
import { Shield, X, Lock, Mail, User as UserIcon, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; name?: string }, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: isLogin ? undefined : name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      onSuccess(data.user, data.accessToken);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Auth request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-bg-surface border border-accent-cyan-dim/40 rounded p-6 shadow-cyan-glow relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-accent-cyan" />
          <h2 className="text-sm font-mono uppercase tracking-widest text-accent-cyan font-semibold">
            {isLogin ? 'Operator Authentication' : 'Create Operator Account'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-status-error/15 border border-status-error/40 text-status-error text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
                Operator Codename / Name
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded focus-within:border-accent-cyan">
                <UserIcon className="w-4 h-4 text-accent-cyan-dim" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CipherZero"
                  className="w-full bg-transparent border-none outline-none text-xs font-mono text-text-primary placeholder:text-text-muted"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded focus-within:border-accent-cyan">
              <Mail className="w-4 h-4 text-accent-cyan-dim" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@tracemesh.io"
                className="w-full bg-transparent border-none outline-none text-xs font-mono text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-text-secondary mb-1">
              Password
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface-raised border border-accent-cyan-dim/30 rounded focus-within:border-accent-cyan">
              <Lock className="w-4 h-4 text-accent-cyan-dim" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border-none outline-none text-xs font-mono text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent-cyan text-bg-base font-semibold font-mono text-xs uppercase tracking-wider rounded hover:bg-cyan-300 transition-all disabled:opacity-50 shadow-cyan-glow"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Access Console' : 'Register Operator'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-accent-cyan-dim/20 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors"
          >
            {isLogin ? 'Need an account? Register here' : 'Already have credentials? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
