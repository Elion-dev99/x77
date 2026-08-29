import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radio, LogIn, LogOut, Coins, Video, BarChart3, Globe, Bell, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const languages = [
    { code: 'ja', label: 'JP' },
    { code: 'en', label: 'EN' },
    { code: 'zh', label: 'ZH' },
    { code: 'ko', label: 'KO' },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Radio className="w-6 h-6 text-brand-400" />
          <span className="text-xl font-bold gradient-text">{t('app_name')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5">
          <Link to="/" className="text-sm text-zinc-300 hover:text-white">{t('home')}</Link>
          <Link to="/wallet" className="text-sm text-zinc-300 hover:text-white flex items-center gap-1">
            <Wallet className="w-4 h-4" /> {t('points')}
          </Link>
          {user?.role === 'streamer' && (
            <>
              <Link to="/studio" className="text-sm text-zinc-300 hover:text-white flex items-center gap-1">
                <Video className="w-4 h-4" /> {t('studio')}
              </Link>
              <Link to="/analytics" className="text-sm text-zinc-300 hover:text-white flex items-center gap-1">
                <BarChart3 className="w-4 h-4" /> {t('analytics')}
              </Link>
            </>
          )}
          {user && (
            <>
              <Link to="/notifications" className="text-sm text-zinc-300 hover:text-white flex items-center gap-1">
                <Bell className="w-4 h-4" /> {t('notifications')}
              </Link>
              <Link to={`/u/${user.username}`} className="text-sm text-zinc-300 hover:text-white">{t('profile')}</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            {languages.map((lang) => (
              <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}
                className={clsx('px-1.5 py-0.5 text-xs rounded', i18n.language === lang.code ? 'text-brand-300 bg-brand-500/10' : 'text-zinc-500')}>
                {lang.label}
              </button>
            ))}
          </div>
          {user ? (
            <>
              <Link to="/wallet" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-700 text-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-medium">{user.points.toLocaleString()}</span>
              </Link>
              <Link to="/settings" className="hidden sm:inline text-sm text-zinc-300">{user.display_name}</Link>
              <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-lg hover:bg-surface-600 text-zinc-400">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-300 text-sm">
              <LogIn className="w-4 h-4" /> {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
