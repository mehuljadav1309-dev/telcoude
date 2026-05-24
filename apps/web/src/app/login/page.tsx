'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Loader2, Phone, KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type AuthStep = 'phone' | 'code' | 'password';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/drive');
    return null;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.sendCode(phoneNumber);
      setPhoneCodeHash(response.data.data.phoneCodeHash);
      setStep('code');
      toast.success('Verification code sent!');
    } catch (err: any) {
      const msg = err?.response?.data?.message?.[0] || 'Failed to send code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyCode({
        phoneNumber,
        code,
        phoneCodeHash,
      });

      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);

      toast.success('Welcome to Telegram Drive!');
      router.push('/drive');
    } catch (err: any) {
      const msg = err?.response?.data?.message?.[0] || '';
      if (msg.includes('2FA') || msg.includes('password')) {
        setStep('password');
      } else {
        setError(msg || 'Invalid code');
        toast.error(msg || 'Invalid code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyCode({
        phoneNumber,
        code,
        phoneCodeHash,
        password,
      });

      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);

      toast.success('Welcome to Telegram Drive!');
      router.push('/drive');
    } catch (err: any) {
      const msg = err?.response?.data?.message?.[0] || 'Invalid password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md mx-auto p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Telegram Drive</h1>
          <p className="text-muted-foreground mt-2">
            Cloud storage powered by your Telegram account
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {step === 'phone' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Enter your phone number</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll receive a verification code via Telegram
                </p>
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Enter verification code</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Check your Telegram messages for the code
                </p>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="00000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg text-center tracking-widest"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || code.length < 3}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verify & Login'
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change phone number
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-6 h-6 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold">Two-factor authentication</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your Telegram 2FA password
                </p>
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Your 2FA password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Verify & Login'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Your Telegram credentials are encrypted end-to-end
          <br />
          and never stored in plain text
        </p>
      </div>
    </div>
  );
}
