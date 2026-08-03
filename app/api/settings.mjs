import { settingsFromPayload } from '../server/settings.mjs';

// Same body-parsing caveat as api/generate.mjs: Vercel drains the request
// stream into req.body before the handler runs.
async function readPayload(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  let payload = null;
  if (req.method === 'POST') {
    try {
      payload = await readPayload(req);
    } catch {
      res.status(400).json({ ok: false, message: 'Expected a JSON body.' });
      return;
    }
  }

  const { status, body } = await settingsFromPayload(req.method, payload);
  res.status(status).json(body);
}
