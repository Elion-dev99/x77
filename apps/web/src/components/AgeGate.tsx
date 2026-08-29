import { useTranslation } from 'react-i18next';
import { Radio, Shield, Globe } from 'lucide-react';
import { useAgeGate } from '../context/AgeGateContext';

const languages = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '繁體中文' },
  { code: 'ko', label: '한국어' },
];

export function AgeGate() {
  const { t, i18n } = useTranslation();
  const { verify } = useAgeGate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 via-surface-900 to-purple-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Radio className="w-8 h-8 text-brand-400" />
            <h1 className="text-3xl font-bold gradient-text">{t('app_name')}</h1>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Globe className="w-4 h-4 text-zinc-400" />
            <div className="flex gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-brand-500/20 text-brand-300'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-700/50 mb-6">
            <Shield className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-semibold text-lg">{t('age_verify_title')}</h2>
              <p className="text-sm text-zinc-400 mt-1">{t('age_verify_desc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={verify}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {t('age_verify_yes')}
            </button>
            <button
              onClick={() => window.location.href = 'https://google.com'}
              className="w-full py-3 px-6 rounded-xl bg-surface-600 text-zinc-300 font-medium hover:bg-surface-500 transition-colors"
            >
              {t('age_verify_no')}
            </button>
          </div>

          <p className="text-xs text-zinc-500 text-center mt-6">{t('recommended_browsers')}</p>
        </div>
      </div>
    </div>
  );
}
