import React, { useState } from 'react';
import { Layers, ArrowRight, ShieldCheck, Zap, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { SetupGuideModal } from '../setup/SetupGuideModal';

export function AuthPage() {
  const { login, register, isConfigured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-8 z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mb-3 glow-indigo">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">DevFlow</h1>
          <p className="text-xs text-slate-400 mt-1">
            Full-Stack Developer Workflow & Automation Hub
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              !isRegister
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              isRegister
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Configuration Notice if missing */}
        {!isConfigured && (
          <div className="mb-4">
            <Alert
              variant="warning"
              title="Appwrite Not Configured"
              message="Please configure your VITE_APPWRITE_* credentials in .env to connect authentication."
            />
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline block text-center w-full cursor-pointer"
            >
              View Appwrite Setup Guide &rarr;
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Authentication Error" message={error} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <Input
                label="Full Name"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Developer"
                required
              />
            </div>
          )}

          <div>
            <Input
              label="Email Address"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          <div>
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Must be at least 8 characters"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            disabled={!isConfigured || loading}
            className="w-full mt-2"
          >
            <span>{isRegister ? 'Register & Enter DevFlow' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Security Footer */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secured via Appwrite Row-Level Permissions</span>
        </div>
      </div>

      <SetupGuideModal isOpen={isSetupModalOpen} onClose={() => setIsSetupModalOpen(false)} />
    </div>
  );
}
