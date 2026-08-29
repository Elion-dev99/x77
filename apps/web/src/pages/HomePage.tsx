import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Zap, MessageCircle, Gift, Globe, BarChart3, Users, Smartphone, Shield, PictureInPicture2 } from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { StreamCard } from '../components/StreamCard';
import { api, type Stream } from '../lib/api';
import clsx from 'clsx';

const categories = ['all', 'talk', 'music', 'gaming', 'premium', 'multi_angle'] as const;

const features = [
  { icon: Zap, key: 'feature_webrtc' },
  { icon: MessageCircle, key: 'feature_chat' },
  { icon: Gift, key: 'feature_gifts' },
  { icon: Globe, key: 'feature_i18n' },
  { icon: BarChart3, key: 'feature_analytics' },
  { icon: Users, key: 'feature_twoshot' },
  { icon: Shield, key: 'feature_moderation' },
  { icon: PictureInPicture2, key: 'feature_pip' },
  { icon: Smartphone, key: 'feature_mobile' },
];

export function HomePage() {
  const { t } = useTranslation();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ liveCount: 0, streamerCount: 0, totalViewers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getStreams({
      category: category === 'all' ? undefined : category,
      search: search || undefined,
    })
      .then(({ streams: s }) => setStreams(s))
      .catch(() => setStreams([]))
      .finally(() => setLoading(false));
  }, [category, search]);

  const liveStreams = streams.filter((s) => s.is_live);
  const scheduledStreams = streams.filter((s) => !s.is_live);

  return (
    <div className="min-h-screen bg-surface-900">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/30 via-surface-900 to-surface-900" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
              <span className="gradient-text">{t('app_name')}</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-8">{t('tagline')}</p>

            <div className="flex justify-center gap-8 mb-10">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-brand-400">{stats.liveCount}</div>
                <div className="text-xs text-zinc-500">{t('live_now')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-purple-400">{stats.streamerCount.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">{t('live_streamers')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-cyan-400">{stats.totalViewers.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">{t('watching_now')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800 border border-white/5 text-sm focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  category === cat
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'bg-surface-800 text-zinc-400 hover:text-zinc-200'
                )}
              >
                {t(cat === 'all' ? 'all_categories' : cat)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Live Streams */}
      <section className="max-w-7xl mx-auto px-4 mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
          {t('live_now')}
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-surface-800 animate-pulse" />
            ))}
          </div>
        ) : liveStreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-12">{t('no_streams')}</p>
        )}
      </section>

      {/* Scheduled */}
      {scheduledStreams.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-12">
          <h2 className="text-xl font-bold mb-4">{t('scheduled')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {scheduledStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8 gradient-text">{t('features_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, key }) => (
            <div key={key} className="glass rounded-xl p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-brand-500/10">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <p className="text-sm text-zinc-300">{t(key)}</p>
            </div>
          ))}
        </div>
      </section>
      <MobileNav />
    </div>
  );
}
