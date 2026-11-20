import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '../i18n.tsx';

type GoogleButtonText = 'signin_with' | 'signup_with';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select: false;
      }) => void;
      renderButton: (element: HTMLElement, options: {
        theme: 'outline';
        size: 'large';
        shape: 'rectangular';
        text: GoogleButtonText;
        width: number;
        locale: string;
      }) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityServices = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el acceso de Google.'));
    document.head.appendChild(script);
  }).catch(error => {
    googleScriptPromise = null;
    throw error;
  });

  return googleScriptPromise;
}

interface GoogleSignInButtonProps {
  text: GoogleButtonText;
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ text, onCredential, disabled = false }: GoogleSignInButtonProps) {
  const { language, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  callbackRef.current = onCredential;

  useEffect(() => {
    if (!googleClientId || Capacitor.isNativePlatform()) return;
    let active = true;

    loadGoogleIdentityServices().then(() => {
      if (!active || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: response => callbackRef.current(response.credential),
        auto_select: false
      });
      setReady(true);
    }).catch(() => {
      if (active) setLoadError(true);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => setWidth(Math.floor(container.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || width < 200 || !containerRef.current || !window.google) return;
    const container = containerRef.current;
    container.replaceChildren();
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text,
      width: Math.min(width, 400),
      locale: language
    });
  }, [language, ready, text, width]);

  if (!googleClientId || Capacitor.isNativePlatform()) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-800" />
        <span>{t('o continúa con')}</span>
        <span className="h-px flex-1 bg-slate-800" />
      </div>
      <div ref={containerRef} className="relative flex min-h-10 w-full justify-center" aria-busy={!ready} aria-disabled={disabled}>
        {!ready && !loadError && <span role="status" className="sr-only">{t('Cargando acceso de Google...')}</span>}
        {disabled && <span aria-hidden="true" className="absolute inset-0 z-10 cursor-wait" />}
      </div>
      {loadError && <p role="alert" className="text-center text-xs text-red-300">{t('No se pudo cargar el acceso de Google.')}</p>}
    </div>
  );
}
