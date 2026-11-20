import { apiFetch } from '../api.ts';
import React, { useState, useEffect } from 'react';
import { User, Review, Game, CustomList } from '../types.ts';
import { Trophy, Swords, PenSquare, Users, Star, X, Search, UserCheck, UserPlus, UserX, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n.tsx';
import { Dialog } from './Dialog.tsx';
import { AvatarCropper } from './AvatarCropper.tsx';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';

const DEFAULT_AVATAR = '/default-avatar.svg';

interface UserProfileProps {
  userId: string;
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
  onAccountDeleted: () => void;
  token: string;
  onSelectGame: (gameId: number) => void;
  onSelectUser?: (userId: string) => void;
}

type PublicList = CustomList & {
games: Game[];
};

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  currentUser,
  onUpdateCurrentUser,
  onAccountDeleted,
  token,
  onSelectGame,
  onSelectUser,
}) => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<
    | (User & {
        followersCount: number;
        followingCount: number;
      })
    | null
  >(null);

  const [reviews, setReviews] = useState<(Review & { game: Game })[]>([]);
  const [lists, setLists] = useState<PublicList[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const [favoriteResults, setFavoriteResults] = useState<Game[]>([]);
  const [favoriteSearchLoading, setFavoriteSearchLoading] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  const [selectedList, setSelectedList] = useState<PublicList | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Social Connections Modal state
  const [socialModalTab, setSocialModalTab] = useState<'followers' | 'following' | null>(null);
  const [socialUsers, setSocialUsers] = useState<User[]>([]);
  const [myFollowingSet, setMyFollowingSet] = useState<Set<string>>(new Set());
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [socialSearch, setSocialSearch] = useState('');

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteGoogleCredential, setDeleteGoogleCredential] = useState('');
  const [accountAuthMethods, setAccountAuthMethods] = useState<{ hasPassword: boolean; hasGoogle: boolean } | null>(null);
  const [authMethodsLoading, setAuthMethodsLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!deleteOpen) return;
    let active = true;
    setAuthMethodsLoading(true);
    setAccountAuthMethods(null);
    apiFetch('/api/auth/methods', { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (!response.ok) throw new Error('No se pudieron consultar los métodos de acceso.');
        return response.json();
      })
      .then(methods => {
        if (active) setAccountAuthMethods(methods);
      })
      .catch(error => {
        if (active) setDeleteError(t(error instanceof Error ? error.message : 'No se pudieron consultar los métodos de acceso.'));
      })
      .finally(() => { if (active) setAuthMethodsLoading(false); });
    return () => { active = false; };
  }, [deleteOpen, t, token]);

const isOwnProfile = userId === currentUser.id;

