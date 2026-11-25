import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, LoaderCircle, MessageSquareText, Plus, Search, Send, ThumbsUp, X } from 'lucide-react';
import { apiFetch } from '../api.ts';
import type { RoadmapSuggestion, RoadmapSuggestionStatus, User } from '../types.ts';
import { useLanguage } from '../i18n.tsx';

interface RoadmapProps {
  currentUser: User | null;
  token: string | null;
  onRequireAuth: () => void;
}

const statuses: RoadmapSuggestionStatus[] = ['IN_PROGRESS', 'PLANNED', 'CONSIDERING', 'COMPLETED'];
const statusLabels: Record<RoadmapSuggestionStatus, string> = {
  COMPLETED: 'Completado',
  CONSIDERING: 'En consideración',
  PLANNED: 'Planeado',
  IN_PROGRESS: 'En progreso'
};
const statusStyles: Record<RoadmapSuggestionStatus, { dot: string; badge: string; selected: string }> = {
  COMPLETED: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', selected: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  CONSIDERING: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900', selected: 'border-amber-300 bg-amber-50 text-amber-950' },
  PLANNED: { dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-900', selected: 'border-indigo-300 bg-indigo-50 text-indigo-950' },
  IN_PROGRESS: { dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-900', selected: 'border-sky-300 bg-sky-50 text-sky-950' }
};

export function Roadmap({ currentUser, token, onRequireAuth }: RoadmapProps) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<RoadmapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<RoadmapSuggestionStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyVoteId, setBusyVoteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<RoadmapSuggestionStatus>('CONSIDERING');
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const isModerator = ['xavi', 'gametracker'].includes(currentUser?.username.trim().toLowerCase() ?? '');
  const authHeaders = token && token !== 'cookie-session' ? { Authorization: `Bearer ${token}` } : {};

  const loadSuggestions = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await apiFetch('/api/roadmap', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load roadmap suggestions.');
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid roadmap response.');
      setSuggestions(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuggestions();
  }, [currentUser?.id]);

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return suggestions.filter(suggestion => {
      const matchesStatus = activeStatus === 'ALL' || suggestion.status === activeStatus;
      const matchesQuery = !query || `${suggestion.title} ${suggestion.description} ${suggestion.response}`.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [activeStatus, searchQuery, suggestions]);

  const openSuggestionForm = () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setErrorMessage('');
    setFormOpen(value => !value);
  };

  const handleCreateSuggestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    setErrorMessage('');
    try {
      const response = await apiFetch('/api/roadmap', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ title, description })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo enviar la sugerencia.');
      setSuggestions(previous => [data, ...previous]);
      setTitle('');
      setDescription('');
      setFormOpen(false);
      setActiveStatus('CONSIDERING');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('No se pudo enviar la sugerencia.'));
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (suggestion: RoadmapSuggestion) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (busyVoteId) return;
    setBusyVoteId(suggestion.id);
    setErrorMessage('');
    try {
      const response = await apiFetch(`/api/roadmap/${suggestion.id}/vote`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders
      });
      const data = await response.json();
      if (!response.ok || !data.suggestion) throw new Error(data.error || 'No se pudo guardar el voto.');
      setSuggestions(previous => previous.map(item => item.id === suggestion.id ? data.suggestion : item));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('No se pudo guardar el voto.'));
    } finally {
      setBusyVoteId(null);
    }
  };

  const beginModeration = (suggestion: RoadmapSuggestion) => {
    setEditingId(suggestion.id);
    setResponseDraft(suggestion.response);
    setStatusDraft(suggestion.status);
    setErrorMessage('');
  };

  const handleModerate = async (event: FormEvent<HTMLFormElement>, suggestionId: string) => {
    event.preventDefault();
    setModeratingId(suggestionId);
    setErrorMessage('');
    try {
      const response = await apiFetch(`/api/roadmap/${suggestionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ response: responseDraft, status: statusDraft })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la sugerencia.');
      setSuggestions(previous => previous.map(item => item.id === suggestionId ? data : item));
      setEditingId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('No se pudo actualizar la sugerencia.'));
    } finally {
      setModeratingId(null);
    }
  };

  return (
    <section className="-mx-3 min-h-[70vh] rounded-2xl bg-[#f1f0ec] px-3 py-8 text-[#18212b] sm:px-6 sm:py-12 md:-mx-5 md:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-7 flex flex-col justify-between gap-5 sm:mb-9 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#17212c] sm:text-4xl">Roadmap</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
      {t('Vota las ideas que te gustaría ver y comparte las tuyas con la comunidad.')}
            </p>
          </div>
          <button type="button" onClick={openSuggestionForm} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[#5f55d9] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#5147cb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5f55d9] sm:self-auto">
            <Plus className="size-4" aria-hidden="true" />
            {t('Proponer una sugerencia')}
          </button>
        </header>

        <div className="overflow-hidden rounded-xl border border-[#dededb] bg-white shadow-[0_12px_36px_-28px_rgba(20,25,40,0.35)]">
          <div className="flex flex-col gap-3 border-b border-[#e8e7e4] bg-[#fafaf9] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent px-2 text-slate-500 focus-within:border-[#c9c5f7] focus-within:bg-white">
              <Search className="size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t('Buscar en el roadmap')}</span>
              <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={t('Buscar')} className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500" />
            </label>
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0" aria-label={t('Filtrar sugerencias por estado')}>
              <button type="button" aria-pressed={activeStatus === 'ALL'} onClick={() => setActiveStatus('ALL')} className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${activeStatus === 'ALL' ? 'bg-[#e9e7ff] text-[#4139aa]' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t('Todas')} <span className="ml-1 tabular-nums">{suggestions.length}</span>
              </button>
              {statuses.map(status => (
                <button key={status} type="button" aria-pressed={activeStatus === status} onClick={() => setActiveStatus(status)} className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${activeStatus === status ? statusStyles[status].selected : 'text-slate-600 hover:bg-slate-100'}`}>
                  {t(statusLabels[status])}
                </button>
              ))}
            </div>
          </div>

          {formOpen && (
            <form onSubmit={event => void handleCreateSuggestion(event)} className="border-b border-[#e8e7e4] bg-[#fcfbff] p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{t('Proponer una sugerencia')}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{t('Las nuevas sugerencias empiezan en Considering.')}</p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} aria-label={t('Cerrar')} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#5f55d9]">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="roadmap-title">{t('Título de la sugerencia')}</label>
              <input id="roadmap-title" required minLength={5} maxLength={120} value={title} onChange={event => setTitle(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#7169de] focus:ring-2 focus:ring-[#7169de]/15" />
              <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor="roadmap-description">{t('Descripción (opcional)')}</label>
              <textarea id="roadmap-description" maxLength={600} rows={3} value={description} onChange={event => setDescription(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-5 text-slate-900 outline-none focus:border-[#7169de] focus:ring-2 focus:ring-[#7169de]/15" />
              <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">{t('El equipo de GameTracker revisará las sugerencias.')}</span>
                <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#5f55d9] px-4 text-sm font-bold text-white transition hover:bg-[#5147cb] disabled:cursor-wait disabled:opacity-60">
                  {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  {saving ? t('Enviando...') : t('Enviar sugerencia')}
                </button>
              </div>
            </form>
          )}

          {errorMessage && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-5">{errorMessage}</p>}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-600"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{t('Cargando sugerencias...')}</div>
          ) : loadError ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-slate-800">{t('No se pudieron cargar las sugerencias.')}</p>
              <button type="button" onClick={() => void loadSuggestions()} className="mt-3 rounded-md px-3 py-2 text-sm font-bold text-[#5147cb] hover:bg-[#f2f0ff] focus-visible:outline-2 focus-visible:outline-[#5f55d9]">{t('Reintentar')}</button>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-semibold text-slate-800">{t(searchQuery ? 'No hay sugerencias que coincidan con la búsqueda.' : 'Todavía no hay sugerencias en este estado.')}</p>
              {!searchQuery && activeStatus !== 'ALL' && <button type="button" onClick={() => setActiveStatus('ALL')} className="mt-2 text-sm font-semibold text-[#5147cb] hover:underline">{t('Ver todas las sugerencias')}</button>}
            </div>
          ) : (
            <div className="divide-y divide-[#eeedeb]">
              {statuses.filter(status => filteredSuggestions.some(suggestion => suggestion.status === status)).map(status => (
                <section key={status} aria-labelledby={`roadmap-${status}`} className="px-4 py-5 sm:px-6 sm:py-6">
                  <div className="mb-2 flex items-center gap-3">
                    <span aria-hidden="true" className={`size-2.5 rounded-full ring-4 ring-white ${statusStyles[status].dot}`} />
                    <h2 id={`roadmap-${status}`} className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{t(statusLabels[status])}</h2>
                    <span className="text-xs tabular-nums text-slate-500">{filteredSuggestions.filter(suggestion => suggestion.status === status).length}</span>
                  </div>
                  <div className="relative ml-1 border-l border-dashed border-slate-300 pl-5 sm:ml-1.5 sm:pl-7">
                    {filteredSuggestions.filter(suggestion => suggestion.status === status).map(suggestion => (
                      <article key={suggestion.id} className="relative py-4 first:pt-3 last:pb-2">
                        <span aria-hidden="true" className={`absolute -left-[1.48rem] top-[1.45rem] size-2 rounded-full ${statusStyles[status].dot} sm:-left-[1.98rem]`} />
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold leading-6 text-slate-900 sm:text-[0.9375rem]">{t(suggestion.title)}</h3>
                              {suggestion.isCommunitySuggestion && <span className="rounded-md bg-[#f1f0ec] px-2 py-0.5 text-[10px] font-semibold text-slate-600">{t('Idea de la comunidad')}</span>}
                            </div>
                            {suggestion.description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t(suggestion.description)}</p>}
                            {suggestion.response && (
                              <div className="mt-3 rounded-lg bg-[#f6f5fc] px-3 py-2.5 text-sm leading-5 text-slate-700">
                                <p className="flex items-center gap-1.5 text-xs font-bold text-[#5147cb]"><MessageSquareText className="size-3.5" aria-hidden="true" />{t('Respuesta del equipo')}{suggestion.respondedBy ? ` · ${suggestion.respondedBy}` : ''}</p>
                                <p className="mt-1.5">{suggestion.response}</p>
                              </div>
                            )}
                            {isModerator && editingId === suggestion.id && (
                              <form onSubmit={event => void handleModerate(event, suggestion.id)} className="mt-3 space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                                <label className="block text-xs font-semibold text-slate-700" htmlFor={`roadmap-status-${suggestion.id}`}>{t('Estado')}</label>
                                <select id={`roadmap-status-${suggestion.id}`} value={statusDraft} onChange={event => setStatusDraft(event.target.value as RoadmapSuggestionStatus)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none">
                                  {statuses.map(option => <option key={option} value={option}>{t(statusLabels[option])}</option>)}
                                </select>
                                <label className="block text-xs font-semibold text-slate-700" htmlFor={`roadmap-response-${suggestion.id}`}>{t('Tu respuesta')}</label>
                                <textarea id={`roadmap-response-${suggestion.id}`} maxLength={2000} rows={3} value={responseDraft} onChange={event => setResponseDraft(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none" />
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => setEditingId(null)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-white">{t('Cancelar')}</button>
                                  <button type="submit" disabled={moderatingId === suggestion.id} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#5f55d9] px-3 text-xs font-bold text-white disabled:opacity-60">
                                    {moderatingId === suggestion.id ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}{t('Guardar cambios')}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                          <button type="button" aria-pressed={suggestion.hasVoted} aria-label={`${suggestion.hasVoted ? t('Retirar tu voto') : t('Apoyar sugerencia')}: ${suggestion.title}`} title={currentUser ? t('Apoyar sugerencia') : t('Inicia sesión para votar')} disabled={busyVoteId === suggestion.id} onClick={() => void handleVote(suggestion)} className={`flex min-w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5f55d9] disabled:cursor-wait disabled:opacity-60 ${suggestion.hasVoted ? 'border-[#c8c3fb] bg-[#f2f0ff] text-[#5147cb]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#c8c3fb] hover:bg-[#f8f7ff] hover:text-[#5147cb]'}`}>
                            <ThumbsUp className={`size-3.5 ${suggestion.hasVoted ? 'fill-current' : ''}`} aria-hidden="true" />
                            <span className="tabular-nums">{suggestion.voteCount}</span>
                          </button>
                        </div>
                        {isModerator && editingId !== suggestion.id && (
                          <button type="button" onClick={() => beginModeration(suggestion)} className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[#5147cb] hover:bg-[#f2f0ff] focus-visible:outline-2 focus-visible:outline-[#5f55d9]">
                            <MessageSquareText className="size-3.5" aria-hidden="true" />{t('Responder o cambiar estado')}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          <div className="border-t border-[#e8e7e4] bg-[#fafaf9] px-4 py-3 text-xs text-slate-500 sm:px-6">
            {currentUser ? t('Puedes votar una vez por idea y cambiar tu voto cuando quieras.') : t('Inicia sesión para proponer ideas o votar.')}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">{t('El equipo de GameTracker actualiza los estados del roadmap.')}</p>
      </div>
    </section>
  );
}
