import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Save } from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ display_name: '', bio: '', region: 'JP' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ display_name: user.display_name, bio: user.bio, region: user.region });
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProfile(form);
      await refreshUser();
      toast(t('saved'), 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-900 pb-20 md:pb-0">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-brand-400" />
          {t('settings')}
        </h1>

        <div className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">{t('display_name')}</label>
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">{t('description')}</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">{t('region')}</label>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-700 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50">
              <option value="JP">Japan</option>
              <option value="US">United States</option>
              <option value="KR">Korea</option>
              <option value="TW">Taiwan</option>
            </select>
          </div>
          <p className="text-xs text-zinc-500">@{user.username} · {user.email}</p>
          <button onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {t('save')}
          </button>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
