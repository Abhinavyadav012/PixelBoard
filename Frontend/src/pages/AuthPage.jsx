import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ── Google Icon SVG ─────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ── tiny shared primitives ─────────────────────────── */
const inputCls = `w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30
  focus:border-blue-500 transition text-sm shadow-sm`;

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    {children}
  </div>
);

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
);

const AuthPage = () => {
  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [oauthError, setOauthError] = useState('');

  const { user, login, register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      setOauthError('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const ok =
      mode === 'login'
        ? await login(email, password)
        : await register(name, email, password);
    if (ok) navigate('/dashboard', { replace: true });
  };

  const switchMode = () => {
    clearError();
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[46%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
                      flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/10 rounded-full" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">PixelBoard</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            Collaborate<br/>in real time.
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-xs">
            Draw, brainstorm, and build together on a shared canvas — from anywhere in the world.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['Real-time drawing', 'Live chat', 'Persistent boards', 'Multiple tools'].map((f) => (
              <span key={f} className="px-3 py-1.5 bg-white/15 text-white text-sm rounded-full backdrop-blur border border-white/10">{f}</span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-300/70 text-xs">© 2026 PixelBoard</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-lg">PixelBoard</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-slate-500 text-sm mb-7">
            {mode === 'login'
              ? 'Sign in to access your boards'
              : 'Start collaborating with your team for free'}
          </p>

          {(error || oauthError) && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error || oauthError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Field label="Full name">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  required placeholder="John Doe" className={inputCls} />
              </Field>
            )}
            <Field label="Email address">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com" className={inputCls} />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} placeholder="Min. 6 characters" className={inputCls} />
            </Field>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[.98] disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-semibold rounded-xl transition
                         flex items-center justify-center gap-2 mt-1 shadow-md shadow-blue-100">
              {loading && <Spinner />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={switchMode} className="text-blue-600 hover:text-blue-700 font-semibold transition">
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </div>

          {/* Google OAuth */}
          <div className="mt-5">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 whitespace-nowrap">or continue with</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <a
              href={`${API_URL}/api/auth/google`}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white
                         border border-slate-200 hover:border-slate-300 hover:bg-slate-50
                         rounded-xl shadow-sm text-sm font-medium text-slate-700 transition
                         active:scale-[.98]"
            >
              <GoogleIcon />
              Continue with Google
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
