import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Video, BarChart3, Wallet, Bell, User } from 'lucide-react';
import clsx from 'clsx';

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const items = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/wallet', icon: Wallet, label: t('points') },
    { to: '/studio', icon: Video, label: t('studio') },
    { to: '/notifications', icon: Bell, label: t('notifications') },
    { to: '/settings', icon: User, label: t('settings') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-white/5 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {items.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={clsx(
              'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors',
              location.pathname === to ? 'text-brand-400' : 'text-zinc-500'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
