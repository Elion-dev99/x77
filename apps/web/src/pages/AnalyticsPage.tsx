import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Eye, Gift } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api, type Stream } from '../lib/api';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [totalTips, setTotalTips] = useState(0);
  const [giftBreakdown, setGiftBreakdown] = useState<{ name: string; icon: string; count: number; total: number }[]>([]);

  useEffect(() => {
    if (user && user.role !== 'streamer' && user.role !== 'admin') {
      navigate('/');
      return;
    }
    api.getAnalytics().then((data) => {
      setStreams(data.streams);
      setTotalTips(data.totalTips);
      setGiftBreakdown(data.giftBreakdown);
    }).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  const totalPeak = streams.reduce((sum, s) => sum + s.peak_viewers, 0);
  const liveCount = streams.filter((s) => s.is_live).length;

  return (
    <div className="min-h-screen bg-surface-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-400" />
          {t('analytics')}
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-brand-500/10">
                <TrendingUp className="w-5 h-5 text-brand-400" />
              </div>
              <span className="text-sm text-zinc-400">{t('total_tips')}</span>
            </div>
            <div className="text-2xl font-bold">{totalTips.toLocaleString()} Pt</div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-zinc-400">{t('peak_viewers')}</span>
            </div>
            <div className="text-2xl font-bold">{totalPeak.toLocaleString()}</div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-zinc-400">{t('stream_history')}</span>
            </div>
            <div className="text-2xl font-bold">{streams.length}</div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Eye className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-sm text-zinc-400">{t('live_now')}</span>
            </div>
            <div className="text-2xl font-bold">{liveCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gift Breakdown */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-brand-400" />
              Gift Breakdown
            </h2>
            {giftBreakdown.length > 0 ? (
              <div className="space-y-3">
                {giftBreakdown.map((g) => (
                  <div key={g.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{g.icon}</span>
                      <span className="text-sm">{g.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{g.total.toLocaleString()} Pt</div>
                      <div className="text-xs text-zinc-500">{g.count}x</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No gifts received yet</p>
            )}
          </div>

          {/* Stream History */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold mb-4">{t('stream_history')}</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {streams.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-700/50">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {s.is_live ? (
                        <span className="text-red-400">LIVE</span>
                      ) : (
                        s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Scheduled'
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-zinc-400 ml-4">
                    <div>{s.peak_viewers} peak</div>
                    <div>{s.total_tips} Pt</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
