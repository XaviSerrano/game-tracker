import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

type NoticeTone = 'success' | 'error';
interface Notice { id: number; tone: NoticeTone; message: string; }
interface NoticeActions {
  success: (message: string) => void;
  error: (message: string) => void;
}

const NoticeContext = createContext<NoticeActions>({ success: () => {}, error: () => {} });

export function ActionNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const nextId = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const success = useCallback((message: string) => setNotice({ id: ++nextId.current, tone: 'success', message }), []);
  const error = useCallback((message: string) => setNotice({ id: ++nextId.current, tone: 'error', message }), []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const supportsPopover = typeof viewport.showPopover === 'function';
    if (notice) {
      if (supportsPopover && !viewport.matches(':popover-open')) viewport.showPopover();
      if (!supportsPopover) viewport.style.display = 'block';
      const timeout = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), notice.tone === 'error' ? 5000 : 3500);
      return () => window.clearTimeout(timeout);
    }
    if (supportsPopover && viewport.matches(':popover-open')) viewport.hidePopover();
    if (!supportsPopover) viewport.style.display = 'none';
  }, [notice]);

  return (
    <NoticeContext.Provider value={{ success, error }}>
      {children}
      <div ref={viewportRef} popover="manual" className="pointer-events-none fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[120] m-0 w-[calc(100vw-2rem)] max-w-md border-0 bg-transparent p-0 [top:auto] [left:auto] md:bottom-6" aria-live="polite">
        {notice && (
          <div key={notice.id} role={notice.tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/30 ${notice.tone === 'error' ? 'border-red-500/30 bg-red-950/95 text-red-300' : 'border-emerald-500/30 bg-emerald-950/95 text-emerald-300'}`}>
            {notice.tone === 'error'
              ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
            <span>{notice.message}</span>
          </div>
        )}
      </div>
    </NoticeContext.Provider>
  );
}

export function useActionNotice() {
  return useContext(NoticeContext);
}
