import type { SVGProps } from 'react';
import { Bookmark, CircleCheck, Gamepad2, Trophy, XCircle, type LucideIcon } from 'lucide-react';
import type { GameStatus } from '../types.ts';

const STATUS_ICONS: Record<GameStatus, LucideIcon> = {
  WISHLIST: Bookmark,
  PLAYING: Gamepad2,
  PLAYED: CircleCheck,
  COMPLETED: Trophy,
  ABANDONED: XCircle
};

export function GameStatusIcon({ status, ...props }: SVGProps<SVGSVGElement> & { status: GameStatus }) {
  const Icon = STATUS_ICONS[status];
  return <Icon {...props} aria-hidden="true" />;
}
