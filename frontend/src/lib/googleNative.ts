import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

// Siempre el Client ID WEB, nunca el de Android.
const WEB_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';

let initialized = false;

export const isNative = (): boolean => Capacitor.isNativePlatform();

export async function initGoogleNative(): Promise<void> {
  if (!isNative() || initialized) return;
  if (!WEB_CLIENT_ID) throw new Error('Google client ID is not configured.');
  await SocialLogin.initialize({
    google: { webClientId: WEB_CLIENT_ID },
  });
  initialized = true;
}

export async function getNativeGoogleIdToken(): Promise<string> {
  await initGoogleNative();
  const res = await SocialLogin.login({
    provider: 'google',
    options: {},
  });
  const result = res.result as { idToken?: string | null };
  if (!result.idToken) throw new Error('Google no devolvió idToken');
  return result.idToken;
}