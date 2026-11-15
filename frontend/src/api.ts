import { Capacitor, CapacitorHttp } from '@capacitor/core';

const androidApiOrigin = import.meta.env.VITE_ANDROID_API_ORIGIN || 'https://gametracker-wk5b.onrender.com';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!path.startsWith('/api/')) {
    throw new Error('API requests must use an /api/ path.');
  }

  if (!Capacitor.isNativePlatform()) {
    return fetch(path, init);
  }

  const origin = new URL(androidApiOrigin);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('VITE_ANDROID_API_ORIGIN must be an HTTPS origin without a path.');
  }
  if (init?.body != null && typeof init.body !== 'string') {
    throw new Error('Android API requests only support string request bodies.');
  }
  const signal = init?.signal;
  signal?.throwIfAborted();
  const request = CapacitorHttp.request({
    url: new URL(path, origin).toString(),
    method: init?.method || 'GET',
    headers: Object.fromEntries(new Headers(init?.headers).entries()),
    data: init?.body
  });
  const response = signal
    ? await new Promise<Awaited<typeof request>>((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        request.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
      })
    : await request;
  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  headers.delete('set-cookie2');
  const contentType = headers.get('content-type') || '';
  const body = [204, 205, 304].includes(response.status)
    ? null
    : contentType.includes('application/json')
      ? JSON.stringify(response.data)
      : String(response.data);
  return new Response(body, { status: response.status, headers });
}
