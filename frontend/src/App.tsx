import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Compass,
  Library as LibIcon,
  List,
  BarChart2,
  User as UserIcon,
  LogOut,
  Search
} from 'lucide-react';

import { User } from './types.ts';
import { NotFoundPage } from './components/NotFoundPage.tsx';
import { LandingPage } from './components/LandingPage.tsx';

import { useLanguage } from './i18n.tsx';
import { LanguageSelector } from './components/LanguageSelector.tsx';
import { Dialog } from './components/Dialog.tsx';

const Onboarding = lazy(() => import('./components/Onboarding.tsx').then(m => ({ default: m.Onboarding })));
const HomeFeed = lazy(() => import('./components/HomeFeed.tsx').then(m => ({ default: m.HomeFeed })));
const Discover = lazy(() => import('./components/Discover.tsx').then(m => ({ default: m.Discover })));
const GameDetails = lazy(() => import('./components/GameDetails.tsx').then(m => ({ default: m.GameDetails })));
const Library = lazy(() => import('./components/Library.tsx').then(m => ({ default: m.Library })));
const CustomLists = lazy(() => import('./components/CustomLists.tsx').then(m => ({ default: m.CustomLists })));
const UserProfile = lazy(() => import('./components/UserProfile.tsx').then(m => ({ default: m.UserProfile })));
const StatsDashboard = lazy(() => import('./components/StatsDashboard.tsx').then(m => ({ default: m.StatsDashboard })));

type MainTab = 'feed' | 'discover' | 'library' | 'lists' | 'stats' | 'profile';
const SECTION_PATHS: Record<MainTab, string> = {
  feed: '/',
  discover: '/discover',
  library: '/library',
  lists: '/lists',
  stats: '/stats',
  profile: '/profile'
};

