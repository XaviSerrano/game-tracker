import type { FC } from 'react';
import {
  ArrowRight,
  BarChart3,
  Compass,
  Gamepad2,
  LibraryBig,
  ListChecks,
  Search,
  UsersRound
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector.tsx';
import { useLanguage } from '../i18n.tsx';

interface LandingPageProps {
  onDiscover: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onGoHome: () => void;
}

const features = [
  {
    icon: LibraryBig,
    title: 'Tu biblioteca, siempre clara',
    description: 'Marca cada juego como pendiente, jugando, completado o abandonado y conserva tus valoraciones.'
  },
  {
    icon: Search,
    title: 'Encuentra tu próxima partida',
    description: 'Explora el catálogo y filtra por género, plataforma, fecha, popularidad o valoración.'
  },
  {
    icon: ListChecks,
    title: 'Listas para cada aventura',
    description: 'Crea colecciones temáticas para ordenar tus juegos como más sentido tenga para ti.'
  },
  {
    icon: UsersRound,
    title: 'Una comunidad de jugadores',
    description: 'Sigue a otros perfiles y descubre su actividad, sus juegos y lo que les gusta.'
  },
  {
    icon: BarChart3,
    title: 'Tu recorrido, en perspectiva',
    description: 'Consulta estadísticas de tu biblioteca, tus géneros favoritos y las horas jugadas.'
  }
];

export const LandingPage: FC<LandingPageProps> = ({ onDiscover, onOpenAuth, onGoHome }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen overflow-x-clip text-slate-200">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0b0d12]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-[86rem] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onGoHome();
            }}
            aria-label={t('Volver al inicio')}
            className="flex shrink-0 items-center gap-2.5 rounded-lg text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
          >
            <span className="grid size-9 place-items-center rounded-xl border border-[#d9a352]/30 bg-[#d9a352]/10 text-[#e5b974]">
              <Gamepad2 className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">GameTracker</span>
          </a>

          <nav aria-label={t('Navegación principal')} className="hidden items-center gap-7 md:flex">
            <a href="#funciones" className="text-sm font-semibold text-slate-300 transition hover:text-white">
              {t('Funciones')}
            </a>
            <a href="#como-funciona" className="text-sm font-semibold text-slate-300 transition hover:text-white">
              {t('Cómo funciona')}
            </a>
            <button type="button" onClick={onDiscover} className="text-sm font-semibold text-slate-300 transition hover:text-white">
              {t('Descubrir juegos')}
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSelector compact />
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="min-h-10 rounded-xl px-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.06] hover:text-white sm:px-4 sm:text-sm"
            >
              {t('Iniciar sesión')}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative border-b border-white/[0.06]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-8 size-[28rem] rounded-full bg-[#d9a352]/[0.045] blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-[86rem] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:py-28">
            <div className="max-w-2xl">
              <h1 className="text-balance text-5xl font-extrabold leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl xl:text-7xl">
                {t('Tu historia gamer, en un solo lugar.')}
                <span className="mt-2 block text-[#e5b974]">{t('A tu manera.')}</span>
              </h1>
              <p className="mt-7 max-w-[56ch] text-pretty text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {t('Organiza lo que juegas, sigue tus progresos y descubre tu próximo juego junto a otros jugadores.')}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d9a352] px-6 text-sm font-bold text-[#17120a] transition hover:bg-[#e5b974] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
                >
                  {t('Crear mi cuenta')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onDiscover}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-6 text-sm font-bold text-white transition hover:border-[#d9a352]/40 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
                >
                  <Compass className="size-4 text-[#e5b974]" aria-hidden="true" />
                  {t('Explorar juegos')}
                </button>
              </div>
              <p className="mt-5 text-sm text-slate-400">{t('Tu colección, tu ritmo, tus próximas aventuras.')}</p>
            </div>

            <div className="relative mx-auto w-full max-w-[38rem] lg:mx-0 lg:ml-auto">
              <div aria-hidden="true" className="pointer-events-none absolute -inset-5 rounded-[2rem] border border-[#d9a352]/10 sm:-inset-7" />
              <div className="relative overflow-hidden rounded-3xl border border-[#d9a352]/20 bg-[#111317] p-5 shadow-[0_24px_70px_-28px_rgba(217,163,82,0.28)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-[#d9a352]/10 text-[#e5b974]">
                      <LibraryBig className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-white sm:text-lg">{t('Tu biblioteca')}</h2>
                      <p className="mt-1 text-xs text-slate-400">{t('Todo lo que juegas, en orden.')}</p>
                    </div>
                  </div>
                  <span className="grid size-10 place-items-center rounded-full border border-white/10 text-slate-300">
                    <Search className="size-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-7 flex flex-wrap gap-2" aria-label={t('Estados de juego')}>
                  {[
                    ['Jugando', 'bg-[#d9a352]/15 text-[#f0c77f]'],
                    ['Pendientes', 'bg-slate-700/50 text-slate-300'],
                    ['Completados', 'bg-emerald-500/10 text-emerald-300']
                  ].map(([label, className]) => (
                    <span key={label} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}>
                      {t(label)}
                    </span>
                  ))}
                </div>

                <div className="mt-6 border-t border-white/[0.08] pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('Explora a tu ritmo')}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{t('De lo pendiente a lo inolvidable.')}</p>
                    </div>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#d9a352]/20 bg-[#d9a352]/[0.07] text-[#e5b974]">
                      <Gamepad2 className="size-6" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {['RPG', 'Aventura', 'Indie', 'Estrategia'].map((genre) => (
                      <span key={genre} className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-slate-400">
                        {t(genre)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative mt-4 flex items-center justify-between gap-4 px-1 text-xs text-slate-400">
                <span>{t('Una biblioteca que crece contigo.')}</span>
                <span className="flex items-center gap-1.5 text-[#e5b974]">
                  <span className="size-1.5 rounded-full bg-[#d9a352]" aria-hidden="true" />
                  {t('Hecha para jugar a tu manera')}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="funciones" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[86rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="max-w-3xl">
              <h2 className="text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-white sm:text-5xl">
                {t('Tu colección merece algo más que una lista.')}
              </h2>
              <p className="mt-5 max-w-[64ch] text-base leading-7 text-slate-300">
                {t('Guarda el hilo de cada partida: desde ese juego que tienes pendiente hasta todo lo que ya has terminado.')}
              </p>
            </div>

            <div className="mt-12 grid border-t border-white/[0.09] sm:grid-cols-2 xl:grid-cols-5">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="border-b border-white/[0.09] py-7 sm:px-5 sm:first:pl-0 xl:px-6 xl:first:pl-0">
                  <Icon className="size-5 text-[#e5b974]" aria-hidden="true" />
                  <h3 className="mt-5 text-base font-bold text-white">{t(title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{t(description)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 border-y border-white/[0.07] bg-[#0f1218]">
          <div className="mx-auto grid w-full max-w-[86rem] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-12 lg:py-24">
            <div>
              <h2 className="text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
                {t('Menos pestañas abiertas. Más tiempo para jugar.')}
              </h2>
              <p className="mt-5 max-w-[52ch] text-base leading-7 text-slate-300">
                {t('GameTracker reúne tu biblioteca, tus descubrimientos y tus estadísticas en un mismo espacio.')}
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                ['1', 'Encuentra', 'Busca juegos y explora el catálogo con filtros que te ayudan a elegir.'],
                ['2', 'Organiza', 'Añade cada juego a tu biblioteca y actualiza su estado a tu ritmo.'],
                ['3', 'Comparte', 'Sigue a otros jugadores y descubre nuevas aventuras en comunidad.']
              ].map(([step, title, description]) => (
                <div key={step} className="border-t border-[#d9a352]/30 pt-5">
                  <span className="font-mono text-xs font-semibold tracking-widest text-[#e5b974]">{step.padStart(2, '0')}</span>
                  <h3 className="mt-4 text-lg font-bold text-white">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{t(description)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[86rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-[#d9a352]/20 bg-[#111317] p-6 sm:p-10 lg:flex-row lg:items-center lg:p-12">
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                {t('Tu próxima partida merece un buen comienzo.')}
              </h2>
              <p className="mt-4 max-w-[60ch] text-base leading-7 text-slate-300">
                {t('Empieza tu biblioteca hoy y vuelve cuando quieras para seguir justo donde lo dejaste.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d9a352] px-6 text-sm font-bold text-[#17120a] transition hover:bg-[#e5b974] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
            >
              {t('Crear mi cuenta')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex w-full max-w-[86rem] flex-col gap-4 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onGoHome();
            }}
            className="font-bold text-slate-300 transition hover:text-white"
          >
            GameTracker
          </a>
          <p>{t('Tu biblioteca gamer, a tu manera.')}</p>
          <button type="button" onClick={onDiscover} className="inline-flex items-center gap-1.5 self-start transition hover:text-white sm:self-auto">
            {t('Descubrir juegos')}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
};
