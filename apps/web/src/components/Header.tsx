import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radio, LogIn, LogOut, Coins, Video, BarChart3, Globe } from 'lucide-react';
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
          <Radio className="w-6 h-6 text-brand-400 group-hover:text-brand-300 transition-colors" />
          <span className="text-xl font-bold gradient-text">{t('app_name')}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm text-zinc-300 hover:text-white transition-colors">{t('home')}</Link>
          {user?.role === 'streamer' && (
            <>
              <Link to="/studio" className="text-sm text-zinc-300 hover:text-white transition-colors flex items-center gap-1">
                <Video className="w-4 h-4" /> {t('studio')}
              </Link>
              <Link to="/analytics" className="text-sm text-zinc-300 hover:text-white transition-colors flex items-center gap-1">
                <BarChart3 className="w-4 h-4" /> {t('analytics')}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 mr-2">
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={clsx(
                  'px-1.5 py-0.5 text-xs rounded transition-colors',
                  i18n.language === lang.code ? 'text-brand-300 bg-brand-500/10' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {user ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-700 text-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-medium">{user.points.toLocaleString()}</span>
                <span className="text-zinc-500">{t('points')}</span>
              </div>
              <span className="hidden sm:inline text-sm text-zinc-300">{user.display_name}</span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-2 rounded-lg hover:bg-surface-600 transition-colors text-zinc-400 hover:text-white"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors text-sm font-medium"
            >
              <LogIn className="w-4 h-4" />
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
