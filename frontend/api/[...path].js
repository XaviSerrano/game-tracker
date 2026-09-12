// Vercel serverless proxy for the Express API hosted on Render.
// Keeping the browser URL as /api/* preserves the first-party session cookie.
export const config = {
  api: {
    bodyParser: false,
  },
};

const readBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
  request.on('error', reject);
});

export default async function handler(req, res) {
  const apiOrigin = process.env.API_ORIGIN;

  if (!apiOrigin) {
    res.status(500).json({ error: 'API_ORIGIN no está configurada en Vercel.' });
    return;
  }

  const target = new URL(req.url, apiOrigin.endsWith('/') ? apiOrigin : `${apiOrigin}/`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value && !['host', 'connection', 'content-length'].includes(name.toLowerCase())) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
  }
  headers.set('x-forwarded-proto', 'https');

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    const setCookies = typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : []);
    if (setCookies.length) res.setHeader('set-cookie', setCookies);

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    res.send(responseBody);
  } catch (error) {
    console.error('Error proxying API request:', error);
    res.status(502).json({ error: 'No se pudo contactar con el servidor de GameTracker.' });
  }
}
