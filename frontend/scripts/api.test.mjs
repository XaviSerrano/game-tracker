import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

test('API client preserves web requests and uses native HTTP only for Android API calls', async () => {
  const originalFetch = globalThis.fetch;
  const originalCapacitor = globalThis.Capacitor;
  const originalBridge = globalThis.androidBridge;
  let nativeRequest;
  let nativeResponse;
  globalThis.androidBridge = {};
  globalThis.Capacitor = {
    PluginHeaders: [{ name: 'CapacitorHttp', methods: [{ name: 'request', rtype: 'promise' }] }],
    nativePromise: (_plugin, _method, options) => {
      nativeRequest = options;
      return nativeResponse();
    }
  };
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { apiFetch } = await server.ssrLoadModule('/src/api.ts');
    const capacitor = globalThis.Capacitor;
    capacitor.isNativePlatform = () => false;
    globalThis.fetch = async (path, init) => {
      assert.equal(path, '/api/auth/me');
      assert.equal(init.credentials, 'include');
      return new Response('web');
    };
    assert.equal(await (await apiFetch('/api/auth/me', { credentials: 'include' })).text(), 'web');

    capacitor.isNativePlatform = () => true;
    nativeResponse = async () => ({
      status: 201,
      url: '',
      data: { user: 'test' },
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'session=secret' }
    });
    const response = await apiFetch('/api/auth/login?test=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"test"}'
    });
    assert.equal(nativeRequest.url, 'https://gametracker-wk5b.onrender.com/api/auth/login?test=1');
    assert.equal(nativeRequest.method, 'POST');
    assert.equal(nativeRequest.data, '{"email":"test"}');
    assert.deepEqual(await response.json(), { user: 'test' });
    assert.equal(response.headers.get('set-cookie'), null);
    await assert.rejects(apiFetch('/other'), /API requests must use/);
    await assert.rejects(apiFetch('/api/upload', { body: new FormData() }), /only support string/);

    let finish;
    nativeResponse = () => new Promise(resolve => { finish = resolve; });
    const controller = new AbortController();
    const pending = apiFetch('/api/games', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    finish({ status: 204, url: '', data: '', headers: {} });
  } finally {
    await server.close();
    globalThis.fetch = originalFetch;
    globalThis.Capacitor = originalCapacitor;
    globalThis.androidBridge = originalBridge;
  }
});
