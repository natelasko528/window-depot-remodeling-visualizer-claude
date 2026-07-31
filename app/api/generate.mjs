import { generateFromPayload } from '../server/generate.mjs';

// Vercel's Node runtime parses JSON bodies into `req.body` before the handler
// runs, which drains the stream. Reading the stream directly (as the local Node
// server does) would therefore hang here, so prefer the parsed body and only
// fall back to reading when the platform left it untouched.
async function readPayload(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  let payload;
  try {
    payload = await readPayload(req);
  } catch {
    res.status(400).json({ error: 'Expected a JSON body.' });
    return;
  }

  const { status, body } = await generateFromPayload(payload);
  res.status(status).json(body);
}
