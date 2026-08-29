import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, CreditCard } from 'lucide-react';
import { Header } from '../components/Header';
import { MobileNav } from '../components/MobileNav';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';

const PACKAGES = [
  { amount: 1000, price: '¥1,000', bonus: 0 },
  { amount: 3000, price: '¥3,000', bonus: 100 },
  { amount: 5000, price: '¥5,000', bonus: 300 },
  { amount: 10000, price: '¥10,000', bonus: 1000 },
  { amount: 30000, price: '¥30,000', bonus: 5000 },
];

export function WalletPage() {
  const { t } = useTranslation();
  const { user, updatePoints } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<number | null>(null);

  const purchase = async (amount: number, bonus: number) => {
    setLoading(amount);
    try {
      const { points } = await api.chargePoints(amount + bonus);
      updatePoints(points);
      toast(`${(amount + bonus).toLocaleString()} ${t('points')} ${t('added')}`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 pb-20 md:pb-0">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Coins className="w-6 h-6 text-amber-400" />
          {t('charge_points')}
        </h1>

        <div className="glass rounded-2xl p-6 mb-8 text-center">
          <p className="text-sm text-zinc-400 mb-1">{t('current_balance')}</p>
          <p className="text-4xl font-bold text-amber-400">{user?.points.toLocaleString() ?? 0} <span className="text-lg text-zinc-500">Pt</span></p>
        </div>

        <p className="text-sm text-zinc-400 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          {t('payment_demo_note')}
        </p>

        <div className="space-y-3">
          {PACKAGES.map(({ amount, price, bonus }) => (
            <button
              key={amount}
              onClick={() => purchase(amount, bonus)}
              disabled={loading !== null}
              className="w-full glass rounded-xl p-4 flex items-center justify-between hover:bg-surface-700/50 transition-colors disabled:opacity-50"
            >
              <div className="text-left">
                <p className="font-semibold">{amount.toLocaleString()} Pt</p>
                {bonus > 0 && <p className="text-xs text-brand-400">+{bonus} {t('bonus')} Pt</p>}
              </div>
              <div className="text-right">
                <p className="font-medium">{price}</p>
                {loading === amount && <p className="text-xs text-zinc-500">...</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
