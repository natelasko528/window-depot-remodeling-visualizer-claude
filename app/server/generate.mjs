try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env present; fall back to whatever is already in the environment.
}

const OPENAI_URL = 'https://api.openai.com/v1/images/edits';
const MAX_BODY_BYTES = 25 * 1024 * 1024;

function composePrompt(instructions) {
  return [
    'This is a photograph of a real house taken during a home-improvement sales appointment.',
    'Re-render the photograph with these product changes applied:',
    ...instructions.map((line) => `- ${line}`),
    '',
    'Keep the camera angle, framing, perspective, lens distortion and resolution identical to the source photograph.',
    'Keep the time of day, sun direction, shadow length and colour temperature identical.',
    'Do not change the landscaping, sky, deck, furniture, neighbouring structures, or anything not named above.',
    'Do not add, remove or resize any window, door or roof plane.',
    'The result must be photorealistic and look like a photograph of the same house after the work was done.',
  ].join('\n');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function decodeDataUrl(dataUrl) {
  const match = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[3], 'base64') };
}

export async function generateHandler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Use POST.' });
    return;
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    send(res, 503, { error: 'No OPENAI_API_KEY configured on the server.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, { error: 'Expected a JSON body.' });
    return;
  }

  const image = decodeDataUrl(payload.image);
  if (!image) {
    send(res, 400, { error: 'Expected `image` as a base64 PNG, JPEG or WebP data URL.' });
    return;
  }
  const instructions = Array.isArray(payload.instructions) ? payload.instructions.filter((l) => typeof l === 'string' && l.trim()) : [];
  if (!instructions.length) {
    send(res, 400, { error: 'Expected at least one product change in `instructions`.' });
    return;
  }

  const form = new FormData();
  form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  form.append('prompt', composePrompt(instructions));
  form.append('size', process.env.OPENAI_IMAGE_SIZE || '1536x1024');
  form.append('n', '1');
  form.append('image', new Blob([image.buffer], { type: image.mime }), `photo.${image.mime === 'image/jpeg' ? 'jpg' : image.mime.slice(6)}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });
    const raw = await upstream.text();
    let result = null;
    try {
      result = JSON.parse(raw);
    } catch {
      send(res, 502, { error: `the image API returned an unreadable ${upstream.status} response` });
      return;
    }
    if (!upstream.ok) {
      send(res, 502, { error: result?.error?.message || `the image API returned ${upstream.status}` });
      return;
    }
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      send(res, 502, { error: 'Image API returned no image data.' });
      return;
    }
    send(res, 200, { image: `data:image/png;base64,${b64}` });
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    send(res, 504, { error: aborted ? 'The image API took too long to respond.' : String(err?.message || err) });
  } finally {
    clearTimeout(timeout);
  }
}
