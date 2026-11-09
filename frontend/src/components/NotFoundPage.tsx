import React from 'react';
import { ArrowLeft, Compass, Gamepad2, Home, Search } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';

interface NotFoundPageProps {
  onGoHome: () => void;
  onSearchGames: () => void;
  isGameNotFound?: boolean;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onGoHome,
  onSearchGames,
  isGameNotFound = false
}) => {
  const { t } = useLanguage();
  return <main className="relative min-h-screen text-slate-200 flex items-center justify-center px-4 py-12">
    <div className="absolute right-4 top-4">
      <LanguageSelector compact />
    </div>
    <section className="w-full max-w-xl text-center">
      <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
        <Gamepad2 className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mb-3 font-mono text-sm font-semibold tracking-[0.35em] text-blue-400">404</p>
      <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
        {isGameNotFound ? t('Juego no encontrado') : t('No encontramos esta página')}
      </h1>
      <p className="mx-auto mt-4 max-w-md text-base sm:text-sm leading-6 text-slate-400">
        {isGameNotFound
          ? t('Puede que el juego ya no exista o que la dirección no sea válida.')
          : t('Puede que la URL sea incorrecta o que el contenido ya no exista.')}
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSearchGames}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm sm:text-xs font-bold text-white transition hover:bg-blue-500"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {t('Buscar un juego')}
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-3 text-sm sm:text-xs font-bold text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          {t('Ir al inicio')}
        </button>
      </div>
      <nav aria-label={t('Enlaces principales')} className="mt-10 flex justify-center gap-5 text-sm sm:text-xs text-slate-400">
        <button type="button" onClick={onGoHome} className="inline-flex min-h-11 items-center gap-1.5 hover:text-slate-200">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('Volver')}
        </button>
        <button type="button" onClick={onSearchGames} className="inline-flex min-h-11 items-center gap-1.5 hover:text-slate-200">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          {t('Descubrir')}
        </button>
      </nav>
    </section>
  </main>;
};
