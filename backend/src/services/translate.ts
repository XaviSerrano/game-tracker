const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const TRANSLATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CHUNK_LENGTH = 1500;
const MAX_CACHE_ENTRIES = 2000;
const REQUEST_TIMEOUT_MS = 8000;

const translationCache = new Map<string, { text: string; expiry: number }>();

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current && current.length + sentence.length + 1 > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current} ${sentence}` : sentence;
  }

  if (current) chunks.push(current);
  return chunks.flatMap(chunk =>
    chunk.length > MAX_CHUNK_LENGTH
      ? (chunk.match(new RegExp(`.{1,${MAX_CHUNK_LENGTH}}`, 'gs')) ?? [chunk])
      : [chunk]
  );
}

async function translateChunk(text: string, target: string): Promise<string> {
  const response = await fetch(TRANSLATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client: 'gtx', sl: 'auto', tl: target, dt: 't', q: text }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Translation failed (${response.status})`);
  }

  const data = await response.json() as unknown;
  const segments = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : null;
  if (!segments) {
    throw new Error('Unexpected translation response');
  }

  return segments
    .map((segment: unknown) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('');
}

export async function translateText(text: string, target: string, cacheKey: string): Promise<string> {
  const key = `${target}:${cacheKey}`;
  const cached = translationCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.text;
  }

  const translated = (await Promise.all(splitIntoChunks(text).map(chunk => translateChunk(chunk, target)))).join(' ');

  if (translationCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = translationCache.keys().next().value;
    if (oldest !== undefined) translationCache.delete(oldest);
  }
  translationCache.set(key, { text: translated, expiry: Date.now() + TRANSLATION_TTL_MS });
  return translated;
}
