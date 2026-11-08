import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!compact && <span>{t('Idioma')}</span>}
      <select
        value={language}
        onChange={event => {
          const nextLanguage = event.target.value;
          if (nextLanguage === 'en' || nextLanguage === 'es') setLanguage(nextLanguage);
        }}
        aria-label={t('Idioma')}
        className="cursor-pointer rounded-lg border border-slate-700 bg-[#0b0c0e] px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </label>
  );
}
