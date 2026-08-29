import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, X } from 'lucide-react';
import type { Gift as GiftType } from '../lib/api';
import clsx from 'clsx';

interface GiftPanelProps {
  gifts: GiftType[];
  userPoints: number;
  onSendGift: (giftId: string) => void;
  onClose: () => void;
}

const animationClass: Record<string, string> = {
  float: 'animate-float-up',
  burst: 'animate-burst',
  sparkle: 'animate-sparkle',
  launch: 'animate-launch',
  rainbow: 'animate-rainbow',
};

export function GiftPanel({ gifts, userPoints, onSendGift, onClose }: GiftPanelProps) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [previewAnim, setPreviewAnim] = useState<string | null>(null);

  const handleSelect = (gift: GiftType) => {
    setSelected(gift.id);
    setPreviewAnim(gift.animation);
    setTimeout(() => setPreviewAnim(null), 2000);
  };

  const handleSend = () => {
    if (!selected) return;
    const gift = gifts.find((g) => g.id === selected);
    if (!gift || userPoints < gift.points_cost) return;
    onSendGift(selected);
    setSelected(null);
  };

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-brand-400" />
          <h3 className="font-semibold">{t('send_gift')}</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-600 text-zinc-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {previewAnim && (
        <div className="flex justify-center py-4">
          <span className={clsx('text-5xl', animationClass[previewAnim])}>
            {gifts.find((g) => g.id === selected)?.icon}
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {gifts.map((gift) => (
          <button
            key={gift.id}
            onClick={() => handleSelect(gift)}
            disabled={userPoints < gift.points_cost}
            className={clsx(
              'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
              selected === gift.id
                ? 'bg-brand-500/20 ring-2 ring-brand-500/50'
                : 'bg-surface-700 hover:bg-surface-600',
              userPoints < gift.points_cost && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className="text-2xl">{gift.icon}</span>
            <span className="text-[10px] font-medium truncate w-full text-center">
              {i18n.language === 'ja' ? gift.name_ja : gift.name}
            </span>
            <span className="text-[10px] text-amber-400">{gift.points_cost} Pt</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleSend}
        disabled={!selected || (gifts.find((g) => g.id === selected)?.points_cost ?? 0) > userPoints}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white font-semibold text-sm disabled:opacity-40 transition-opacity"
      >
        {t('send_gift')}
        {selected && ` (${gifts.find((g) => g.id === selected)?.points_cost} Pt)`}
      </button>
    </div>
  );
}

interface GiftOverlayProps {
  icon: string;
  username: string;
  animation: string;
}

export function GiftOverlay({ icon, username, animation }: GiftOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className={clsx('text-center', animationClass[animation] || 'animate-float-up')}>
        <div className="text-6xl mb-2">{icon}</div>
        <div className="text-sm font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full">
          {username}
        </div>
      </div>
    </div>
  );
}
