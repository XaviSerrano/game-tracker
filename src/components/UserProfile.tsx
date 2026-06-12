import React, { useState, useEffect } from 'react';
import { User, Review, Game, CustomList } from '../types.ts';
import { Heart, Trophy, Clock, Swords, PenSquare, Eye, Check, Users, Star } from 'lucide-react';

interface UserProfileProps {
  userId: string;
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  token: string;
  onSelectGame: (gameId: number) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, currentUser, onUpdateCurrentUser, token, onSelectGame }) => {
  const [profile, setProfile] = useState<(User & { followersCount: number, followingCount: number }) | null>(null);
  const [reviews, setReviews] = useState<(Review & { game: Game })[]>([]);
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const isOwnProfile = userId === currentUser.id;

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user profile
      const userRes = await fetch(`/api/users/${userId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setProfile(userData);
        setEditUsername(userData.username);
        setEditBio(userData.bio);
        setEditAvatar(userData.avatar);
      }

      // 2. Fetch user's reviews
      const reviewsRes = await fetch(`/api/reviews/user/${userId}`); // Wait, our server lists reviews map natively, let's load all reviews & filter locally to stay robust!
      const allReviewsRes = await fetch('/api/games'); // we can also just fetch catalog games to join
      const gamesCat: Game[] = await allReviewsRes.json();

      const libRes = await fetch(`/api/users/${userId}/library`);
      const libraryGames: (any)[] = await libRes.json();

      // Fetch reviews with game details joined
      const userReviews = libraryGames
        .filter(lib => lib.rating > 0)
        .map(lib => ({
          id: `rev_${lib.gameId}`,
          userId: userId,
          gameId: lib.gameId,
          title: lib.notes ? "Anotación de Diario" : "Valoración",
          content: lib.notes || "Añadido con nota rápida.",
          likes: [],
          game: lib.game
        }));
      setReviews(userReviews);

      // 3. Fetch user's lists
      const listsRes = await fetch(`/api/lists?userId=${userId}`);
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        setLists(listsData);
      }

      // 4. Check if following
      if (!isOwnProfile) {
        const followRes = await fetch(`/api/social/followers/${userId}`);
        if (followRes.ok) {
          const followers: User[] = await followRes.json();
          setIsFollowing(followers.some(f => f.id === currentUser.id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId, currentUser]);

  const handleFollowToggle = async () => {
    try {
      const res = await fetch(`/api/social/follow/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        // Refresh followers count
        if (profile) {
          setProfile({
            ...profile,
            followersCount: data.following ? profile.followersCount + 1 : profile.followersCount - 1
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditMessage('');
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editUsername,
          bio: editBio,
          avatar: editAvatar
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      onUpdateCurrentUser(data);
      setProfile({ ...profile, ...data });
      setIsEditing(false);
      setEditMessage('¡Perfil guardado!');
      setTimeout(() => setEditMessage(''), 3000);
    } catch (err: any) {
      setEditMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-44 bg-slate-850 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 bg-slate-850 rounded-2xl"></div>
          <div className="h-40 bg-slate-850 rounded-2xl md:col-span-2"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Usuario no encontrado en la comunidad.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Profile main card */}
      <div className="bg-[#0f121d] border border-slate-850 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-center justify-between text-center sm:text-left">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <img
              src={profile.avatar}
              alt={profile.username}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full border-2 border-blue-500/20 bg-[#07090e] p-1 shadow-lg"
            />
            <div className="space-y-1.5 max-w-sm">
              <h1 className="text-2xl font-bold text-white font-display tracking-tight leading-snug">
                @{profile.username}
              </h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{profile.bio || '¡Sin biografía todavía!'}</p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-3.5 flex-shrink-0">
            {/* Follow stats */}
            <div className="flex gap-4 text-xs font-semibold text-slate-400">
              <div className="text-center sm:text-right">
                <span className="text-white font-bold block text-sm">{profile.followersCount}</span> seguidores
              </div>
              <div className="text-center sm:text-right">
                <span className="text-white font-bold block text-sm">{profile.followingCount}</span> seguidos
              </div>
            </div>

            {isOwnProfile ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 border border-slate-800 hover:border-blue-500/20 bg-[#07090e] hover:bg-slate-900 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
              >
                <PenSquare className="w-3.5 h-3.5" /> Editar Perfil
              </button>
            ) : (
              <button
                onClick={handleFollowToggle}
                className={`px-5 py-2 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 border ${isFollowing ? 'bg-[#07090e] text-slate-300 border-slate-800' : 'bg-blue-600 text-white border-blue-500'}`}
              >
                <Users className="w-4 h-4" />
                {isFollowing ? 'Siguiendo ✓' : 'Seguir jugador'}
              </button>
            )}
          </div>
        </div>

        {/* Profile editor */}
        {isEditing && (
          <form onSubmit={handleUpdateProfile} className="mt-6 pt-6 border-t border-slate-850 space-y-4 max-w-md animate-fade-in text-left">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500">Formulario de Edición</h3>
            {editMessage && <p className="text-[11px] text-blue-400 font-bold">{editMessage}</p>}
            
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Nombre de usuario</label>
              <input
                type="text"
                required
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Biografía</label>
              <textarea
                value={editBio}
                rows={2}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-white outline-none resize-none"
              ></textarea>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-500">Pixel Avatar seed</label>
              <input
                type="text"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="Ingresa url de tu foto..."
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 bg-slate-850 text-slate-400 font-semibold rounded-lg text-[11px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg text-[11px]"
              >
                Guardar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User reviews listed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
            <Trophy className="w-4.5 h-4.5 text-yellow-500" />
            Valoraciones y Diario ({reviews.length})
          </h3>

          {reviews.length === 0 ? (
            <div className="bg-slate-900/30 p-8 rounded-xl border border-slate-850 text-center text-slate-500 text-xs">
              Este gamer no ha realizado anotaciones o ratings todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(rev => (
                <div
                  key={rev.id}
                  className="bg-[#0f121d] border border-slate-850 p-4 rounded-xl flex gap-3 block hover:border-slate-800 transition"
                >
                  <button onClick={() => onSelectGame(rev.gameId)} className="flex-shrink-0 cursor-pointer">
                    <img
                      src={rev.game.cover}
                      alt={rev.game.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-14 rounded object-cover shadow border border-slate-900"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <button onClick={() => onSelectGame(rev.gameId)} className="text-xs font-bold text-white hover:text-blue-400 transition truncate">
                        {rev.game.name}
                      </button>
                      <div className="flex gap-0.5 text-yellow-400">
                        {rev.id.includes('rev_') ? (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-450 leading-relaxed mt-1 line-clamp-3 italic">
                      "{rev.content}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User public lists */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-350 font-display flex items-center gap-1.5">
            <Swords className="w-4.5 h-4.5 text-indigo-400" /> Listas Públicas ({lists.length})
          </h3>

          {lists.length === 0 ? (
            <div className="bg-[#0f121d] border border-slate-850 p-6 rounded-xl text-center text-slate-500 text-xs">
              No hay colecciones publicadas.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lists.map(list => (
                <div
                  key={list.id}
                  className="bg-[#0f121d] border border-slate-850/80 p-3.5 rounded-xl space-y-1 block"
                >
                  <h4 className="text-xs font-bold text-white truncate">{list.name}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{list.description || 'Sin descripción.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
