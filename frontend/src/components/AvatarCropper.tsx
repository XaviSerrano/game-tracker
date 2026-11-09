import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n.tsx';
import { Dialog } from './Dialog.tsx';

interface AvatarCropperProps {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

const BOX = 280;
const OUTPUT = 256;
const MAX_ZOOM = 4;
const KEY_STEP = 12;

export const AvatarCropper: React.FC<AvatarCropperProps> = ({ file, onCancel, onConfirm }) => {
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setNatural(null);
    setFailed(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scale = natural ? (BOX / Math.min(natural.w, natural.h)) * zoom : 1;
  const width = natural ? natural.w * scale : 0;
  const height = natural ? natural.h * scale : 0;

  const clamp = (x: number, y: number, nextScale = scale) => {
    if (!natural) return { x: 0, y: 0 };
    const maxX = Math.max(0, (natural.w * nextScale - BOX) / 2);
    const maxY = Math.max(0, (natural.h * nextScale - BOX) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y))
    };
  };

  const changeZoom = (nextZoom: number) => {
    if (!natural) return;
    const value = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
    const nextScale = (BOX / Math.min(natural.w, natural.h)) * value;
    setZoom(value);
    setOffset(current => clamp(current.x, current.y, nextScale));
  };

  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img || !natural) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const left = BOX / 2 + offset.x - width / 2;
    const top = BOX / 2 + offset.y - height / 2;
    ctx.drawImage(img, -left / scale, -top / scale, BOX / scale, BOX / scale, 0, 0, OUTPUT, OUTPUT);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <Dialog label={t('Ajustar foto de perfil')} onClose={onCancel}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-[#0f121d] p-5 shadow-2xl">
        <div>
          <h2 className="text-sm font-bold text-white">{t('Ajustar foto de perfil')}</h2>
          <p className="mt-1 text-xs text-slate-400">{t('Arrastra para encuadrar y usa el control para hacer zoom.')}</p>
        </div>

        <div
          tabIndex={0}
          role="group"
          aria-label={t('Área de recorte')}
          className="relative mx-auto cursor-grab touch-none select-none overflow-hidden rounded-xl bg-[#07090e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] active:cursor-grabbing"
          style={{ width: BOX, height: BOX }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            const last = dragRef.current;
            if (!last) return;
            const dx = event.clientX - last.x;
            const dy = event.clientY - last.y;
            dragRef.current = { x: event.clientX, y: event.clientY };
            setOffset(current => clamp(current.x + dx, current.y + dy));
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onWheel={(event) => changeZoom(zoom - event.deltaY * 0.002)}
          onKeyDown={(event) => {
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [KEY_STEP, 0],
              ArrowRight: [-KEY_STEP, 0],
              ArrowUp: [0, KEY_STEP],
              ArrowDown: [0, -KEY_STEP]
            };
            const move = moves[event.key];
            if (!move) return;
            event.preventDefault();
            setOffset(current => clamp(current.x + move[0], current.y + move[1]));
          }}
        >
          {imageUrl && <img
            ref={imageRef}
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={(event) => {
              setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight });
              setFailed(false);
            }}
            onError={() => setFailed(true)}
            className="pointer-events-none absolute max-w-none"
            style={{
              width,
              height,
              left: BOX / 2 + offset.x - width / 2,
              top: BOX / 2 + offset.y - height / 2,
              visibility: natural ? 'visible' : 'hidden'
            }}
          />}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/70 shadow-[0_0_0_999px_rgba(11,13,18,0.7)]"
          />
        </div>

        {failed && <p className="text-xs text-red-400" role="alert">{t('No se pudo leer la imagen.')}</p>}

        <div className="space-y-1.5">
          <label htmlFor="avatar-zoom" className="block text-xs font-semibold text-slate-400">{t('Zoom')}</label>
          <input
            id="avatar-zoom"
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!natural}
            onChange={(event) => changeZoom(Number(event.target.value))}
            className="w-full accent-[#d9a352]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-slate-850 px-3.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white"
          >
            {t('Cancelar')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!natural}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {t('Aplicar')}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
