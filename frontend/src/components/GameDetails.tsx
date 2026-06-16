import React, { useState, useEffect } from 'react';
import { Game, UserGame, Review, CustomList, User } from '../types.ts';
import { Star, Clock, Calendar, CheckSquare, ListPlus, Send, MessageSquare, ThumbsUp, Trash2, ArrowLeft } from 'lucide-react';

interface GameDetailsProps {
  gameId: number;
  currentUser: User;
  token: string;
  onBack: () => void;
  onSelectUser: (userId: string) => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ gameId, currentUser, token, onBack, onSelectUser }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [userGame, setUserGame] = useState<UserGame | null>(null);
  const [reviews, setReviews] = useState<(Review & { author: User })[]>([]);
  const [myLists, setMyLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for library tracking
  const [status, setStatus] = useState<'WISHLIST' | 'PLAYING' | 'PLAYED' | 'COMPLETED' | 'ABANDONED'>('WISHLIST');
  const [rating, setRating] = useState<number>(0);
  const [hoursPlayed, setHoursPlayed] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [completedAt, setCompletedAt] = useState<string>('');

  // Form states for new review
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const [message, setMessage] = useState('');

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
      const listsRes = await fetch(`/api/lists?userId=${currentUser.id}`);
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

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
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
          status,
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
      setMessage('¡Biblioteca actualizada con éxito!');
      // Refresh reviews if library star rating has changed
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
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
          rating: reviewRating
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

  const handleAddToList = async (listId: string) => {
    try {
      // Fetch list details, add gameId to array, resave
      const listRes = await fetch(`/api/lists/${listId}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const activeIds = listData.games.map((g: Game) => g.igdbId);
        if (activeIds.includes(gameId)) {
          alert('¡Este juego ya se encuentra en la lista!');
          return;
        }

        const newGameIds = [...activeIds, gameId];
        const updateRes = await fetch('/api/lists', {
          method: 'POST',
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

        if (updateRes.ok) {
          alert('¡Videojuego añadido a la lista con éxito!');
        }
      }
    } catch (err) {
      console.error(err);
    }
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
                <span>•</span>
                <span className="truncate">{game.platforms.slice(0, 3).join(', ')}</span>
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                Tú diario de Juego (Track)
              </h3>
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

            {message && (
              <div className={`p-2.5 border text-xs rounded-xl ${message.includes('Error') ? 'bg-red-950/40 border-red-500/20 text-red-400' : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSaveTracking} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Fase de Progreso</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition"
                >
                  <option value="WISHLIST">Wishlist (Lista de deseos)</option>
                  <option value="PLAYING">Jugando actualmente 🎮</option>
                  <option value="PLAYED">Jugado antes</option>
                  <option value="COMPLETED">Completado 🏆</option>
                  <option value="ABANDONED">Abandonado o pausado ❌</option>
                </select>
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
                  <input
                    type="date"
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" /> Completado el
                  </label>
                  <input
                    type="date"
                    value={completedAt}
                    disabled={status !== 'COMPLETED'}
                    onChange={(e) => setCompletedAt(e.target.value)}
                    className="w-full bg-[#07090e] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition disabled:opacity-40"
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
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Rating general</label>
                <div className="flex gap-1.5 bg-[#07090e] p-2 border border-slate-800 rounded-xl justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-0.5 hover:scale-110 transition cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${reviewRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
                    </button>
                  ))}
                </div>
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

          {/* Add to Custom List form */}
          {myLists.length > 0 && (
            <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-300 font-display text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-blue-400" /> Añadir a mi lista de deseos
              </h4>
              <p className="text-[11px] text-slate-500">Agrega esta gema a una de tus listas personalizadas existentes:</p>
              <div className="space-y-1.5 pt-1.5">
                {myLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id)}
                    className="w-full text-left p-2.5 bg-[#07090e] hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/20 text-xs text-slate-300 hover:text-blue-400 rounded-xl font-medium transition cursor-pointer flex items-center justify-between"
                  >
                    <span>{list.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">Añadir +</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
