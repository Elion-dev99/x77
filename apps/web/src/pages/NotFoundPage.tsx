import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
        <p className="text-zinc-400 mb-6">{t('not_found')}</p>
        <Link to="/" className="px-6 py-3 rounded-xl bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 transition-colors">
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
