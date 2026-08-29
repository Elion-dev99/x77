import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Video, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, type Notification } from '../lib/api';

export function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inbox, setInbox] = useState<unknown[]>([]);

  useEffect(() => {
    if (!user) return;
    api.getNotifications().then(({ notifications: n }) => setNotifications(n)).catch(() => {});
    if (user.role === 'streamer') {
      api.getTwoShotInbox().then(({ sessions }) => setInbox(sessions)).catch(() => {});
    }
  }, [user]);

  const markAllRead = async () => {
    await api.markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    toast(t('saved'), 'success');
  };

  const acceptTwoShot = async (id: string) => {
    await api.acceptTwoShot(id);
    toast(t('two_shot_accepted'), 'success');
    setInbox((prev) => prev.filter((s: unknown) => (s as { id: string }).id !== id));
  };

  const rejectTwoShot = async (id: string) => {
    await api.rejectTwoShot(id);
    setInbox((prev) => prev.filter((s: unknown) => (s as { id: string }).id !== id));
  };

  return (
    <div className="min-h-screen bg-surface-900 pb-20 md:pb-0">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-400" />
            {t('notifications')}
          </h1>
          <button onClick={markAllRead} className="text-sm text-brand-400 hover:underline">{t('mark_all_read')}</button>
        </div>

        {user?.role === 'streamer' && inbox.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2"><Video className="w-4 h-4" /> {t('two_shot_requests')}</h2>
            <div className="space-y-2">
              {inbox.map((s: unknown) => {
                const session = s as { id: string; viewer_name: string; status: string };
                if (session.status !== 'pending') return null;
                return (
                  <div key={session.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <span>{session.viewer_name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => acceptTwoShot(session.id)} className="px-3 py-1 rounded-lg bg-green-500/20 text-green-300 text-sm">{t('accept')}</button>
                      <button onClick={() => rejectTwoShot(session.id)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 text-sm">{t('reject')}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map((n) => (
            <Link key={n.id} to={n.link || '#'} className={`block glass rounded-xl p-4 ${n.is_read ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-brand-500/10">
                  {n.type === 'follow' ? <Users className="w-4 h-4 text-brand-400" /> : <Bell className="w-4 h-4 text-brand-400" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {n.is_read ? null : <Check className="w-4 h-4 text-brand-400 ml-auto" />}
              </div>
            </Link>
          ))}
          {notifications.length === 0 && <p className="text-zinc-500 text-center py-12">{t('no_notifications')}</p>}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
