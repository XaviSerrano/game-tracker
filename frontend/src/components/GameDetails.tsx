import React, { useState, useEffect, useRef } from 'react';

import {
  Game,
  UserGame,
  Review,
  CustomList,
  User,
  GameStatus
} from '../types.ts';

import { siAndroid, siApple, siLinux, siPlaystation, siSteam, type SimpleIcon } from 'simple-icons';
import { DatePicker } from './DatePicker.tsx';
import { Dialog } from './Dialog.tsx';
import {
  Star,
  Clock,
  Calendar,
  CheckSquare,
  ListPlus,
  Send,
  MessageSquare,
  ThumbsUp,
  ArrowLeft,
  ChevronDown,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkPlus
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs.tsx';
import { useLanguage } from '../i18n.tsx';

interface GameDetailsProps {
  gameId: number;
  currentUser: User | null;
  token: string | null;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
  onAuthRequired?: () => void;

  onGoHome: () => void;

  breadcrumbParentLabel: string;
  onGoBackToParent: () => void;
}

interface PlatformStyle {
  label: string;
  badgeClass: string;
  logoWrapperClass: string;
  logo:
    | { kind: 'simple'; icon: SimpleIcon; className: string; colorClass: string }
    | { kind: 'remote'; src: string; className: string }
    | { kind: 'text'; text: string; className: string; colorClass: string };
}

const PROGRESS_PHASE_OPTIONS: Array<{ value: GameStatus; label: string; helper: string; icon: string }> = [
  { value: 'PLAYING', label: 'Jugando', helper: 'En progreso', icon: '🎮' },
  { value: 'PLAYED', label: 'Jugado', helper: 'Sesión cerrada', icon: '🕹️' },
  { value: 'COMPLETED', label: 'Completado', helper: 'Objetivo cumplido', icon: '🏆' },
  { value: 'ABANDONED', label: 'Abandonado', helper: 'Pausado o cancelado', icon: '❌' }
];

const getStoreUrl = (platformName: string, gameName: string, stores: Record<string, string>): string => {
  const normalized = platformName.toLowerCase();
  const q = encodeURIComponent(gameName);

  if (normalized.includes('playstation') || normalized === 'ps5' || normalized === 'ps4') {
    return stores.playstation ?? `https://store.playstation.com/search/${q}`;
  }
  if (normalized.includes('xbox')) {
    return stores.xbox ?? `https://www.xbox.com/search?q=${q}`;
  }
  if (normalized.includes('nintendo') || normalized === 'switch') {
    return stores.nintendo ?? `https://www.nintendo.com/search/?q=${q}`;
  }
  if (normalized.includes('ios') || normalized.includes('iphone') || normalized.includes('ipad')) {
    return stores.appstore ?? `https://www.apple.com/search/${q}?src=globalnav`;
  }
  if (normalized.includes('android')) {
    return stores.googleplay ?? `https://play.google.com/store/search?q=${q}&c=apps`;
  }
  if (normalized.includes('pc') || normalized.includes('windows') || normalized.includes('linux') || normalized.includes('mac') || normalized.includes('steam')) {
    return stores.steam ?? stores.gog ?? stores.epic ?? stores.itch ?? `https://store.steampowered.com/search/?term=${q}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`comprar ${gameName} ${platformName}`)}`;
};

const getPlatformStyle = (platformName: string): PlatformStyle => {
  const normalized = platformName.toLowerCase();

  if (normalized.includes('playstation') || normalized === 'ps5' || normalized === 'ps4') {
    return {
      label: platformName,
      badgeClass: 'bg-[#003087]/18 border-[#0ea5ff]/25 text-[#8fd3ff]',
      logoWrapperClass: 'bg-[#001d52]/45',
      logo: { kind: 'simple', icon: siPlaystation, className: 'h-3.5 w-3.5', colorClass: 'text-[#8fd3ff]' }
    };
  }

  if (normalized.includes('xbox')) {
    return {
      label: platformName,
      badgeClass: 'bg-[#107c10]/18 border-[#7ddf64]/25 text-[#baf5ac]',
      logoWrapperClass: 'bg-white/95',
      logo: {
        kind: 'remote',
        src: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Xbox_logo_%282019%29.svg',
        className: 'h-3 w-auto'
      }
    };
  }

  if (normalized.includes('nintendo switch') || normalized === 'switch') {
    return {
      label: platformName,
      badgeClass: 'bg-[#e60012]/16 border-[#ff6b7a]/25 text-[#ffbcc4]',
      logoWrapperClass: 'bg-white/95',
      logo: {
        kind: 'remote',
        src: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Nintendo_Switch_logo.svg',
        className: 'h-4 w-auto'
      }
    };
  }

  if (normalized.includes('nintendo')) {
    return {
      label: platformName,
      badgeClass: 'bg-[#e60012]/12 border-[#ff6b7a]/20 text-[#ffc7cf]',
      logoWrapperClass: 'bg-white/15',
      logo: { kind: 'text', text: 'N', className: 'text-[10px] font-black', colorClass: 'text-[#ffc7cf]' }
    };
  }

  if (normalized.includes('steam')) {
    return {
      label: platformName,
      badgeClass: 'bg-slate-700/25 border-slate-500/20 text-slate-200',
      logoWrapperClass: 'bg-slate-900/55',
      logo: { kind: 'simple', icon: siSteam, className: 'h-3.5 w-3.5', colorClass: 'text-slate-200' }
    };
  }

  if (normalized.includes('ios') || normalized.includes('iphone') || normalized.includes('ipad')) {
    return {
      label: platformName,
      badgeClass: 'bg-slate-500/15 border-slate-300/20 text-slate-100',
      logoWrapperClass: 'bg-white/10',
      logo: { kind: 'simple', icon: siApple, className: 'h-3.5 w-3.5', colorClass: 'text-slate-100' }
    };
  }

  if (normalized.includes('android')) {
    return {
      label: platformName,
      badgeClass: 'bg-[#3ddc84]/14 border-[#9fe870]/20 text-[#cbf7b1]',
      logoWrapperClass: 'bg-[#143822]/55',
      logo: { kind: 'simple', icon: siAndroid, className: 'h-3.5 w-3.5', colorClass: 'text-[#cbf7b1]' }
    };
  }

  if (normalized.includes('linux')) {
    return {
      label: platformName,
      badgeClass: 'bg-slate-700/20 border-slate-400/20 text-slate-200',
      logoWrapperClass: 'bg-slate-900/55',
      logo: { kind: 'simple', icon: siLinux, className: 'h-3.5 w-3.5', colorClass: 'text-slate-200' }
    };
  }

  if (normalized.includes('mac') || normalized.includes('os x')) {
    return {
      label: platformName,
      badgeClass: 'bg-slate-500/15 border-slate-300/20 text-slate-100',
      logoWrapperClass: 'bg-white/10',
      logo: { kind: 'simple', icon: siApple, className: 'h-3.5 w-3.5', colorClass: 'text-slate-100' }
    };
  }

  if (normalized.includes('pc') || normalized.includes('windows')) {
    return {
      label: platformName,
      badgeClass: 'bg-slate-700/25 border-slate-500/20 text-slate-200',
      logoWrapperClass: 'bg-slate-900/55',
      logo: { kind: 'text', text: 'PC', className: 'text-[9px] font-black tracking-wide', colorClass: 'text-slate-200' }
    };
  }

  return {
    label: platformName,
    badgeClass: 'bg-violet-500/10 border-violet-400/20 text-violet-200',
    logoWrapperClass: 'bg-violet-950/35',
    logo: {
      kind: 'text',
      text: platformName.slice(0, 2).toUpperCase(),
      className: 'text-[9px] font-black tracking-wide',
      colorClass: 'text-violet-200'
    }
  };
};

const PlatformBadgeLogo: React.FC<{ platform: PlatformStyle }> = ({ platform }) => {
  if (platform.logo.kind === 'simple') {
    return (
      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 ${platform.logoWrapperClass}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className={`${platform.logo.className} ${platform.logo.colorClass}`}>
          <path fill="currentColor" d={platform.logo.icon.path} />
        </svg>
      </span>
    );
  }

  if (platform.logo.kind === 'remote') {
    return (
      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 ${platform.logoWrapperClass}`}>
        <img src={platform.logo.src} alt="" aria-hidden="true" className={platform.logo.className} />
      </span>
    );
  }

  return (
    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 ${platform.logoWrapperClass} ${platform.logo.className} ${platform.logo.colorClass}`}>
      {platform.logo.text}
    </span>
  );
};

export const GameDetails: React.FC<GameDetailsProps> = ({
  gameId,
  currentUser,
  token,
  onBack,
  onSelectUser,
  onAuthRequired,
  onGoHome,
  breadcrumbParentLabel,
  onGoBackToParent
}) => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : 'es-ES';
  const progressMenuRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [storeLinks, setStoreLinks] = useState<Record<string, string>>({});
  const [userGame, setUserGame] = useState<UserGame | null>(null);
  const [reviews, setReviews] = useState<(Review & { author: User })[]>([]);
  const [myLists, setMyLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [listsWithGame, setListsWithGame] = useState<Set<string>>(new Set());
  const [listMembership, setListMembership] = useState<Record<string, boolean>>({});
  const [updatingListId, setUpdatingListId] = useState<string | null>(null);
  
  // Form states for library tracking
  const [status, setStatus] = useState<GameStatus>('WISHLIST');
  const [rating, setRating] = useState<number>(0);
  const [hoursPlayed, setHoursPlayed] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [completedAt, setCompletedAt] = useState<string>('');

  // Form states for new review
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');

  const [message, setMessage] = useState('');
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [progressMenuOpen, setProgressMenuOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  const progressPhaseOptions = PROGRESS_PHASE_OPTIONS.map(option => ({
    ...option,
    label: t(option.label),
    helper: t(option.helper)
  }));
  const selectedProgressOption = progressPhaseOptions.find(option => option.value === status) || progressPhaseOptions[0];
  // Screenshot gallery
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [fullscreenScreenshot, setFullscreenScreenshot] = useState<number | null>(null);

  const screenshots = game?.screenshots ?? [];

  const [translatedSummary, setTranslatedSummary] = useState<{ gameId: number; language: string; text: string } | null>(null);
  const displayedSummary =
    translatedSummary && translatedSummary.gameId === game?.igdbId && translatedSummary.language === language
      ? translatedSummary.text
      : game?.summary ?? '';

  useEffect(() => {
    if (!game) return;

    const suffix = language === 'es'
      ? 'ficha, plataformas y valoraciones'
      : 'details, platforms, and ratings';
    const title = `${game.name}: ${suffix} | GameTracker`;
    const fullDescription = displayedSummary || t('Descubre información, plataformas, valoraciones y reseñas de videojuegos en GameTracker.');
    const description = fullDescription.length > 160
      ? `${fullDescription.slice(0, 157).trimEnd()}...`
      : fullDescription;

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, [displayedSummary, game, language, t]);

  useEffect(() => {
    if (language !== 'es' || !game?.igdbId || !game.summary) return;
    const controller = new AbortController();
    fetch(`/api/games/${game.igdbId}/summary?lang=es`, { signal: controller.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.translated && typeof data.summary === 'string') {
          setTranslatedSummary({ gameId: game.igdbId, language: 'es', text: data.summary });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [game?.igdbId, game?.summary, language]);

  const requireSession = () => {
    if (currentUser && token) return false;
    onAuthRequired?.();
    return true;
  };

  const handlePrivateButtonClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button') && (!currentUser || !token)) {
      event.preventDefault();
      event.stopPropagation();
      requireSession();
    }
  };

  const fetchGameData = async () => {
    setLoading(true);
    setErrorMessage(null);
    setLibraryReady(false);
    setUserGame(null);
    setIsInWishlist(false);
    setStatus('WISHLIST');
    setRating(0);
    setHoursPlayed(0);
    setNotes('');
    setStartedAt('');
    setCompletedAt('');
    try {
      // 1. Fetch game details
      const gameRes = await fetch(`/api/games/${gameId}`);
      if (!gameRes.ok) {
        if (gameRes.status === 404) {
          setErrorMessage(t('Este juego no existe o ya no está disponible.'));
        }
        throw new Error(`Failed to load game (${gameRes.status})`);
      }
      const gameData = await gameRes.json();
      setGame(gameData);

      fetch(`/api/games/${gameId}/stores`)
        .then(res => (res.ok ? res.json() : {}))
        .then(setStoreLinks)
        .catch(() => setStoreLinks({}));
      // Fetch public reviews independently of authentication.
      const reviewsRes = await fetch(`/api/reviews/${gameId}`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }

      if (currentUser && token) {
        const ugRes = await fetch(`/api/users/${currentUser.id}/library`);
        if (ugRes.ok) {
          const ugData: (UserGame & { game: Game })[] = await ugRes.json();
          const found = ugData.find(item => item.gameId === gameId);
          if (found) {
            setUserGame(found);
            setStatus(found.status);
            setRating(found.rating);
            setHoursPlayed(found.hoursPlayed);
            setNotes(found.notes);
            setStartedAt(found.startedAt || '');
            setCompletedAt(found.completedAt || '');
            setIsInWishlist(found.isInWishlist);
          }
          setLibraryReady(true);
        } else {
          setMessage(`Error: ${t('No se pudo cargar tu biblioteca.')}`);
        }

        const listsRes = await fetch(`/api/lists?userId=${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (listsRes.ok) {
          const listsData = await listsRes.json();
          setMyLists(listsData);
        }
      }
    } catch (err) {
      console.error(err);
      if (currentUser && token) setMessage(`Error: ${t('No se pudo cargar tu biblioteca.')}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameData();
  }, [gameId, currentUser?.id, token]);

  useEffect(() => {
    if (!progressMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!progressMenuRef.current?.contains(event.target as Node)) {
        setProgressMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [progressMenuOpen]);

  useEffect(() => {
    if (fullscreenScreenshot === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPreviousFullscreenScreenshot();
      }

      if (event.key === 'ArrowRight') {
        goToNextFullscreenScreenshot();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenScreenshot, screenshots.length]);


  const saveTracking = async (nextStatus: GameStatus, successMessage = t('¡Biblioteca actualizada con éxito!')) => {
    if (requireSession()) return;
    setMessage('');
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameId,
          status: nextStatus,
          rating,
          hoursPlayed,
          notes,
          startedAt: startedAt || null,
          completedAt: completedAt || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save tracking');
      
      setUserGame(data);
      setStatus(nextStatus);
      setIsInWishlist(data.isInWishlist);
      setMessage(successMessage);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${t(err.message)}`);
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTracking(status);
  };

  const handleToggleWishlist = async () => {
    if (savingWishlist) return;
    if (requireSession()) return;

    setSavingWishlist(true);
    setMessage('');

    try {
      if (!isInWishlist && !userGame) {
        const importRes = await fetch(`/api/games/import/${gameId}`, { method: 'POST' });
        const importData = await importRes.json();
        if (!importRes.ok) {
          throw new Error(importData?.error || 'No se pudo importar el juego.');
        }
      }
      const saveRes = await fetch(`/api/library/${gameId}/wishlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enabled: !isInWishlist })
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData?.error || 'No se pudo actualizar la wishlist.');
      setIsInWishlist(!isInWishlist);
      setUserGame(saveData.userGame);
      if (saveData.userGame) setStatus(saveData.userGame.status);
      setMessage(isInWishlist ? t('Juego removido de tu wishlist.') : t('¡Juego añadido a tu wishlist!'));
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${t(err.message)}`);
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireSession()) return;
    if (!reviewTitle.trim() || !reviewContent.trim()) return;

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameId,
          title: reviewTitle,
          content: reviewContent,
          rating
        })
      });
      if (res.ok) {
        setReviewTitle('');
        setReviewContent('');
        // Refresh reviews and tracking
        fetchGameData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (requireSession()) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        // Refresh reviews
        const reviewsRes = await fetch(`/api/reviews/${gameId}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleList = async (listId: string) => {
    setUpdatingListId(listId);

    try {
      const listRes = await fetch(`/api/lists/${listId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!listRes.ok) {
        throw new Error('No se pudo obtener la lista');
      }

      const listData = await listRes.json();

      const activeIds = listData.games.map((g: Game) => g.igdbId);
      const isCurrentlyInList = activeIds.includes(gameId);

      const newGameIds = isCurrentlyInList
        ? activeIds.filter((id: number) => id !== gameId)
        : [...activeIds, gameId];

      const updateRes = await fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: listData.name,
          description: listData.description,
          gameIds: newGameIds
        })
      });

      if (!updateRes.ok) {
        throw new Error('No se pudo actualizar la lista');
      }

      // Actualización optimista del estado visual
      setListMembership(prev => ({
        ...prev,
        [listId]: !isCurrentlyInList
      }));

    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingListId(null);
    }
  };

  const loadListsWithGame = async () => {
    const listsContainingGame = new Set<string>();

    await Promise.all(
      myLists.map(async (list) => {
        try {
          const res = await fetch(`/api/lists/${list.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok) return;

          const listData = await res.json();

          const containsGame = listData.games.some(
            (game: Game) => game.igdbId === gameId
          );

          if (containsGame) {
            listsContainingGame.add(list.id);
          }
        } catch (err) {
          console.error(`Error comprobando la lista ${list.id}:`, err);
        }
      })
    );

    setListsWithGame(listsContainingGame);
  };

  const loadListMembership = async () => {
    const membership: Record<string, boolean> = {};

    await Promise.all(
      myLists.map(async (list) => {
        try {
          const res = await fetch(`/api/lists/${list.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok) return;

          const listData = await res.json();

          const isInList = listData.games.some(
            (game: Game) => game.igdbId === gameId
          );

          membership[list.id] = isInList;
        } catch (err) {
          console.error(`Error comprobando la lista ${list.id}:`, err);
        }
      })
    );

    setListMembership(membership);
  };
  

  const goToPreviousScreenshot = () => {
    if (screenshots.length === 0) return;

    setSelectedScreenshot((current) =>
      current === 0 ? screenshots.length - 1 : current - 1
    );
  };

  const goToNextScreenshot = () => {
    if (screenshots.length === 0) return;

    setSelectedScreenshot((current) =>
      current === screenshots.length - 1 ? 0 : current + 1
    );
  };

  const goToPreviousFullscreenScreenshot = () => {
    if (fullscreenScreenshot === null || screenshots.length === 0) return;

    setFullscreenScreenshot((current) =>
      current === 0 ? screenshots.length - 1 : current! - 1
    );
  };

  const goToNextFullscreenScreenshot = () => {
    if (fullscreenScreenshot === null || screenshots.length === 0) return;

    setFullscreenScreenshot((current) =>
      current === screenshots.length - 1 ? 0 : current! + 1
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20 animate-pulse selection:bg-blue-600 selection:text-white">
        <div className="h-64 bg-slate-800 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-6 bg-slate-850 rounded w-1/3"></div>
            <div className="h-20 bg-slate-850 rounded w-full"></div>
          </div>
          <div className="h-60 bg-slate-850 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12 space-y-4 selection:bg-blue-600 selection:text-white">
        <p className="text-lg font-semibold text-white">
          {t(errorMessage || 'No pudimos recopilar los datos de este videojuego.')}
        </p>
        <p className="text-sm text-slate-500">{t('Comprueba la dirección o vuelve a descubrir otros juegos.')}</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white">
          {t('Volver al inicio')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white relative">
      <div className="relative isolate overflow-hidden pb-8 pt-24 md:pb-12 md:pt-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full max-h-[34rem] overflow-hidden">
          <img
            src={screenshots[0] || game.cover}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] object-cover object-center opacity-75 blur-md"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d12]/45 via-[#0b0d12]/65 to-[#0b0d12]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12]/70 via-[#0b0d12]/30 to-transparent" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 mx-auto w-[calc(100%-2rem)] md:w-4/5">
          <Breadcrumbs
            className="pointer-events-auto absolute left-0 top-0"
            items={
              breadcrumbParentLabel === t('Inicio')
                ? [
                    {
                      label: t('Inicio'),
                      onClick: onGoHome
                    },
                    {
                      label: game.name
                    }
                  ]
                : [
                    {
                      label: t('Inicio'),
                      onClick: onGoHome
                    },
                    {
                      label: breadcrumbParentLabel,
                      onClick: onGoBackToParent
                    },
                    {
                      label: game.name
                    }
                  ]
            }
          />
          <button
            type="button"
            onClick={onBack}
            className="pointer-events-auto absolute left-0 top-8 inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-white group"
          >
            <ArrowLeft className="w-4 h-4 transition group-hover:-translate-x-0.5" />
            {t('Volver a')} {breadcrumbParentLabel}
          </button>
        </div>

        <div className="mx-auto flex w-[calc(100%-2rem)] flex-col gap-6 md:w-4/5 md:flex-row md:items-start md:gap-8">
          <img
            src={game.cover}
            alt={game.name}
            referrerPolicy="no-referrer"
            className="aspect-[3/4] w-36 shrink-0 rounded-lg object-cover shadow-xl md:w-44"
          />
          <div className="min-w-0 flex-1 space-y-4 text-left">
            <div>
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-300">
                <span>{game.releaseDate && game.releaseDate !== 'Unknown' && !Number.isNaN(new Date(game.releaseDate).getTime()) ? new Date(game.releaseDate).getFullYear() : t('Desconocido')}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold font-display text-white tracking-tight mt-1.5">
                {game.name}
              </h1>
            </div>

            <p className="max-w-3xl text-sm leading-7 text-slate-200">
              {displayedSummary}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {game.genres.map(genre => (
                <a
                  key={genre}
                  href={`/discover?genre=${encodeURIComponent(genre)}`}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono rounded-full text-slate-400"
                >
                  {genre}
                </a>
              ))}
            </div>

            <div className="border-t border-white/15 pt-4">
              <div className="mb-3">
                <div>
                  <p className="text-xs font-semibold text-slate-200">{t('Tiempo de juego')}</p>
                  <p className="mt-1 text-xs text-slate-400">{t('Estimación orientativa de IGDB')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-300">{t('Historia')}</p>
                  <p className="mt-1 text-lg font-semibold leading-none text-white">{game.timeToBeat?.hastily ?? '--'}{game.timeToBeat?.hastily != null && <span className="ml-1 text-xs font-semibold text-slate-300">h</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-300">{t('Historia + extras')}</p>
                  <p className="mt-1 text-lg font-semibold leading-none text-white">{game.timeToBeat?.normally ?? '--'}{game.timeToBeat?.normally != null && <span className="ml-1 text-xs font-semibold text-slate-300">h</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-300">{t('Completista')}</p>
                  <p className="mt-1 text-lg font-semibold leading-none text-white">{game.timeToBeat?.completely ?? '--'}{game.timeToBeat?.completely != null && <span className="ml-1 text-xs font-semibold text-slate-300">h</span>}</p>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-white/15 pt-4 sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-xs text-slate-400">{t('Desarrolladora')}</dt>
                <dd className="mt-1 break-words text-sm text-slate-200">{game.developers?.join(', ') || t('Desconocido')}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-400">{t('Distribuidora')}</dt>
                <dd className="mt-1 break-words text-sm text-slate-200">{game.publishers?.join(', ') || t('Desconocido')}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-400">{t('Fecha de lanzamiento')}</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {game.releaseDate && game.releaseDate !== 'Unknown' && !Number.isNaN(new Date(game.releaseDate).getTime())
                    ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(game.releaseDate))
                    : t('Desconocido')}
                </dd>
              </div>
            </dl>

            {game.platforms.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('Plataformas')}</p>
                <div className="flex flex-wrap gap-2">
                  {game.platforms.map(platform => {
                    const style = getPlatformStyle(platform);
                    return (
                      <a
                        key={platform}
                        href={getStoreUrl(platform, game.name, storeLinks)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${style.badgeClass}`}
                        title={`${t('Comprar en')} ${platform}`}
                      >
                        <PlatformBadgeLogo platform={style} />
                        <span className="text-left leading-none">
                          <span className="block">{style.label}</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {game.rating && (
            <div className="shrink-0 self-start text-left">
              <span className="block text-xs font-semibold text-slate-300">IGDB Score</span>
              <div className="mt-1 flex items-center gap-1 text-yellow-400">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-black font-display text-white">{game.rating}</span>
                <span className="text-xs text-slate-600">/100</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-[calc(100%-2rem)] md:w-4/5">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          <div className="min-w-0 space-y-8">
          
          {/* Tracking control form */}
          <div onClickCapture={handlePrivateButtonClick} className="space-y-5 border-t border-slate-800 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                {t('Tú diario de Juego (Track)')}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  disabled={savingWishlist || (!!currentUser && !!token && !libraryReady)}
                  aria-label={isInWishlist ? t('Remover de Wishlist') : t('Añadir a Wishlist')}
                  aria-pressed={isInWishlist}
                  title={isInWishlist ? t('Remover de Wishlist') : t('Añadir a Wishlist')}
                  className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    isInWishlist
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
                      : 'bg-[#07090e] border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isInWishlist ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setListModalOpen(true);
                    await loadListMembership();
                  }}
                  title={t('Añadir a lista personalizada')}
                  aria-label={t('Añadir a lista personalizada')}
                  className="p-2 rounded-xl border border-slate-800 bg-[#07090e] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all cursor-pointer flex items-center justify-center"
                >
                  <BookmarkPlus className="w-4 h-4" />
                </button>

              </div>
            </div>

            {message && (
              <div className={`p-2.5 border text-xs rounded-xl ${message.includes('Error') ? 'bg-red-950/40 border-red-500/20 text-red-400' : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSaveTracking} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p id="progress-label" className="block text-xs font-semibold text-slate-400">{t('Fase de Progreso')}</p>
                <div className="relative" ref={progressMenuRef}>
                  <button
                    type="button"
                    aria-labelledby="progress-label progress-value"
                    aria-expanded={progressMenuOpen}
                    onClick={() => setProgressMenuOpen(prev => !prev)}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{selectedProgressOption.icon}</span>
                      <span id="progress-value" className="text-left">
                        <span className="font-semibold text-slate-200 block">{selectedProgressOption.label}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{selectedProgressOption.helper}</span>
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition ${progressMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {progressMenuOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-[#07090e] border border-slate-800 rounded-xl p-1.5 shadow-2xl space-y-1">
                      {progressPhaseOptions.map(option => {
                        const active = status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setStatus(option.value);
                              setProgressMenuOpen(false);
                            }}
                            className={`w-full text-left rounded-lg px-2.5 py-2 transition cursor-pointer flex items-start gap-2 ${
                              active
                                ? 'bg-blue-600/15 border border-blue-500/25'
                                : 'border border-transparent hover:bg-slate-800/80'
                            }`}
                          >
                            <span className="text-sm leading-4 mt-0.5">{option.icon}</span>
                            <span>
                              <span className={`text-xs font-semibold block ${active ? 'text-blue-300' : 'text-slate-200'}`}>
                                {option.label}
                              </span>
                              <span className={`text-[10px] block mt-0.5 ${active ? 'text-blue-400/85' : 'text-slate-500'}`}>
                                {option.helper}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{t('Rating')}</label>
                <div className="flex bg-[#07090e] border border-slate-800 rounded-xl p-1.5 items-center justify-between">
                  <div className="flex gap-1 pl-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={`${star} ${t('estrellas')}`}
                        aria-pressed={rating === star}
                        className="min-h-10 min-w-10 flex items-center justify-center hover:scale-110 transition cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-400 pr-2">
                    {rating > 0 ? `${rating}/5 ${t('estrellas')}` : t('Sin puntuar')}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="hours-played" className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-600" /> {t('Horas Jugadas')}
                </label>
                <input
                  id="hours-played"
                  type="number"
                  min="0"
                  step="0.5"
                  value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-700 transition outline-none"
                />
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="started-at" className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" /> {t('Empezado el')}
                  </label>
                  <DatePicker id="started-at" value={startedAt} onChange={setStartedAt} placeholder={t('Selecciona inicio')} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="completed-at" className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" /> {t('Completado el')}
                  </label>
                  <DatePicker
                    id="completed-at"
                    value={completedAt}
                    onChange={setCompletedAt}
                    placeholder={t('Selecciona fin')}
                    disabled={status !== 'COMPLETED' && status !== 'PLAYED'}
                  />
                </div>
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label htmlFor="game-notes" className="block text-xs font-semibold text-slate-400">{t('Notas privadas de juego')}</label>
                <textarea
                  id="game-notes"
                  placeholder={t('Escribe anotaciones de tus progresos actuales, builds preferidas, jefes difíciles, o recordatorios...')}
                  value={notes}
                  rows={2}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white placeholder-slate-750 transition outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="col-span-1 md:col-span-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl cursor-pointer text-xs mt-2 transition"
              >
                {t('Guardar Diario de Juego')}
              </button>
            </form>
          </div>

          {/* Write custom review section */}
          <div onClickCapture={handlePrivateButtonClick} className="space-y-4 border-t border-slate-800 pt-6">
            <h3 className="font-bold text-slate-300 font-display text-sm">{t('Reseñar este juego')}</h3>
            <form onSubmit={handleSubmitReview} className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  {t('Rating general (mismo del tracking)')}
                </label>
                <div className="flex gap-1.5 bg-[#07090e] p-2 border border-slate-800 rounded-xl justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} ${t('estrellas')}`}
                      aria-pressed={rating === star}
                      className="min-h-10 min-w-10 flex items-center justify-center hover:scale-110 transition cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 text-center">
                  {t('Este valor es único y se comparte entre tu diario y tu reseña.')}
                </p>
              </div>

              <div>
                <input
                  type="text"
                  aria-label={t('Título corto de la reseña...')}
                  placeholder={t('Título corto de la reseña...')}
                  value={reviewTitle}
                  required
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-indigo-500 rounded-xl p-2 px-3 text-xs text-white placeholder-slate-650 transition outline-none"
                />
              </div>

              <div>
                <textarea
                  aria-label={t('Escribe tu opinión crítica detallada del videojuego...')}
                  placeholder={t('Escribe tu opinión crítica detallada del videojuego...')}
                  value={reviewContent}
                  required
                  rows={4}
                  onChange={(e) => setReviewContent(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-slate-700 transition outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Send className="w-3.5 h-3.5" /> {t('Publicar Reseña')}
              </button>
            </form>
          </div>

          </div>
          <div className="min-w-0 space-y-8">
          {screenshots.length > 0 && (
            <section className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-300 font-display flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-blue-500"></span>
                    {t('Imágenes del juego')}
                  </h2>

                  <p className="text-[10px] text-slate-500 mt-1 ml-3">
                    {t('Explora capturas de')} {game.name}
                  </p>
                </div>

                <span className="text-[10px] font-mono text-slate-500">
                  {selectedScreenshot + 1} / {screenshots.length}
                </span>
              </div>

              {/* Main image */}
              <div className="relative group overflow-hidden rounded-2xl border border-slate-850 bg-[#07090e]">
                <button
                  type="button"
                  onClick={() => setFullscreenScreenshot(selectedScreenshot)}
                  className="block w-full cursor-zoom-in"
                >
                  <img
                    src={screenshots[selectedScreenshot]}
                    alt={`${game.name} screenshot ${selectedScreenshot + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-video object-cover"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition pointer-events-none" />

                  {/* Fullscreen button */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>
                </button>

                {/* Previous */}
                {screenshots.length > 1 && (
                  <button
                    type="button"
                    onClick={goToPreviousScreenshot}
                    aria-label={t('Imagen anterior')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* Next */}
                {screenshots.length > 1 && (
                  <button
                    type="button"
                    onClick={goToNextScreenshot}
                    aria-label={t('Siguiente imagen')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Thumbnails */}
              {screenshots.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {screenshots.map((screenshot, index) => {
                    const isActive = selectedScreenshot === index;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedScreenshot(index)}
                        className={`relative flex-shrink-0 w-28 md:w-36 aspect-video rounded-xl overflow-hidden border transition ${
                          isActive
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-slate-850 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={screenshot}
                          alt={`${t('Miniatura')} ${index + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />

                        {isActive && (
                          <div className="absolute inset-0 bg-blue-500/10" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Public comments / reviews */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              {t('Reseñas de la Comunidad')} ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <div className="space-y-1 border-t border-slate-800 py-6 text-center text-slate-500">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-700" />
                <p className="text-xs">{t('No hay reseñas para este juego todavía. ¡Comparte tu opinión tú mismo!')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(rev => (
                  <div
                    key={rev.id}
                    className="block space-y-3 border-t border-slate-800 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onSelectUser(rev.userId)}
                        className="flex items-center gap-2 text-left cursor-pointer"
                      >
                        <img
                          src={rev.author.avatar}
                          alt={rev.author.username}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-slate-800"
                        />
                        <div>
                          <p className="text-xs font-bold text-white hover:text-blue-400 transition leading-tight">
                            @{rev.author.username}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(rev.createdAt).toLocaleDateString(dateLocale)}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleLikeReview(rev.id)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition ${currentUser && rev.likes.includes(currentUser.id) ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-[#07090e] text-slate-500 border-slate-800 hover:text-slate-355'}`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="font-bold">{rev.likes.length}</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      {(rev.rating ?? 0) > 0 && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${(rev.rating ?? 0) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`}
                            />
                          ))}
                          <span className="text-[10px] text-slate-500 font-semibold ml-1">
                            {(rev.rating ?? 0)}/5
                          </span>
                        </div>
                      )}
                      <h4 className="text-xs font-bold text-slate-200">{rev.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{rev.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

      </div>

      {/* Add to Custom List modal */}
      {listModalOpen && (
        <Dialog label={t('Añadir a lista personalizada')} onClose={() => setListModalOpen(false)} closeOnBackdrop>
          <div
            className="w-full max-w-sm bg-[#0f121d] border border-slate-850 rounded-2xl p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-300 font-display text-sm flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-blue-400" /> {t('Añadir a lista personalizada')}
              </h4>
              <button
                type="button"
                onClick={() => setListModalOpen(false)}
                aria-label={t('Cerrar')}
                className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {myLists.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {t('Todavía no tienes listas personalizadas creadas.')}
              </p>
            ) : (
              <>
                <p className="text-[11px] text-slate-500">
                  {t('Agrega este juego a una de tus listas personalizadas existentes:')}
                </p>
                <div className="space-y-1.5 pt-1 max-h-64 overflow-y-auto">
                {myLists.map(list => {
                  const isInList = listMembership[list.id] === true;
                  const isUpdating = updatingListId === list.id;

                  return (
                    <button
                      key={list.id}
                      onClick={() => handleToggleList(list.id)}
                      disabled={isUpdating}
                      className={`w-full text-left p-2.5 border rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                        isInList
                          ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                          : 'bg-[#07090e] hover:bg-blue-600/10 border-slate-800 hover:border-blue-500/20 text-slate-300 hover:text-blue-400'
                      }`}
                    >
                      <span>{list.name}</span>

                      <span
                        className={`text-[10px] font-normal ${
                          isInList ? 'text-blue-400' : 'text-slate-500'
                        }`}
                      >
                        {isUpdating
                          ? t('Actualizando...')
                          : isInList
                            ? `✓ ${t('Añadido')}`
                            : `${t('Añadir')} +`}
                      </span>
                    </button>
                  );
                })}
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
        {fullscreenScreenshot !== null && (
          <Dialog label={t('Imágenes del juego')} onClose={() => setFullscreenScreenshot(null)} closeOnBackdrop>
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setFullscreenScreenshot(null)}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setFullscreenScreenshot(null)}
              aria-label={t('Cerrar galería')}
              className="absolute top-5 right-5 z-20 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 text-xs text-slate-300 font-mono">
              {fullscreenScreenshot + 1} / {screenshots.length}
            </div>

            {/* Previous */}
            {screenshots.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToPreviousFullscreenScreenshot();
                }}
                aria-label={t('Imagen anterior')}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <img
              src={screenshots[fullscreenScreenshot]}
              alt={`${game.name} screenshot ${fullscreenScreenshot + 1}`}
              referrerPolicy="no-referrer"
              onClick={(event) => event.stopPropagation()}
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />

            {/* Next */}
            {screenshots.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToNextFullscreenScreenshot();
                }}
                aria-label={t('Siguiente imagen')}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
          </Dialog>
        )}
    </div>
  );
};
