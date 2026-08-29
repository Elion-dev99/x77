import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, BadgeCheck, Clock } from 'lucide-react';
import type { Stream } from '../lib/api';
import clsx from 'clsx';

const categoryColors: Record<string, string> = {
  talk: 'bg-blue-500/20 text-blue-300',
  music: 'bg-purple-500/20 text-purple-300',
  gaming: 'bg-green-500/20 text-green-300',
  premium: 'bg-amber-500/20 text-amber-300',
  multi_angle: 'bg-pink-500/20 text-pink-300',
};

const categoryGradients: Record<string, string> = {
  talk: 'from-blue-600/30 to-indigo-600/30',
  music: 'from-purple-600/30 to-pink-600/30',
  gaming: 'from-green-600/30 to-emerald-600/30',
  premium: 'from-amber-600/30 to-orange-600/30',
  multi_angle: 'from-pink-600/30 to-rose-600/30',
};

export function StreamCard({ stream }: { stream: Stream }) {
  const { t } = useTranslation();
  const tags = JSON.parse(stream.tags || '[]') as string[];

  return (
    <Link
      to={`/stream/${stream.id}`}
      className="group block rounded-xl overflow-hidden bg-surface-800 hover:bg-surface-700/80 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-500/5"
    >
      <div className={clsx('relative aspect-video bg-gradient-to-br', categoryGradients[stream.category] || 'from-surface-600 to-surface-700')}>
        {stream.is_live ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/90 text-white text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse-live" />
            LIVE
          </div>
        ) : (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-600/90 text-zinc-300 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {t('scheduled')}
          </div>
        )}

        {stream.is_live && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs">
            <Eye className="w-3 h-3" />
            {stream.viewer_count.toLocaleString()}
          </div>
        )}

        <div className="absolute bottom-3 left-3">
          <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', categoryColors[stream.category])}>
            {t(stream.category)}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-14 h-14 rounded-full bg-brand-500/80 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {stream.streamer_name?.[0] || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-brand-300 transition-colors">
              {stream.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-zinc-400">{stream.streamer_name}</span>
              {stream.streamer_verified ? <BadgeCheck className="w-3.5 h-3.5 text-brand-400" /> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-surface-600 text-zinc-400">{tag}</span>
            ))}
          </div>
          <span className="text-xs font-medium text-zinc-400">
            {stream.price_per_minute > 0
              ? `${stream.price_per_minute} ${t('per_minute')}`
              : t('free')}
          </span>
        </div>
      </div>
    </Link>
  );
}
