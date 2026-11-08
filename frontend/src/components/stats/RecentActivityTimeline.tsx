import React from 'react';
import { History, Trophy, Gamepad2, CheckCircle2, XCircle, Bookmark, Star, ListPlus, UserPlus, LucideIcon } from 'lucide-react';
import { RecentActivityItem } from './types.ts';
import { useLanguage } from '../../i18n.tsx';

interface RecentActivityTimelineProps {
  activities: RecentActivityItem[];
}

const TYPE_META: Record<string, { icon: LucideIcon; text: string; bg: string }> = {
  COMPLETED: { icon: Trophy, text: 'text-emerald-400', bg: 'bg-emerald-600/15' },
  PLAYING: { icon: Gamepad2, text: 'text-blue-400', bg: 'bg-blue-600/15' },
  PLAYED: { icon: CheckCircle2, text: 'text-cyan-400', bg: 'bg-cyan-600/15' },
  ABANDONED: { icon: XCircle, text: 'text-rose-400', bg: 'bg-rose-600/15' },
  WISHLIST: { icon: Bookmark, text: 'text-indigo-400', bg: 'bg-indigo-600/15' },
  REVIEWED: { icon: Star, text: 'text-yellow-400', bg: 'bg-yellow-600/15' },
  LIST_CREATED: { icon: ListPlus, text: 'text-violet-400', bg: 'bg-violet-600/15' },
  FOLLOWED: { icon: UserPlus, text: 'text-slate-400', bg: 'bg-slate-600/15' }
};

function formatRelativeDate(value: string, language: 'en' | 'es', t: (text: string) => string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return t('Ahora mismo');
  if (diffMinutes < 60) return language === 'en' ? `${diffMinutes} min ago` : `Hace ${diffMinutes} min`;
  if (diffHours < 24) return language === 'en' ? `${diffHours}h ago` : `Hace ${diffHours}h`;
  if (diffDays < 7) return language === 'en'
    ? `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    : `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
}

export const RecentActivityTimeline: React.FC<RecentActivityTimelineProps> = ({ activities }) => {
  const { t, language } = useLanguage();
  return <div className="bg-[#0f121d] border border-slate-850 p-5 rounded-2xl">
    <h3 className="font-semibold text-slate-300 font-display text-sm mb-4 flex items-center gap-1.5">
      <History className="w-4.5 h-4.5 text-blue-400" /> {t('Actividad reciente')}
    </h3>

    {activities.length === 0 ? (
      <p className="text-xs text-slate-500 text-center py-6">
        {t('Aún no tienes actividad registrada. Empieza a jugar, completar o puntuar juegos.')}
      </p>
    ) : (
      <ul className="space-y-3">
        {activities.map(activity => {
          const meta = TYPE_META[activity.type] ?? TYPE_META.FOLLOWED;
          return (
            <li key={activity.id} className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg ${meta.bg} ${meta.text} flex-shrink-0 mt-0.5`}>
                <meta.icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-300 leading-relaxed truncate">
                  {activity.details ? t(activity.details) : t('Actualizó su biblioteca')}
                </p>
                <span className="text-[10px] text-slate-500">{formatRelativeDate(activity.createdAt, language, t)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>;
};
