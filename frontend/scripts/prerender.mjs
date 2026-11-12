import { readFile, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  plugins: [react()],
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom'
});

try {
  const { LandingPage } = await server.ssrLoadModule('/src/components/LandingPage.tsx');
  const { LanguageProvider } = await server.ssrLoadModule('/src/i18n.tsx');
  const noop = () => {};
  const landing = renderToStaticMarkup(
    createElement(LanguageProvider, null, createElement(LandingPage, {
      onDiscover: noop,
      onOpenAuth: noop,
      onGoHome: noop
    }))
  );
  const html = await readFile('dist/index.html', 'utf8');
  const root = '<div id="root"></div>';
  if (!html.includes(root)) throw new Error('Could not find the React root in dist/index.html');

  const appHtml = html
    .replace(/\s*<link rel="canonical" href="[^"]*" \/>/, '')
    .replace(/\s*<meta property="og:url" content="[^"]*" \/>/, '');
  await writeFile('dist/app.html', appHtml);
  await writeFile('dist/index.html', html.replace(root, `<div id="root">${landing}</div>`));
} finally {
  await server.close();
}