const fetchProfileData = async () => {
setLoading(true);

try {
  // 1. Fetch user profile
  const userRes = await apiFetch(`/api/users/${userId}`);

  if (userRes.ok) {
    const userData = await userRes.json();

    setProfile(userData);
    setEditUsername(userData.username);
    setEditBio(userData.bio ?? '');
    setEditAvatar(userData.avatar ?? '');
  }

  const favoritesRes = await apiFetch(`/api/users/${userId}/favorites`);
  if (favoritesRes.ok) {
    const favorites: Game[] = await favoritesRes.json();
    setFavoriteGames(Array.isArray(favorites) ? favorites : []);
  }

  // 2. Fetch user's library and generate reviews
  const libRes = await apiFetch(`/api/users/${userId}/library`);

  if (libRes.ok) {
    const libraryGames: any[] = await libRes.json();

    const userReviews = libraryGames
      .filter((lib) => Number(lib.rating) > 0 || lib.notes)
      .map((lib) => ({
        id: `rev_${lib.gameId}`,
        userId,
        gameId: lib.gameId,
        rating: lib.rating,
        title: lib.notes ? t('Anotación de Diario') : t('Valoración'),
        content: lib.notes || t('Añadido con nota rápida.'),
        likes: [],
        createdAt: lib.updatedAt ?? new Date().toISOString(),
        game: lib.game,
      }))
      .filter((review) => review.game);

    setReviews(userReviews);
  }

  // 3. Fetch lists belonging to the visited profile
  const listsRes = await apiFetch(`/api/lists?userId=${userId}`);

  if (listsRes.ok) {
    const listsData = await listsRes.json();

    setLists(Array.isArray(listsData) ? listsData : []);
  }

  // 4. Check if following
  if (!isOwnProfile) {
    const followRes = await apiFetch(
      `/api/social/followers/${userId}`
    );

    if (followRes.ok) {
      const followers: User[] = await followRes.json();

      setIsFollowing(
        followers.some(
          (follower) => follower.id === currentUser.id
        )
      );
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
setSelectedList(null);
}, [userId, currentUser.id]);

useEffect(() => {
  if (!editingFavorites) return;
  const query = favoriteSearch.trim();
  if (query.length < 2) {
    setFavoriteResults([]);
    setFavoriteSearchLoading(false);
    return;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(async () => {
    setFavoriteSearchLoading(true);
    try {
      const params = new URLSearchParams({ q: query, limit: '30', sort: 'popularity' });
      const response = await apiFetch(`/api/games/search?${params}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo buscar en el catálogo.');
      setFavoriteResults(Array.isArray(data?.items) ? data.items : []);
      setFavoriteError('');
    } catch (error) {
      if (!controller.signal.aborted) setFavoriteError(error instanceof Error ? error.message : 'Error al buscar juegos.');
    } finally {
      if (!controller.signal.aborted) setFavoriteSearchLoading(false);
    }
  }, 300);
  return () => { window.clearTimeout(timeout); controller.abort(); };
}, [editingFavorites, favoriteSearch]);

const saveFavoriteGames = async (nextGames: Game[]) => {
  setFavoriteSaving(true);
  setFavoriteError('');
  try {
    const response = await apiFetch('/api/users/profile/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gameIds: nextGames.map(game => game.igdbId) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'No se pudieron guardar los favoritos.');
    setFavoriteGames(Array.isArray(data) ? data : nextGames);
  } catch (error) {
    setFavoriteError(error instanceof Error ? error.message : 'No se pudieron guardar los favoritos.');
  } finally {
    setFavoriteSaving(false);
  }
};

const addFavoriteGame = async (game: Game) => {
  if (favoriteGames.some(favorite => favorite.igdbId === game.igdbId) || favoriteGames.length >= 4 || favoriteSaving) return;
  await saveFavoriteGames([...favoriteGames, game]);
  setFavoriteSearch('');
  setFavoriteResults([]);
};

const removeFavoriteGame = (gameId: number) => {
  if (favoriteSaving) return;
  void saveFavoriteGames(favoriteGames.filter(game => game.igdbId !== gameId));
};

const handleFollowToggle = async () => {
try {
const res = await apiFetch(
`/api/social/follow/${userId}`,
{
method: 'POST',
headers: {
Authorization: `Bearer ${token}`,
},
}
);

  if (res.ok) {
    const data = await res.json();

    setIsFollowing(data.following);

    if (profile) {
      setProfile({
        ...profile,
        followersCount: data.following
          ? profile.followersCount + 1
          : profile.followersCount - 1,
      });
    }
  }
} catch (err) {
  console.error(err);
}

};

const openSocialModal = async (tab: 'followers' | 'following') => {
  setSocialModalTab(tab);
  setLoadingSocial(true);
  setSocialSearch('');

  try {
    const [usersRes, myFollowingRes] = await Promise.all([
      apiFetch(`/api/social/${tab}/${userId}`),
      apiFetch(`/api/social/following/${currentUser.id}`)
    ]);

    if (usersRes.ok) {
      const uData: User[] = await usersRes.json();
      setSocialUsers(Array.isArray(uData) ? uData : []);
    }

    if (myFollowingRes.ok) {
      const myF: User[] = await myFollowingRes.json();
      setMyFollowingSet(new Set(myF.map((u) => u.id)));
    }
  } catch (err) {
    console.error('Error cargando conexiones sociales:', err);
  } finally {
    setLoadingSocial(false);
  }
};

const handleToggleFollowInModal = async (targetUser: User) => {
  if (targetUser.id === currentUser.id) return;

  try {
    const res = await apiFetch(`/api/social/follow/${targetUser.id}`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    });

    if (res.ok) {
      const data = await res.json();
      const isNowFollowing = data.following;

      setMyFollowingSet((prev) => {
        const next = new Set(prev);
        if (isNowFollowing) {
          next.add(targetUser.id);
        } else {
          next.delete(targetUser.id);
        }
        return next;
      });

      if (profile) {
        if (isOwnProfile && socialModalTab === 'following') {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  followingCount: isNowFollowing
                    ? prev.followingCount + 1
                    : Math.max(0, prev.followingCount - 1)
                }
              : null
          );
        } else if (targetUser.id === userId) {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  followersCount: isNowFollowing
                    ? prev.followersCount + 1
                    : Math.max(0, prev.followersCount - 1)
                }
              : null
          );
          setIsFollowing(isNowFollowing);
        }
      }
    }
  } catch (err) {
    console.error('Error actualizando seguimiento en modal:', err);
  }
};

const filteredSocialUsers = socialUsers.filter(
  (u) =>
    u.username.toLowerCase().includes(socialSearch.toLowerCase()) ||
    (u.bio || '').toLowerCase().includes(socialSearch.toLowerCase())
);

const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
e.target.value = '';
if (!file) return;

if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
  setEditMessage(`Error: ${t('Formato de imagen no válido.')}`);
  return;
}

setEditMessage('');
setAvatarFile(file);
};

const handleUpdateProfile = async (
e: React.FormEvent
) => {
e.preventDefault();
setEditMessage('');

try {
  const res = await apiFetch(
    '/api/users/profile',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: editUsername,
        bio: editBio,
        avatar: editAvatar,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || 'Failed to update profile'
    );
  }

  onUpdateCurrentUser(data);

  setProfile((prev) =>
    prev
      ? {
          ...prev,
          ...data,
        }
      : prev
  );

  setIsEditing(false);
  setEditMessage(t('¡Perfil guardado!'));

  setTimeout(
    () => setEditMessage(''),
    3000
  );
} catch (err: any) {
  setEditMessage(`Error: ${t(err.message)}`);
}

};

const handleDeleteAccount = async (event: React.FormEvent) => {
  event.preventDefault();
  if (!deletePassword && !deleteGoogleCredential) {
    setDeleteError(t('Confirma tu identidad con tu contraseña o Google.'));
    return;
  }
  setDeleteError('');
  setDeleting(true);
  try {
    const response = await apiFetch('/api/auth/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: deletePassword || undefined, googleCredential: deleteGoogleCredential || undefined })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    }
    onAccountDeleted();
  } catch (error) {
    console.error('Account deletion failed:', error);
    setDeleteError(t(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta. Inténtalo de nuevo.'));
      setDeleteGoogleCredential('');
  } finally {
    setDeleting(false);
  }
};

if (loading) {
return ( <div className="space-y-6 pb-20 animate-pulse"> <div className="h-44 bg-slate-850 rounded-2xl w-full" />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-40 bg-slate-850 rounded-2xl" />
      <div className="h-40 bg-slate-850 rounded-2xl md:col-span-2" />
    </div>
  </div>
);

}

if (!profile) {
return ( <div className="text-center py-12 text-slate-500"> <p>{t('Usuario no encontrado en la comunidad.')}</p> </div>
);
}

return ( <div className="space-y-6 pb-20 selection:bg-accent/30 selection:text-white">

  {editingFavorites && (
    <Dialog label={t('Juegos favoritos')} onClose={() => { setEditingFavorites(false); setFavoriteError(''); }}>
      <section className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0f121d] p-4 text-left sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{t('Juegos favoritos')}</h2>
            <p className="mt-1 text-xs text-slate-400">{t('Elige hasta cuatro juegos para mostrar en tu perfil.')}</p>
          </div>
          <button type="button" onClick={() => { setEditingFavorites(false); setFavoriteError(''); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label={t('Cerrar')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <label htmlFor="favorite-game-search" className="sr-only">{t('Buscar juegos')}</label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input id="favorite-game-search" type="search" value={favoriteSearch} onChange={event => setFavoriteSearch(event.target.value)} placeholder={t('Busca un juego...')} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-10 text-sm text-white placeholder:text-slate-400 focus:border-accent" />
        </div>
        {favoriteError && <p role="alert" className="mt-3 text-sm text-red-300">{t(favoriteError)}</p>}
        {favoriteSaving && <p role="status" className="mt-3 text-xs text-slate-300">{t('Guardando...')}</p>}
        {favoriteSearchLoading && <p className="py-6 text-center text-xs text-slate-400">{t('Buscando juegos...')}</p>}
        {!favoriteSearchLoading && favoriteSearch.trim().length >= 2 && favoriteResults.length === 0 && !favoriteError && <p className="py-6 text-center text-xs text-slate-400">{t('No se encontraron juegos.')}</p>}
        {favoriteResults.length > 0 && (
          <div className="mt-4 grid max-h-[48vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {favoriteResults.map(game => {
              const alreadySelected = favoriteGames.some(favorite => favorite.igdbId === game.igdbId);
              const disabled = alreadySelected || favoriteGames.length >= 4 || favoriteSaving;
              return (
                <button key={game.igdbId} type="button" disabled={disabled} onClick={() => void addFavoriteGame(game)} className="group flex min-w-0 items-center gap-2 rounded-lg border border-slate-800 bg-[#0b0c0e] p-2 text-left transition hover:border-accent/40 disabled:cursor-default disabled:opacity-50">
                  <img src={game.cover} alt="" referrerPolicy="no-referrer" className="h-14 w-10 shrink-0 rounded object-cover" />
                  <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-slate-200 line-clamp-2">{game.name}</span>
                  {alreadySelected ? <Star aria-label={t('Seleccionado')} className="h-4 w-4 shrink-0 fill-accent text-accent" /> : <Plus aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-accent" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="mb-3 text-xs font-semibold text-slate-300">{t('Tus favoritos')} · {favoriteGames.length}/4</p>
          <div className="space-y-2">
            {favoriteGames.map(game => (
              <div key={game.igdbId} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0b0c0e] p-2">
                <img src={game.cover} alt="" referrerPolicy="no-referrer" className="h-12 w-9 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{game.name}</span>
                <button type="button" onClick={() => removeFavoriteGame(game.igdbId)} disabled={favoriteSaving} aria-label={`${t('Quitar')} ${game.name}`} className="rounded-md p-2 text-slate-400 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {favoriteGames.length === 0 && <p className="text-xs text-slate-400">{t('Todavía no has elegido juegos favoritos.')}</p>}
          </div>
        </div>
      </section>
    </Dialog>
  )}

  {/* Selected list modal */}
  {selectedList && (
    <Dialog label={selectedList.name} onClose={() => setSelectedList(null)}>
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-[#0f121d] p-5 md:p-6">

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              {t('Lista de')} @{profile.username}
            </p>

            <h2 className="mt-1 text-xl font-bold text-white">
              {selectedList.name}
            </h2>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {selectedList.description || t('Sin descripción.')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedList(null)}
            className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white"
            aria-label={t('Cerrar detalle de lista')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedList.games.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">
            {t('Esta lista todavía no contiene juegos.')}
          </p>
        ) : (
          <div className="mx-auto mt-6 grid w-full max-w-[16rem] grid-cols-1 gap-5 sm:max-w-none sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {selectedList.games.map((game) => (
              <button
                key={game.igdbId}
                type="button"
                onClick={() => onSelectGame(game.igdbId)}
                className="group text-left"
              >
                <img
                  src={game.cover}
                  alt={game.name}
                  referrerPolicy="no-referrer"
                  className="aspect-[3/4] w-full rounded-lg border border-slate-800 object-cover transition group-hover:scale-[1.02]"
                />

                <span className="mt-2 block truncate text-xs font-bold text-white group-hover:text-accent">
                  {game.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )}

  {avatarFile && (
    <AvatarCropper
      file={avatarFile}
      onCancel={() => setAvatarFile(null)}
      onConfirm={(dataUrl) => {
        setEditAvatar(dataUrl);
        setAvatarFile(null);
      }}
    />
  )}

  {/* Social Connections Modal */}
  {socialModalTab && (
    <Dialog label={`${t('Conexiones de')} @${profile.username}`} onClose={() => setSocialModalTab(null)}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-[#0f121d] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 md:p-5 border-b border-slate-850 flex items-center justify-between bg-[#0b0e17]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            <div>
              <h2 className="text-sm font-bold text-white leading-none">
                {t('Conexiones de')} @{profile.username}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                {socialModalTab === 'followers' ? t('Jugadores que le siguen') : t('Jugadores a los que sigue')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSocialModalTab(null)}
            aria-label={t('Cerrar')}
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-850 bg-[#0d101a]">
          <button
            type="button"
            aria-pressed={socialModalTab === 'followers'}
            onClick={() => openSocialModal('followers')}
            className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              socialModalTab === 'followers'
                ? 'text-accent border-accent bg-accent/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            {t('Seguidores')} ({profile.followersCount})
          </button>
          <button
            type="button"
            aria-pressed={socialModalTab === 'following'}
            onClick={() => openSocialModal('following')}
            className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              socialModalTab === 'following'
                ? 'text-accent border-accent bg-accent/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            {t('Siguiendo')} ({profile.followingCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-850 bg-[#0b0e17]/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              aria-label={t('Buscar por usuario o biografía...')}
              placeholder={t('Buscar por usuario o biografía...')}
              value={socialSearch}
              onChange={(e) => setSocialSearch(e.target.value)}
              className="w-full bg-[#07090e] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-accent/50 transition"
            />
          </div>
        </div>

        {/* List Container */}
        <div className="p-3 md:p-4 overflow-y-auto space-y-2 max-h-[55vh] min-h-[220px]">
          {loadingSocial ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p>{t('Cargando lista de jugadores...')}</p>
            </div>
          ) : filteredSocialUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <UserX className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
              <p className="text-xs font-medium text-slate-400">
                {socialSearch
                  ? t('No se encontraron jugadores para esa búsqueda.')
                  : socialModalTab === 'followers'
                  ? t('Aún no tiene seguidores.')
                  : t('Aún no sigue a ningún jugador.')}
              </p>
            </div>
          ) : (
            filteredSocialUsers.map((u) => {
              const isMe = u.id === currentUser.id;
              const isFollowedByMe = myFollowingSet.has(u.id);

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-850 bg-[#0a0c14] hover:border-slate-800 transition group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSocialModalTab(null);
                      onSelectUser?.(u.id);
                    }}
                    className="flex items-center gap-3 min-w-0 text-left cursor-pointer flex-1"
                  >
                    <img
                      src={u.avatar}
                      alt={u.username}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-800 bg-[#07090e] object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-accent transition truncate">
                        @{u.username}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate leading-snug">
                        {u.bio || t('¡Sin biografía todavía!')}
                      </p>
                    </div>
                  </button>

                  <div className="flex-shrink-0">
                    {isMe ? (
                      <span className="text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full">
                        {t('Tú')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleFollowInModal(u)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1 border ${
                          isFollowedByMe
                            ? 'bg-[#07090e] text-slate-300 border-slate-800 hover:border-red-500/30 hover:text-red-400'
                            : 'bg-accent text-on-accent border-accent hover:bg-accent-hover'
                        }`}
                      >
                        {isFollowedByMe ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{t('Siguiendo')}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{t('Seguir')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  )}

  {/* Profile main card */}
  <div className="bg-[#0f121d] border border-slate-850 p-6 rounded-2xl relative overflow-hidden">

    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

    <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-center justify-between text-center sm:text-left">

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <img
          src={profile.avatar}
          alt={profile.username}
          referrerPolicy="no-referrer"
          className="w-20 h-20 rounded-full border-2 border-accent/20 bg-[#07090e] object-cover shadow-lg"
        />

        <div className="space-y-1.5 max-w-sm">
          <h1 className="text-2xl font-bold text-white font-display tracking-tight leading-snug">
            @{profile.username}
          </h1>

          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {profile.bio || t('¡Sin biografía todavía!')}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center sm:items-end gap-3.5 flex-shrink-0">

        {/* Follow stats */}
        <div className="flex gap-4 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => openSocialModal('followers')}
            className="group text-center sm:text-right cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition border border-transparent hover:border-slate-800"
            title={t('Ver seguidores')}
          >
            <span className="text-white font-bold block text-sm group-hover:text-accent transition">
              {profile.followersCount}
            </span>
            <span className="group-hover:text-slate-200 transition">
              {profile.followersCount === 1 ? t('seguidor') : t('seguidores')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openSocialModal('following')}
            className="group text-center sm:text-right cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-slate-800/50 transition border border-transparent hover:border-slate-800"
            title={t('Ver usuarios seguidos')}
          >
            <span className="text-white font-bold block text-sm group-hover:text-accent transition">
              {profile.followingCount}
            </span>
            <span className="group-hover:text-slate-200 transition">{t('seguidos')}</span>
          </button>
        </div>

        {isOwnProfile ? (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 border border-slate-800 hover:border-accent/20 bg-[#07090e] hover:bg-slate-900 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
          >
            <PenSquare className="w-3.5 h-3.5" />
            {t('Editar Perfil')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFollowToggle}
            className={`px-5 py-2 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 border ${
              isFollowing
                ? 'bg-[#07090e] text-slate-300 border-slate-800'
                : 'bg-accent text-on-accent border-accent'
            }`}
          >
            <Users className="w-4 h-4" />
            {isFollowing
              ? `${t('Siguiendo')} ✓`
              : t('Seguir jugador')}
          </button>
        )}
      </div>
    </div>

    {/* Profile editor */}
    {isEditing && (
      <form
        onSubmit={handleUpdateProfile}
        className="mt-6 pt-6 border-t border-slate-850 space-y-4 max-w-md animate-fade-in text-left"
      >
        <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500">
          {t('Formulario de Edición')}
        </h3>

        {editMessage && (
          <p className="text-[11px] text-accent font-bold">
            {editMessage}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="profile-username" className="block text-xs font-semibold text-slate-400">
            {t('Nombre de usuario')}
          </label>

          <input
            id="profile-username"
            type="text"
            required
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-white outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-400">
            {t('Biografía')}
          </label>

          <textarea
            id="profile-bio"
            value={editBio}
            rows={2}
            onChange={(e) => setEditBio(e.target.value)}
            className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-2 text-xs text-white outline-none resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-avatar" className="block text-xs font-semibold text-slate-400">
            {t('Foto de perfil')}
          </label>

          <div className="flex items-center gap-3">
            <img
              src={editAvatar || DEFAULT_AVATAR}
              alt=""
              className="h-14 w-14 rounded-full border border-slate-800 bg-[#07090e] object-cover"
            />
            <div className="flex flex-wrap gap-2">
              <input
                id="profile-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFile}
                className="sr-only"
              />
              <label
                htmlFor="profile-avatar"
                className="cursor-pointer rounded-lg bg-slate-850 px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:text-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
              >
                {t('Elegir imagen')}
              </label>
              {editAvatar && editAvatar !== DEFAULT_AVATAR && (
                <button
                  type="button"
                  onClick={() => setEditAvatar(DEFAULT_AVATAR)}
                  className="rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white"
                >
                  {t('Quitar')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3.5 py-1.5 bg-slate-850 text-slate-400 font-semibold rounded-lg text-[11px]"
          >
            {t('Cancelar')}
          </button>

          <button
            type="submit"
            className="px-4 py-1.5 bg-accent text-on-accent font-semibold rounded-lg text-[11px]"
          >
            {t('Guardar')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setDeletePassword(''); setDeleteError(''); setDeleteOpen(true); }}
          className="min-h-12 rounded-lg text-sm font-semibold text-red-300 underline underline-offset-4 hover:text-red-200"
        >
          {t('Eliminar mi cuenta')}
        </button>
      </form>
    )}
  </div>

  {deleteOpen && (
    <Dialog label={t('Eliminar mi cuenta')} onClose={() => { if (!deleting) setDeleteOpen(false); }}>
      <form onSubmit={handleDeleteAccount} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-[#0f121d] p-6 text-left">
        <h2 className="text-xl font-bold text-white">{t('Eliminar mi cuenta')}</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          {t('Esta acción es irreversible. Se eliminarán tu cuenta, biblioteca, reseñas, listas y relaciones. Los registros de seguridad se conservarán desvinculados de tu cuenta.')}
        </p>
        {authMethodsLoading && <p role="status" className="text-sm text-slate-400">{t('Comprobando métodos de acceso...')}</p>}
        {!authMethodsLoading && accountAuthMethods?.hasPassword && (
          <div className="space-y-2">
            <label htmlFor="delete-account-password" className="block text-sm font-semibold text-slate-300">{t('Confirma tu contraseña')}</label>
            <input id="delete-account-password" type="password" autoComplete="current-password" required={!deleteGoogleCredential} value={deletePassword}
              onChange={event => setDeletePassword(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 text-white" />
          </div>
        )}
        {!authMethodsLoading && accountAuthMethods?.hasGoogle && (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">{t('También puedes verificar con Google para confirmar la eliminación.')}</p>
            <GoogleSignInButton text="signin_with" disabled={deleting || Boolean(deleteGoogleCredential)} onCredential={credential => { setDeleteGoogleCredential(credential); setDeleteError(''); }} />
            {deleteGoogleCredential && <p role="status" className="text-sm text-emerald-300">{t('Google verificado. Pulsa Eliminar mi cuenta para continuar.')}</p>}
          </div>
        )}
        {deleteError && <p role="alert" className="text-sm text-red-300">{deleteError}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="min-h-12 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-50">{t('Cancelar')}</button>
          <button type="submit" disabled={deleting || authMethodsLoading || !accountAuthMethods} className="min-h-12 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">{t(deleting ? 'Eliminando...' : 'Eliminar mi cuenta')}</button>
        </div>
      </form>
    </Dialog>
  )}

  {/* Favorite games */}
  <section aria-labelledby="profile-favorites-heading" className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 id="profile-favorites-heading" className="text-xl font-bold tracking-tight text-white">{t('Favoritos')}</h2>
        <p className="mt-1 text-xs text-slate-400">{t('Los juegos que mejor te representan.')}</p>
      </div>
      {isOwnProfile && <button type="button" onClick={() => { setFavoriteSearch(''); setFavoriteError(''); setEditingFavorites(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-[#111317] px-3.5 text-xs font-semibold text-slate-200 transition hover:border-accent/40 hover:text-white"><PenSquare aria-hidden="true" className="h-3.5 w-3.5" />{t('Editar')}</button>}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {Array.from({ length: 4 }, (_, index) => {
        const game = favoriteGames[index];
        return game ? (
          <button key={game.igdbId} type="button" onClick={() => onSelectGame(game.igdbId)} className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-slate-800 bg-[#111317] text-left focus-visible:outline-offset-4">
            <img src={game.cover} alt={game.name} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-3 pb-3 pt-12 text-xs font-bold text-white">{game.name}</span>
          </button>
        ) : (
          <button key={`empty-${index}`} type="button" disabled={!isOwnProfile} onClick={() => { setFavoriteSearch(''); setFavoriteError(''); setEditingFavorites(true); }} className={`flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#111317]/50 text-slate-500 transition ${isOwnProfile ? 'hover:border-accent/50 hover:bg-accent/[0.03] hover:text-accent' : 'cursor-default'}`} aria-label={isOwnProfile ? t('Añadir juego favorito') : t('Espacio para juego favorito')}>
            {isOwnProfile && <Plus aria-hidden="true" className="h-6 w-6" />}
            <span className="text-xs">{isOwnProfile ? t('Añadir favorito') : t('Sin seleccionar')}</span>
          </button>
        );
      })}
    </div>
  </section>

  {/* Grid panels */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

    {/* User reviews */}
    <div className="lg:col-span-2 space-y-4">

      <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
        <Trophy className="w-4.5 h-4.5 text-yellow-500" />
        {t('Valoraciones y Diario')} ({reviews.length})
      </h3>

      {reviews.length === 0 ? (
        <div className="bg-slate-900/30 p-8 rounded-xl border border-slate-850 text-center text-slate-500 text-xs">
          {t('Este gamer no ha realizado anotaciones o ratings todavía.')}
        </div>
      ) : (
        <div className="space-y-3">

          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#0f121d] border border-slate-850 p-4 rounded-xl flex gap-3 hover:border-slate-800 transition"
            >

              <button
                type="button"
                onClick={() => onSelectGame(rev.gameId)}
                className="flex-shrink-0 cursor-pointer"
              >
                <img
                  src={rev.game.cover}
                  alt={rev.game.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-14 rounded object-cover shadow border border-slate-900"
                />
              </button>

              <div className="flex-1 min-w-0">

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectGame(rev.gameId)}
                    className="text-xs font-bold text-white hover:text-accent transition truncate"
                  >
                    {rev.game.name}
                  </button>

                  <div className="flex gap-0.5 text-yellow-400">
                    {(rev.rating ?? 0) > 0 && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              (rev.rating ?? 0) >= star
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-3 italic">
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

      <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
        <Swords className="w-4.5 h-4.5 text-indigo-400" />
        {t('Listas Públicas')} ({lists.length})
      </h3>

      {lists.length === 0 ? (
        <div className="bg-[#0f121d] border border-slate-850 p-6 rounded-xl text-center text-slate-500 text-xs">
          {t('No hay colecciones publicadas.')}
        </div>
      ) : (
        <div className="space-y-2.5">

          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelectedList(list)}
              className="w-full bg-[#0f121d] border border-slate-850/80 hover:border-indigo-500/40 p-3.5 rounded-xl space-y-3 text-left transition cursor-pointer"
            >
              <h4 className="text-xs font-bold text-white truncate">
                {list.name}
              </h4>

              <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                {list.description || t('Sin descripción.')}
              </p>

              <div className="flex h-14 gap-1.5 overflow-hidden rounded-lg border border-slate-850 bg-[#07090e]/50 p-1">
                {list.games.slice(0, 5).map((game) => (
                  <img
                    key={game.igdbId}
                    src={game.cover}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-8.5 rounded-sm border border-slate-900 object-cover"
                  />
                ))}

                {list.games.length === 0 && (
                  <span className="p-2 text-[10px] italic text-slate-600">
                    {t('Lista vacía.')}
                  </span>
                )}
              </div>
            </button>
          ))}

        </div>
      )}
    </div>
  </div>
</div>
);
};
