import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import ThemeToggle from '../common/ThemeToggle';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { username, password });
      login({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      // Redirect based on role
      const routes: Record<string, string> = {
        admin:   '/admin',
        teacher: '/teacher',
        student: '/student',
      };
      navigate(routes[data.user.role] ?? '/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4 transition-colors duration-200">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600/20 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary">Student Feedback</h1>
          <p className="text-secondary mt-1">AI-Powered University Platform</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-primary mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Username</label>
              <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input" placeholder="Enter your username" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" placeholder="Enter your password" required />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button id="login-btn" type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-base">
            <p className="text-xs text-secondary text-center mb-3">Demo credentials</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[['Admin','admin','admin123'],['Teacher','teacher1','pass123'],['Student','student1','pass123']].map(([role, u, p]) => (
                <button key={role} onClick={() => { setUsername(u); setPassword(p); }}
                  className="bg-gray-500/5 hover:bg-gray-500/10 rounded-lg p-2 text-center transition-colors border border-base">
                  <div className="font-semibold text-primary">{role}</div>
                  <div className="text-secondary">{u}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
