import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '../i18n.tsx';
import { getNativeGoogleIdToken } from '../lib/googleNative';

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
        theme: 'filled_black';
        size: 'large';
        shape: 'rectangular';
        logo_alignment: 'left';
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

function loadGoogleIdentityServices(language: string): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(language)}`;
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

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  text: GoogleButtonText;
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ text, onCredential, disabled = false }: GoogleSignInButtonProps) {
  const { language, t } = useLanguage();
  const isNative = Capacitor.isNativePlatform();
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const languageRef = useRef(language);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [nativeError, setNativeError] = useState(false);

  callbackRef.current = onCredential;
  languageRef.current = language;

  // Web: carga Google Identity Services y lo inicializa.
  useEffect(() => {
    if (!googleClientId || isNative) return;
    let active = true;

    loadGoogleIdentityServices(languageRef.current).then(() => {
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
  }, [isNative]);

  // Web: mide el ancho del contenedor para el botón oficial.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => setWidth(Math.floor(container.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Web: dibuja el botón oficial de Google.
  useEffect(() => {
    if (!ready || width < 200 || !containerRef.current || !window.google) return;
    const container = containerRef.current;
    container.replaceChildren();
    window.google.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'large',
      shape: 'rectangular',
      logo_alignment: 'left',
      text,
      width: Math.min(width, 400),
      locale: language
    });
  }, [language, ready, text, width]);

  // App móvil: login nativo con el plugin de Capacitor.
  async function handleNativeClick() {
    if (disabled || nativeBusy) return;
    setNativeBusy(true);
    setNativeError(false);
    try {
      const idToken = await getNativeGoogleIdToken();
      callbackRef.current(idToken);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const cancelled = message.includes('cancel');
      if (!cancelled) {
        console.error('Google native login failed:', error);
        setNativeError(true);
      }
    } finally {
      setNativeBusy(false);
    }
  }

  if (!googleClientId) return null;

  const separator = (
    <div className="flex items-center gap-3 text-xs text-slate-500" aria-hidden="true">
      <span className="h-px flex-1 bg-slate-800" />
      <span>{t('o continúa con')}</span>
      <span className="h-px flex-1 bg-slate-800" />
    </div>
  );

  if (isNative) {
    const label = text === 'signup_with' ? t('Registrarse con Google') : t('Iniciar sesión con Google');
    return (
      <div className="mt-5 space-y-3">
        {separator}
        <button
          type="button"
          onClick={handleNativeClick}
          disabled={disabled || nativeBusy}
          className="flex min-h-10 w-full items-center justify-center gap-3 rounded border border-slate-700 bg-black px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-slate-900 disabled:cursor-wait disabled:opacity-60"
        >
          <GoogleLogo />
          <span>{label}</span>
        </button>
        {nativeError && <p role="alert" className="text-center text-xs text-red-300">{t('No se pudo iniciar sesión con Google.')}</p>}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {separator}
      <div ref={containerRef} className="relative flex min-h-10 w-full justify-center" aria-busy={!ready} aria-disabled={disabled}>
        {!ready && !loadError && <span role="status" className="sr-only">{t('Cargando acceso de Google...')}</span>}
        {disabled && <span aria-hidden="true" className="absolute inset-0 z-10 cursor-wait" />}
      </div>
      {loadError && <p role="alert" className="text-center text-xs text-red-300">{t('No se pudo cargar el acceso de Google.')}</p>}
    </div>
  );
}