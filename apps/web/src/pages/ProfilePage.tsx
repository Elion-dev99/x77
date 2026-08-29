import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { StreamCard } from '../components/StreamCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, type Stream, type User } from '../lib/api';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<User | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    api.getUserProfile(username)
      .then(({ user, streams: s }) => {
        setProfile(user);
        setStreams(s);
        if (currentUser) {
          api.getFollowingStatus(user.id).then(({ following: f }) => setFollowing(f)).catch(() => {});
        }
      })
      .catch(() => toast(t('not_found'), 'error'))
      .finally(() => setLoading(false));
  }, [username, currentUser, t, toast]);

  const toggleFollow = async () => {
    if (!profile || !currentUser) return;
    try {
      if (following) {
        await api.unfollow(profile.id);
        setFollowing(false);
        toast(t('unfollowed'), 'success');
      } else {
        await api.follow(profile.id);
        setFollowing(true);
        toast(t('following'), 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-surface-900 flex items-center justify-center text-zinc-500">Loading...</div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-surface-900 pb-20 md:pb-0">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shrink-0">
            {profile.display_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              {profile.is_verified ? <BadgeCheck className="w-5 h-5 text-brand-400" /> : null}
            </div>
            <p className="text-zinc-500 text-sm mb-2">@{profile.username}</p>
            <p className="text-zinc-300 mb-4">{profile.bio || '—'}</p>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {profile.followers_count.toLocaleString()} {t('followers')}</span>
              <span>{profile.region}</span>
              <span className="capitalize">{profile.role}</span>
            </div>
          </div>
          {currentUser && currentUser.id !== profile.id && (
            <button
              onClick={toggleFollow}
              className={`px-6 py-2 rounded-xl font-medium text-sm transition-colors ${
                following ? 'bg-surface-600 text-zinc-300' : 'bg-brand-500/20 text-brand-300 hover:bg-brand-500/30'
              }`}
            >
              {following ? t('following') : t('follow')}
            </button>
          )}
        </div>

        <h2 className="text-lg font-bold mt-8 mb-4">{t('stream_history')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {streams.map((s) => (
            <StreamCard key={s.id} stream={{ ...s, streamer_name: profile.display_name, streamer_verified: profile.is_verified }} />
          ))}
        </div>
        {streams.length === 0 && <p className="text-zinc-500 text-center py-8">{t('no_streams')}</p>}
      </div>
      <MobileNav />
    </div>
  );
}
