import { useLanguage } from '../i18n.tsx';

function SpainFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 shrink-0 rounded-[2px]" aria-hidden="true">
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg viewBox="0 0 60 30" className="h-4 w-6 shrink-0 rounded-[2px]" aria-hidden="true">
      <clipPath id="uk-flag-clip">
        <path d="M0 0h60v30H0z" />
      </clipPath>
      <g clipPath="url(#uk-flag-clip)">
        <path fill="#012169" d="M0 0h60v30H0z" />
        <path stroke="#fff" strokeWidth="6" d="m0 0 60 30M60 0 0 30" />
        <path stroke="#C8102E" strokeWidth="2" d="m0 0 60 30M60 0 0 30" />
        <path stroke="#fff" strokeWidth="10" d="M30 0v30M0 15h60" />
        <path stroke="#C8102E" strokeWidth="6" d="M30 0v30M0 15h60" />
      </g>
    </svg>
  );
}

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
      {!compact && <span>{t('Idioma')}</span>}
      <div
        className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-[#111317] p-1 shadow-sm shadow-black/20"
        role="group"
        aria-label={t('Idioma')}
      >
        <button
          type="button"
          onClick={() => setLanguage('en')}
          aria-label="English"
          aria-pressed={language === 'en'}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
            language === 'en'
              ? 'bg-amber-500/15 text-amber-200'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <UnitedKingdomFlag />
          <span>EN</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage('es')}
          aria-label="Español"
          aria-pressed={language === 'es'}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
            language === 'es'
              ? 'bg-amber-500/15 text-amber-200'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <SpainFlag />
          <span>ES</span>
        </button>
      </div>
    </div>
  );
}
