import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radio, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
    role: 'viewer',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.username, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (username: string) => {
    setError('');
    setLoading(true);
    try {
      await login(username, 'demo1234');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Radio className="w-8 h-8 text-brand-400" />
            <span className="text-2xl font-bold gradient-text">{t('app_name')}</span>
          </Link>
        </div>

        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            {isRegister ? t('register') : t('login')}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50"
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">{t('display_name')}</label>
                  <input
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="streamer">Streamer</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white font-semibold disabled:opacity-50 transition-opacity"
            >
              {loading ? '...' : isRegister ? t('register') : t('login')}
            </button>
          </form>

          <button
            onClick={() => setIsRegister(!isRegister)}
            className="w-full mt-4 text-sm text-zinc-400 hover:text-brand-300 transition-colors"
          >
            {isRegister ? t('login') : t('register')}
          </button>

          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-xs text-zinc-500 mb-3">{t('demo_accounts')}</p>
            <div className="space-y-2">
              <button
                onClick={() => quickLogin('demo_viewer')}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-surface-700 text-xs text-zinc-300 hover:bg-surface-600 transition-colors"
              >
                {t('viewer_account')}
              </button>
              <button
                onClick={() => quickLogin('sakura_live')}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-surface-700 text-xs text-zinc-300 hover:bg-surface-600 transition-colors"
              >
                {t('streamer_account')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