export default function App() {
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('feed');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Sub-navigation targets
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<{ gameId: number; name: string; summary: string } | null>(null);
  const [gameReturnPath, setGameReturnPath] = useState('/');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const resetTokenInUrl = new URLSearchParams(window.location.search).get('resetToken');

  // The session is kept in an httpOnly cookie and verified server-side.
  const verifySession = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        setToken('cookie-session');
        setAllUsers(prev => prev.some(user => user.id === userData.id) ? prev : [...prev, userData]);
      }
    } catch (err) {
      console.error("Session verification failed:", err);
    } finally {
      setLoading(false);
    }

    // Non-blocking: seeded profiles must not delay first render.
    try {
      const usersRes = await fetch('/api/social/feed?scope=all');
      if (usersRes.ok) {
        const mockGamers: User[] = [
          { id: "user_alex", username: "alex_gamer", email: "alex@gametracker.com", avatar: "/default-avatar.svg", bio: "RPG & Soulsborne fanatic. Playing games since 1998, always chasing the 100% completion.", createdAt: "" },
          { id: "user_sam", username: "vance_retro", email: "sam@gametracker.com", avatar: "/default-avatar.svg", bio: "Retro gaming collector. Chrono Trigger is the undisputed GOAT. CRTs are mandatory.", createdAt: "" },
          { id: "user_lucia", username: "lucia_indie", email: "lucia@gametracker.com", avatar: "/default-avatar.svg", bio: "Indie games advocate. Pixel art, cozy farm simulators, and rogue-lites make my day.", createdAt: "" },
          { id: "user_marcos", username: "marcos_rpg", email: "marcos@gametracker.com", avatar: "/default-avatar.svg", bio: "JRPG player & completionist. Elden Ring was brilliant, but Chrono Trigger is art.", createdAt: "" }
        ];
        setAllUsers(mockGamers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    verifySession();
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (nextPath: string) => {
    window.history.pushState({}, '', nextPath);
    setPathname(window.location.pathname);
  };

  const gamePathMatch = pathname.match(/^\/game\/([^/]+)\/?$/);
  const gamePathId = gamePathMatch ? Number(decodeURIComponent(gamePathMatch[1])) : null;
  const isGamePath = gamePathMatch !== null;
  const isKnownGamePath = isGamePath && Number.isInteger(gamePathId) && gamePathId > 0;
  const routeTab = (Object.entries(SECTION_PATHS).find(([, path]) => path === pathname)?.[0] || null) as MainTab | null;
  const isNotFoundPath = pathname !== '/' && !isGamePath && !routeTab;
  const showGameNotFound = isGamePath && !isKnownGamePath;
  const currentGameMetadata = gameMetadata?.gameId === gamePathId ? gameMetadata : null;

  useEffect(() => {
    const titles: Record<MainTab, string> = {
      feed: t('Tu actividad de videojuegos | GameTracker'),
      discover: t('Descubre videojuegos y encuentra tu próximo juego | GameTracker'),
      library: t('Biblioteca de videojuegos | GameTracker'),
      lists: t('Listas de videojuegos | GameTracker'),
      stats: t('Estadísticas de videojuegos | GameTracker'),
      profile: t('Perfil de jugador | GameTracker')
    };
    const pageTitle = pathname === '/'
      ? t(currentUser ? 'Tu actividad de videojuegos | GameTracker' : 'Organiza tu colección de videojuegos | GameTracker')
      : pathname === '/discover'
        ? titles.discover
        : isKnownGamePath
          ? currentGameMetadata
            ? `${currentGameMetadata.name}: ${language === 'es' ? 'ficha, plataformas y valoraciones' : 'details, platforms, and ratings'} | GameTracker`
            : t('Ficha de videojuego | GameTracker')
          : isNotFoundPath || showGameNotFound
            ? t('Página no encontrada | GameTracker')
            : routeTab
              ? titles[routeTab]
              : t('Página no encontrada | GameTracker');
    const fullDescription = pathname === '/discover'
      ? t('Explora videojuegos por género, plataforma, año y valoración. Descubre próximos lanzamientos y encuentra tu siguiente aventura en el catálogo de GameTracker.')
      : isNotFoundPath || showGameNotFound
        ? t('No encontramos la página que buscas. Explora el catálogo de videojuegos de GameTracker.')
        : isKnownGamePath
          ? currentGameMetadata?.summary || t('Descubre información, plataformas, valoraciones y reseñas de videojuegos en GameTracker.')
          : t('Organiza tu colección de videojuegos, registra tus partidas y horas, crea listas y descubre qué jugar después con GameTracker.');
    const description = fullDescription.length > 160
      ? `${fullDescription.slice(0, 157).trimEnd()}...`
      : fullDescription;
    const isPublicRoute = pathname === '/' || pathname === '/discover' || isKnownGamePath;
    const isIndexable = isPublicRoute && !currentUser && !resetTokenInUrl;
    const canonicalPath = pathname === '/' || pathname === '/discover'
      ? pathname
      : isKnownGamePath ? `/game/${gamePathId}` : null;
    const canonicalUrl = canonicalPath && !resetTokenInUrl
      ? `https://gametracker.space${canonicalPath}`
      : null;

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      if (!ogUrl) {
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        document.head.appendChild(ogUrl);
      }
      canonical.href = canonicalUrl;
      ogUrl.content = canonicalUrl;
    } else {
      canonical?.remove();
      ogUrl?.remove();
    }

    document.title = pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="robots"]')?.setAttribute('content', isIndexable ? 'index,follow' : 'noindex,follow');
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', pageTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language === 'es' ? 'es_ES' : 'en_US');
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', pageTitle);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, [currentGameMetadata, currentUser, gamePathId, isKnownGamePath, isNotFoundPath, language, pathname, resetTokenInUrl, routeTab, showGameNotFound, t]);

  if (isNotFoundPath || showGameNotFound) {
    return (
      <NotFoundPage
        isGameNotFound={showGameNotFound}
        onGoHome={() => {
          navigateTo('/');
          setActiveTab('feed');
          setSelectedGameId(null);
          setSelectedUserId(null);
        }}
        onSearchGames={() => {
          navigateTo('/discover');
          setActiveTab('discover');
          setSelectedGameId(null);
          setSelectedUserId(null);
        }}
      />
    );
  }

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setToken('cookie-session');
    setAuthModalOpen(false);
    setAuthNotice('');
    setAllUsers(prev => prev.some(existingUser => existingUser.id === user.id) ? prev : [...prev, user]);
    setActiveTab('feed');
    setSelectedGameId(null);
    setSelectedUserId(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }

    setCurrentUser(null);
    setToken(null);
    setSelectedGameId(null);
    setSelectedUserId(null);

    navigateTo('/');

  };

  const handleNavigation = (tab: MainTab) => {
    setActiveTab(tab);
    setSelectedGameId(null);
    setSelectedUserId(null);
    navigateTo(SECTION_PATHS[tab]);
  };

  const handleGoHome = () => {
    setActiveTab('feed');
    setSelectedGameId(null);
    setSelectedUserId(null);
    window.scrollTo(0, 0);
    navigateTo('/');
  };

  const handleGoDiscover = () => {
    setActiveTab('discover');
    setSelectedGameId(null);
    setSelectedUserId(null);
    navigateTo('/discover');
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthInitialMode(mode);
    setAuthNotice('');
    setAuthModalOpen(true);
  };

  const getGameParentLabel = (path: string) => {
    switch (path) {
      case '/':
        return t('Inicio');
      case '/discover':
        return t('Descubrir');
      case '/library':
        return t('Biblioteca');
      case '/lists':
        return t('Listas');
      case '/stats':
        return t('Estadísticas');
      case '/profile':
        return t('Mi Perfil');
      default:
        return t('Descubrir');
    }
  };

  // Subnavigation shortcuts
  const handleSelectGame = (gameId: number) => {
    // Guardamos desde qué sección se abrió el juego
    setGameReturnPath(pathname);

    navigateTo(`/game/${gameId}`);
    setSelectedGameId(null);
    setSelectedUserId(null);
  };

  const handleBackFromGame = () => {
    setSelectedGameId(null);
    setSelectedUserId(null);

    const previousTab = (
      Object.entries(SECTION_PATHS).find(
        ([, path]) => path === gameReturnPath
      )?.[0] || 'feed'
    ) as MainTab;

    setActiveTab(previousTab);
    navigateTo(gameReturnPath);
  };

  const handleSelectUser = (uId: string) => {
    setSelectedUserId(uId);
    setSelectedGameId(null);
  };

  if (resetTokenInUrl) {
    return (
      <Suspense fallback={null}>
      <div className="min-h-screen text-slate-200 font-sans">
        <Onboarding
          onLogin={handleLoginSuccess}
          onGoHome={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('resetToken');
            window.history.replaceState({}, '', url.toString());
            handleGoHome();
          }}
          initialMode="login"
          preseededUsers={allUsers}
        />
      </div>
      </Suspense>
    );
  }

  // Keep the prerendered landing visible while the session is verified.
  if (loading && !(pathname === '/' && !currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <img src="/brand/isotipo.svg" alt="" aria-hidden="true" className="h-10 w-auto animate-bounce mx-auto" />
          <p className="text-xs text-slate-500 font-mono tracking-widest animate-pulse">{t('CARGANDO GAMETRACKER...')}</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !token) {
    return (
      <Suspense fallback={null}>
      <div className="min-h-screen text-slate-200 font-sans">
        {pathname === '/' ? (
          <LandingPage
            onDiscover={handleGoDiscover}
            onOpenAuth={handleOpenAuth}
            onGoHome={handleGoHome}
          />
        ) : (
          <>
            <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 bg-[#0f121d]/95 px-4 py-3 backdrop-blur md:px-8">
              <a
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  handleGoHome();
                }}
                aria-label={t('Volver al inicio')}
                className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
              >
                <img src="/brand/isotipo.svg" alt="" aria-hidden="true" className="h-5 w-auto" />
                <span className="text-lg font-bold tracking-tight text-white">GameTracker</span>
              </a>
              <div className="flex max-w-full items-center gap-3">
                <LanguageSelector compact />
                <button type="button" onClick={() => handleOpenAuth('login')} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974]">
                  {t('Iniciar sesión / Registrarse')}
                </button>
              </div>
            </header>
            <main className={isKnownGamePath ? 'w-full pb-5 md:pb-7' : pathname.startsWith('/discover') ? 'mx-auto max-w-[96rem] px-3 pb-5 md:px-6 md:pb-7' : 'mx-auto max-w-6xl px-3 pb-5 md:px-5 md:pb-7'}>
              {isKnownGamePath ? (
                <GameDetails
                  key={gamePathId}
                  gameId={gamePathId}
                  onMetadataChange={setGameMetadata}
                  currentUser={null}
                  token={null}
                  onBack={handleBackFromGame}
                  onSelectUser={() => handleOpenAuth('login')}
                  onAuthRequired={() => {
                    setAuthNotice(t('Inicia sesión o regístrate para realizar esta acción.'));
                    setAuthModalOpen(true);
                  }}
                  onGoHome={handleGoHome}
                  breadcrumbParentLabel={getGameParentLabel(gameReturnPath)}
                  onGoBackToParent={handleBackFromGame}
                />
              ) : (
                <Discover
                  onSelectGame={handleSelectGame}
                  onSelectUser={() => handleOpenAuth('login')}
                  onAuthRequired={() => handleOpenAuth('login')}
                />
              )}
            </main>
          </>
        )}
        {authModalOpen && (
          <Dialog label={t('Iniciar sesión / Registrarse')} onClose={() => { setAuthModalOpen(false); setAuthNotice(''); }}>
            <div className="w-full">
              <button type="button" onClick={() => { setAuthModalOpen(false); setAuthNotice(''); }} className="fixed left-4 top-4 z-[60] inline-flex min-h-12 items-center rounded-full border border-slate-700 bg-[#0f121d] px-3 text-sm font-semibold text-slate-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] sm:min-h-9 sm:text-xs">
                {t('Cerrar')}
              </button>
              <Onboarding
                onLogin={handleLoginSuccess}
                onGoHome={() => {
                  setAuthModalOpen(false);
                  setAuthNotice('');
                  handleGoHome();
                }}
                initialMode={authInitialMode}
                preseededUsers={allUsers}
                notice={authNotice}
              />
            </div>
          </Dialog>
        )}
      </div>
      </Suspense>
    );
  }

  const renderActiveView = () => {
    if (selectedGameId !== null) {
      return (
        <GameDetails
          gameId={selectedGameId}
          onMetadataChange={setGameMetadata}
          currentUser={currentUser}
          token={token}
          onBack={handleBackFromGame}
          onSelectUser={handleSelectUser}
          onGoHome={handleGoHome}
          breadcrumbParentLabel={getGameParentLabel(gameReturnPath)}
          onGoBackToParent={handleBackFromGame}
        />
      );
    }

    if (isKnownGamePath) {
      return (
        <GameDetails
          gameId={gamePathId}
          onMetadataChange={setGameMetadata}
          currentUser={currentUser}
          token={token}
          onBack={handleBackFromGame}
          onSelectUser={handleSelectUser}
          onGoHome={handleGoHome}
          breadcrumbParentLabel={getGameParentLabel(gameReturnPath)}
          onGoBackToParent={handleBackFromGame}        
        />
      );
    }

    if (selectedUserId !== null) {
      return (
        <UserProfile
          userId={selectedUserId}
          currentUser={currentUser}
          onUpdateCurrentUser={setCurrentUser}
          token={token}
          onSelectGame={handleSelectGame}
          onSelectUser={handleSelectUser}
        />
      );
    }

    switch (routeTab || activeTab) {
      case 'feed':
        return (
          <HomeFeed
            currentUser={currentUser}
            onSelectGame={handleSelectGame}
            onSelectUser={handleSelectUser}
            users={allUsers}
            token={token}
            onDiscover={() => handleNavigation('discover')}
            onSearchGames={(query) => {
              setActiveTab('discover');
              setSelectedGameId(null);
              setSelectedUserId(null);
              navigateTo(`/discover?${new URLSearchParams({ q: query })}`);
            }}
          />
        );
      case 'discover':
        return <Discover onSelectGame={handleSelectGame} onSelectUser={handleSelectUser} token={token} />;
      case 'library':
        return <Library userId={currentUser.id} onSelectGame={handleSelectGame} token={token} />;
      case 'lists':
        return (
          <CustomLists
            currentUser={currentUser}
            onSelectGame={handleSelectGame}
            onSelectUser={handleSelectUser}
            token={token}
          />
        );
      case 'stats':
        return <StatsDashboard userId={currentUser.id} token={token} onSelectGame={handleSelectGame}/>;
      case 'profile':
        return (
          <UserProfile
            userId={currentUser.id}
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
            token={token}
            onSelectGame={handleSelectGame}
            onSelectUser={handleSelectUser}
          />
        );
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'feed', label: t('Inicio'), icon: Compass },
    { id: 'discover', label: t('Descubrir'), icon: Search },
    { id: 'library', label: t('Biblioteca'), icon: LibIcon },
    { id: 'lists', label: t('Listas'), icon: List },
    { id: 'stats', label: t('Estadísticas'), mobileLabel: t('Estad.'), icon: BarChart2 },
    { id: 'profile', label: t('Mi Perfil'), mobileLabel: t('Perfil'), icon: UserIcon },
  ] as const;

  const isNavItemActive = (id: MainTab) =>
    (routeTab || activeTab) === id && selectedGameId === null && selectedUserId === null;

  return (
    <div className="min-h-screen text-slate-200 flex flex-col font-sans">
      
      {/* 1. TOP HEADER (mismo formato que la landing) */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0b0d12]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-[86rem] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              handleGoHome();
            }}
            aria-label={t('Volver al inicio')}
            className="flex shrink-0 items-center gap-2.5 rounded-lg text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974]"
          >
            <img src="/brand/isotipo.svg" alt="" aria-hidden="true" className="h-6 w-auto sm:h-7" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">GameTracker</span>
          </a>

          <nav aria-label={t('Navegación principal')} className="hidden items-center gap-7 md:flex">
            {navItems.filter(item => item.id !== 'profile').map(item => {
              const active = isNavItemActive(item.id);

              return (
                <a
                  key={item.id}
                  href={SECTION_PATHS[item.id]}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigation(item.id);
                  }}
                  className={`border-b-2 py-1 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e5b974] ${
                    active
                      ? 'border-[#e5b974] text-white'
                      : 'border-transparent text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSelector compact />
            <button
              type="button"
              onClick={() => handleNavigation('profile')}
              aria-current={isNavItemActive('profile') ? 'page' : undefined}
              aria-label={t('Mi perfil')}
              className={`flex min-h-10 items-center gap-2 rounded-xl px-1.5 text-sm font-semibold transition hover:bg-white/[0.06] hover:text-white sm:px-3 ${
                isNavItemActive('profile') ? 'bg-white/[0.06] text-white' : 'text-slate-200'
              }`}
            >
              <img
                src={currentUser.avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="size-7 rounded-full border border-slate-800"
              />
              <span className="hidden max-w-[10rem] truncate lg:inline">@{currentUser.username}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('Cerrar sesión')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.06] hover:text-white sm:px-4 sm:text-sm"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('Cerrar Sesión')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CORE VIEWPORT */}
      <main className="flex-1 min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className={`w-full mx-auto py-4 md:py-6 ${selectedGameId !== null || isKnownGamePath ? '' : (routeTab || activeTab) === 'discover' ? 'max-w-[96rem] px-3 md:px-6' : 'max-w-6xl px-3 md:px-5'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={
                (routeTab || activeTab) +
                (selectedGameId || '') +
                (selectedUserId || '')
              }
              initial={{ opacity: 0, y: reducedMotion ? 0 : 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
            >
              <Suspense fallback={null}>{renderActiveView()}</Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 5. MOBILE BOTTOM NAV */}
      <nav aria-label={t('Navegación principal')} className="flex md:hidden items-center justify-around bg-[#0f121d] border-t border-slate-850 fixed bottom-0 left-0 right-0 min-h-16 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] z-20">
        {navItems.map(item => {
          const active =
            (routeTab || activeTab) === item.id &&
            selectedGameId === null &&
            selectedUserId === null;

          const Icon = item.icon;

          return (
            <a
              key={item.id}
              href={SECTION_PATHS[item.id]}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              onClick={(event) => {
                event.preventDefault();
                handleNavigation(item.id);
              }}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 transition cursor-pointer text-center relative ${
                active
                  ? 'text-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />

              <span className="text-[11px] leading-3 font-semibold tracking-tight sm:text-xs">
                {'mobileLabel' in item ? item.mobileLabel : item.label}
              </span>

              {active && (
                <span className="absolute bottom-[-4px] w-4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </a>
          );
        })}
      </nav>
    </div>
  );

}