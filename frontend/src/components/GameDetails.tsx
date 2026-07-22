import React, { useState, useEffect, useRef } from 'react';
import { Game, UserGame, Review, CustomList, User, GameStatus } from '../types.ts';
import { Star, Clock, Calendar, CheckSquare, ListPlus, Send, MessageSquare, ThumbsUp, Trash2, ArrowLeft, ChevronDown, X } from 'lucide-react';
import { siAndroid, siApple, siLinux, siPlaystation, siSteam, type SimpleIcon } from 'simple-icons';
import { DatePicker } from './DatePicker.tsx';

interface GameDetailsProps {
  gameId: number;
  currentUser: User;
  token: string;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
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

export const GameDetails: React.FC<GameDetailsProps> = ({ gameId, currentUser, token, onBack, onSelectUser }) => {
  const progressMenuRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [userGame, setUserGame] = useState<UserGame | null>(null);
  const [reviews, setReviews] = useState<(Review & { author: User })[]>([]);
  const [myLists, setMyLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);
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
  const selectedProgressOption = PROGRESS_PHASE_OPTIONS.find(option => option.value === status) || PROGRESS_PHASE_OPTIONS[0];

  const fetchGameData = async () => {
    setLoading(true);
    try {
      // 1. Fetch game details
      const gameRes = await fetch(`/api/games/${gameId}`);
      if (!gameRes.ok) throw new Error('Failed to load game');
      const gameData = await gameRes.json();
      setGame(gameData);

      // 2. Fetch user's tracking info
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
        }
      }

      // 3. Fetch reviews
      const reviewsRes = await fetch(`/api/reviews/${gameId}`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }

      // 4. Fetch my custom lists (for add-to-list action)
      const listsRes = await fetch(`/api/lists?userId=${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        setMyLists(listsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

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

  const saveTracking = async (nextStatus: GameStatus, successMessage = '¡Biblioteca actualizada con éxito!') => {
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
      setMessage(successMessage);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTracking(status);
  };

  const handleAddToWishlist = async () => {
    setSavingWishlist(true);
    await saveTracking('WISHLIST', '¡Juego añadido a tu wishlist!');
    setSavingWishlist(false);
  };

  const handleDeleteTracking = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar este juego de tu biblioteca?')) return;
    try {
      const res = await fetch(`/api/library/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setUserGame(null);
        setStatus('WISHLIST');
        setRating(0);
        setHoursPlayed(0);
        setNotes('');
        setStartedAt('');
        setCompletedAt('');
        setMessage('Juego eliminado de tu biblioteca.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <p className="text-slate-400">No pudimos recopilar los datos de este videojuego.</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white">
          Volver atrás
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white relative">
      {/* Back navigaton top link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" /> Volver al Catálogo
      </button>

      {/* Game Header panel */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#121625] border border-slate-850 p-6 rounded-2xl md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
          <img
            src={game.cover}
            alt={game.name}
            referrerPolicy="no-referrer"
            className="w-40 h-54 rounded-xl object-cover shadow-2xl border border-slate-850 flex-shrink-0 mx-auto md:mx-0"
          />
          <div className="flex-1 min-w-0 space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 text-slate-500 text-xs">
                <span>{game.releaseDate ? new Date(game.releaseDate).getFullYear() : 'Desconocido'}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold font-display text-white tracking-tight mt-1.5">
                {game.name}
              </h1>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed md:max-w-2xl line-clamp-4 hover:line-clamp-none transition duration-200">
              {game.summary}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-1">
              {game.genres.map(genre => (
                <span
                  key={genre}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono rounded-full text-slate-400"
                >
                  {genre}
                </span>
              ))}
            </div>

            {game.platforms.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plataformas</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {game.platforms.map(platform => {
                    const style = getPlatformStyle(platform);
                    return (
                      <span
                        key={platform}
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${style.badgeClass}`}
                        title={platform}
                      >
                        <PlatformBadgeLogo platform={style} />
                        <span className="text-left leading-none">
                          <span className="block">{style.label}</span>
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {game.rating && (
            <div className="self-center md:self-start bg-[#07090e] border border-slate-800 p-4 rounded-xl text-center flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">IGDB Score</span>
              <div className="flex items-center gap-1 text-yellow-400 justify-center mt-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-black font-display text-white">{game.rating}</span>
                <span className="text-xs text-slate-600">/100</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playtracking forms & comments area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tracking control form */}
          <div className="bg-[#0f121d] border border-slate-850 p-6 rounded-2xl space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                Tú diario de Juego (Track)
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddToWishlist}
                  disabled={savingWishlist || (userGame?.status === 'WISHLIST' && status === 'WISHLIST')}
                  className="p-1 px-2.5 text-[10px] text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/10 transition cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingWishlist ? 'Guardando...' : 'Añadir a wishlist'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setListModalOpen(true);
                    await loadListMembership();
                  }}
                  className="p-1 px-2.5 text-[10px] text-blue-300 border border-blue-500/25 hover:bg-blue-500/10 transition cursor-pointer rounded-lg flex items-center gap-1"
                >
                  <ListPlus className="w-3 h-3" /> Añadir a lista personalizada
                </button>
                {userGame && (
                  <button
                    type="button"
                    onClick={handleDeleteTracking}
                    className="p-1 px-2.5 text-[10px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition cursor-pointer rounded-lg"
                  >
                    Eliminar tracking
                  </button>
                )}
              </div>
            </div>

            {message && (
              <div className={`p-2.5 border text-xs rounded-xl ${message.includes('Error') ? 'bg-red-950/40 border-red-500/20 text-red-400' : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSaveTracking} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Fase de Progreso</label>
                <div className="relative" ref={progressMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProgressMenuOpen(prev => !prev)}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{selectedProgressOption.icon}</span>
                      <span className="text-left">
                        <span className="font-semibold text-slate-200 block">{selectedProgressOption.label}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{selectedProgressOption.helper}</span>
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition ${progressMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {progressMenuOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-[#07090e] border border-slate-800 rounded-xl p-1.5 shadow-2xl space-y-1">
                      {PROGRESS_PHASE_OPTIONS.map(option => {
                        const active = status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
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
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Mi rating (Puntuación)</label>
                <div className="flex bg-[#07090e] border border-slate-800 rounded-xl p-1.5 items-center justify-between">
                  <div className="flex gap-1 pl-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-0.5 hover:scale-110 transition cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-400 pr-2">
                    {rating > 0 ? `${rating}/5 estrellas` : 'Sin puntuar'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-600" /> Horas Jugadas
                </label>
                <input
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
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" /> Empezado el
                  </label>
                  <DatePicker value={startedAt} onChange={setStartedAt} placeholder="Selecciona inicio" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" /> Completado el
                  </label>
                  <DatePicker
                    value={completedAt}
                    onChange={setCompletedAt}
                    placeholder="Selecciona fin"
                    disabled={status !== 'COMPLETED' && status !== 'PLAYED'}
                  />
                </div>
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notas privadas de juego</label>
                <textarea
                  placeholder="Escribe anotaciones de tus progresos actuales, builds preferidas, jefes difíciles, o recordatorios..."
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
                Guardar Diario de Juego
              </button>
            </form>
          </div>

          {/* Public comments / reviews */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-350 font-display flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Reseñas de la Comunidad ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <div className="p-8 bg-[#0f121d]/50 border border-slate-850 rounded-xl text-center space-y-1 text-slate-500">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-700" />
                <p className="text-xs">No hay reseñas para este juego todavía. ¡Comparte tu opinión tú mismo!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(rev => (
                  <div
                    key={rev.id}
                    className="bg-[#0f121d] border border-slate-850 p-4 rounded-xl space-y-3 block"
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
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleLikeReview(rev.id)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition ${rev.likes.includes(currentUser.id) ? 'bg-blue-600/10 text-blue-400 border-blue-500/20' : 'bg-[#07090e] text-slate-500 border-slate-800 hover:text-slate-355'}`}
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
                      <p className="text-xs text-slate-450 leading-relaxed">{rev.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar details & Write review forms */}
        <div className="space-y-6">
          
          {/* Write custom review section */}
          <div className="bg-[#0d101a] border border-slate-850 p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-300 font-display text-sm">Reseñar este juego</h3>
            <form onSubmit={handleSubmitReview} className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Rating general (mismo del tracking)
                </label>
                <div className="flex gap-1.5 bg-[#07090e] p-2 border border-slate-800 rounded-xl justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-0.5 hover:scale-110 transition cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 text-center">
                  Este valor es único y se comparte entre tu diario y tu reseña.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Título corto de la reseña..."
                  value={reviewTitle}
                  required
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-indigo-500 rounded-xl p-2 px-3 text-xs text-white placeholder-slate-650 transition outline-none"
                />
              </div>

              <div>
                <textarea
                  placeholder="Escribe tu opinión crítica detallada del videojuego..."
                  value={reviewContent}
                  required
                  rows={4}
                  onChange={(e) => setReviewContent(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-slate-700 transition outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Send className="w-3.5 h-3.5" /> Publicar Reseña
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add to Custom List modal */}
      {listModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setListModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0f121d] border border-slate-850 rounded-2xl p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-300 font-display text-sm flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-blue-400" /> Añadir a lista personalizada
              </h4>
              <button
                type="button"
                onClick={() => setListModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {myLists.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Todavía no tienes listas personalizadas creadas.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-slate-500">
                  Agrega esta gema a una de tus listas personalizadas existentes:
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
                          ? 'Actualizando...'
                          : isInList
                            ? '✓ Añadido'
                            : 'Añadir +'}
                      </span>
                    </button>
                  );
                })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
