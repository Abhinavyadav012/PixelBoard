import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Handles the redirect after Google OAuth.
 * URL: /auth/callback?token=JWT&id=...&name=...&email=...&avatar=...
 */
const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token  = searchParams.get('token');
    const id     = searchParams.get('id');
    const name   = searchParams.get('name');
    const email  = searchParams.get('email');
    const avatar = searchParams.get('avatar');
    const error  = searchParams.get('error');

    if (error || !token) {
      navigate('/auth?error=oauth_failed', { replace: true });
      return;
    }

    loginWithToken({ _id: id, name, email, avatar }, token);
    navigate('/dashboard', { replace: true });
  }, []);   // run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-sm font-medium">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
