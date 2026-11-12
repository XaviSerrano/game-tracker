import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production landing is prerendered without leaking into SPA routes', async () => {
  const home = await readFile('dist/index.html', 'utf8');
  const app = await readFile('dist/app.html', 'utf8');
  const heading = 'Organize your video game collection.';

  assert.match(home, /<h1\b/);
  assert.ok(home.includes(heading));
  assert.ok(home.includes('rel="canonical" href="https://gametracker.space/"'));
  assert.ok(home.includes('href="/discover"'));
  assert.ok(!app.includes(heading));
  assert.ok(!app.includes('rel="canonical"'));
  assert.ok(!app.includes('property="og:url"'));
});

test('sitemap lists public routes and robots points to it', async () => {
  const sitemap = await readFile('dist/sitemap.xml', 'utf8');
  const robots = await readFile('dist/robots.txt', 'utf8');
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);

  assert.deepEqual(locations, ['https://gametracker.space/', 'https://gametracker.space/discover']);
  assert.match(robots, /^Sitemap: https:\/\/gametracker\.space\/sitemap\.xml$/m);
});
