import React, { useState, useEffect } from 'react';
import { CustomList, Game, User } from '../types.ts';
import { ListPlus, Trash2, Library, CheckSquare, Plus, FileSpreadsheet } from 'lucide-react';

interface CustomListsProps {
  currentUser: User;
  onSelectGame: (gameId: number) => void;
  onSelectUser: (userId: string) => void;
  token: string;
}

export const CustomLists: React.FC<CustomListsProps> = ({ currentUser, onSelectGame, onSelectUser, token }) => {
  const [lists, setLists] = useState<(CustomList & { author: User, games: Game[] })[]>([]);
  const [selectedList, setSelectedList] = useState<(CustomList & { author: User, games: Game[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  // Mode forms
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [catalogGames, setCatalogGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lists?userId=${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }

      // Also prefetch catalog games for creation option
      const gamesRes = await fetch('/api/games');
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setCatalogGames(gamesData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newListName,
          description: newListDesc,
          gameIds: selectedGameIds
        })
      });

      if (res.ok) {
        setNewListName('');
        setNewListDesc('');
        setSelectedGameIds([]);
        setIsCreating(false);
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm('¿Seguro de que deseas eliminar esta lista personalizada? This action is irreversible.')) return;

    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setSelectedList(null);
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelectGame = (gameId: number) => {
    if (selectedGameIds.includes(gameId)) {
      setSelectedGameIds(selectedGameIds.filter(id => id !== gameId));
    } else {
      setSelectedGameIds([...selectedGameIds, gameId]);
    }
  };

  return (
    <div className="space-y-6 pb-20 selection:bg-blue-600 selection:text-white">
      {/* List creation modal form */}
      {isCreating ? (
        <div className="bg-[#0f121d] border border-slate-800 p-6 rounded-2xl space-y-5 animate-fade-in">
          <div>
            <h3 className="text-xl font-bold font-display text-white">Crear Nueva Lista Personalizada</h3>
            <p className="text-slate-400 text-xs">Agrupa y comparte tus aventuras, RPGs o sagas preferidas</p>
          </div>

          <form onSubmit={handleCreateList} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Nombre de la lista</label>
              <input
                type="text"
                required
                placeholder="ej. Mejores RPGs por Turnos, Joyas Ocultas, Indispensables de Switch..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 px-4 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Descripción pública o temática</label>
              <textarea
                placeholder="Describe el contexto, objetivos o por qué estos juegos son los indicados para esta lista corporativa..."
                value={newListDesc}
                rows={3}
                onChange={(e) => setNewListDesc(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white placeholder-slate-705 transition outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Selecciona juegos ({selectedGameIds.length})</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-2 bg-[#07090e] border border-slate-800 rounded-xl">
                {catalogGames.map(game => {
                  const active = selectedGameIds.includes(game.igdbId);
                  return (
                    <button
                      type="button"
                      key={game.igdbId}
                      onClick={() => toggleSelectGame(game.igdbId)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1.5 cursor-pointer ${active ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 font-bold' : 'bg-[#0f121d] border-slate-850 hover:border-slate-700 text-slate-400'}`}
                    >
                      <span className="truncate text-[10px]">{game.name}</span>
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${active ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-850'}`}>
                        {active && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 hover:bg-slate-850 text-slate-400 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Crear Lista
              </button>
            </div>
          </form>
        </div>
      ) : selectedList ? (
        /* Detailed list representation */
        <div className="space-y-6 animate-fade-in">
          <button
            onClick={() => setSelectedList(null)}
            className="text-xs text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1.5"
          >
            ← Volver a todas las listas
          </button>

          <div className="bg-[#0f121d] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start justify-between">
              <div className="space-y-2">
                <button
                  onClick={() => onSelectUser(selectedList.userId)}
                  className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-[#07090e] text-slate-400 hover:text-white rounded-full border border-slate-800 text-[10px]"
                >
                  creada por <span className="font-bold text-white hover:text-blue-400">@{selectedList.author?.username}</span>
                </button>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-white tracking-tight">
                  {selectedList.name}
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{selectedList.description || 'Sin descripción publicada.'}</p>
              </div>

              {selectedList.userId === currentUser.id && (
                <button
                  onClick={() => handleDeleteList(selectedList.id)}
                  className="bg-[#07090e] border border-slate-800 hover:bg-red-500/10 text-red-400 p-2 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-300 font-display flex items-center gap-1.5">
              <Library className="w-4 h-4 text-blue-500" />
              Catálogo de esta lista ({selectedList.games.length} juegos)
            </h3>

            {selectedList.games.length === 0 ? (
              <div className="p-8 bg-slate-900/30 border border-slate-800 rounded-xl text-center text-slate-500">
                <p className="text-xs">Usa "Detalles de juego" para agregar títulos a esta lista.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selectedList.games.map(game => (
                  <button
                    key={game.igdbId}
                    onClick={() => onSelectGame(game.igdbId)}
                    className="group bg-[#0f121d] border border-slate-850 p-2.5 rounded-xl transition text-left cursor-pointer"
                  >
                    <img
                      src={game.cover}
                      alt={game.name}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[3/4] object-cover rounded-md border border-slate-900 group-hover:scale-[1.03] transition"
                    />
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 mt-3 truncate">{game.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{game.genres.slice(0, 1).join(', ') || 'Videojuego'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standard Listing overview */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-display text-white tracking-tight">Listas Personalizadas</h2>
              <p className="text-slate-400 text-xs">Explora listados seleccionados o crea colecciones temáticas propias</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Crear Lista
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="h-28 bg-slate-850 rounded-2xl w-full"></div>
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="p-12 bg-[#0f121d] border border-slate-800 text-center rounded-2xl space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-slate-400 text-sm font-semibold">No hay listas creadas todavía</p>
              <p className="text-slate-500 text-xs">¡Sé el primero e inicia tu rincón personalizado temático!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lists.map(list => (
                <div
                  key={list.id}
                  className="bg-[#0f121d] border border-slate-850 hover:border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 transition block"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onSelectUser(list.userId)}
                        className="text-[10px] font-bold text-slate-500 hover:text-blue-400 leading-none cursor-pointer"
                      >
                        @{list.author?.username || 'usuario'}
                      </button>
                      <span className="text-[10px] text-slate-600 uppercase font-mono font-bold bg-[#07090e] border border-slate-800 px-2 py-0.5 rounded-full">
                        {list.games.length} juegos
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedList(list)}
                      className="text-left group cursor-pointer block"
                    >
                      <h3 className="font-bold text-white group-hover:text-blue-450 transition tracking-tight">
                        {list.name}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1.5 leading-relaxed line-clamp-2">{list.description || 'Sin descripción.'}</p>
                    </button>
                  </div>

                  {/* Horizontal visual cover strip */}
                  <div className="flex gap-1.5 overflow-hidden rounded-lg h-14 bg-[#07090e]/50 p-1 border border-slate-850">
                    {list.games.slice(0, 5).map(g => (
                      <img
                        key={g.igdbId}
                        src={g.cover}
                        alt={g.name}
                        referrerPolicy="no-referrer"
                        className="w-8.5 h-full object-cover rounded-sm border border-slate-900"
                      />
                    ))}
                    {list.games.length === 0 && (
                      <span className="text-[10px] text-slate-600 italic py-2 px-2">Lista vacía.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
