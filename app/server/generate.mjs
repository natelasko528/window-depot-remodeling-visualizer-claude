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

/**
 * Core generation step, transport-agnostic so it can be driven by both the
 * Node server (`server/index.mjs`, the Vite dev plugin) and the Vercel
 * serverless function in `api/generate.mjs`.
 *
 * Resolves `{ status, body }` rather than writing to a response, because
 * Vercel pre-parses request bodies and its response object differs from a
 * bare ServerResponse.
 */
export async function generateFromPayload(payload) {
  // Validate the request before checking server config, so a malformed call
  // gets an accurate 400 rather than a 503 that blames the deployment.
  const image = decodeDataUrl(payload?.image);
  if (!image) {
    return { status: 400, body: { error: 'Expected `image` as a base64 PNG, JPEG or WebP data URL.' } };
  }
  const instructions = Array.isArray(payload.instructions) ? payload.instructions.filter((l) => typeof l === 'string' && l.trim()) : [];
  if (!instructions.length) {
    return { status: 400, body: { error: 'Expected at least one product change in `instructions`.' } };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { status: 503, body: { error: 'No OPENAI_API_KEY configured on the server.' } };
  }

  const form = new FormData();
  form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  form.append('prompt', composePrompt(instructions));
  form.append('size', process.env.OPENAI_IMAGE_SIZE || '1536x1024');
  form.append('n', '1');
  form.append('image', new Blob([image.buffer], { type: image.mime }), `photo.${image.mime === 'image/jpeg' ? 'jpg' : image.mime.slice(6)}`);

  // Give up just before the platform would kill us, so the client gets a JSON
  // error it can render instead of an opaque gateway timeout. GENERATE_TIMEOUT_MS
  // is set from vercel.json's maxDuration on serverless; locally there is no
  // ceiling, so the original 180s applies.
  const budget = Number(process.env.GENERATE_TIMEOUT_MS) || 180_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), budget);
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
      return { status: 502, body: { error: `the image API returned an unreadable ${upstream.status} response` } };
    }
    if (!upstream.ok) {
      return { status: 502, body: { error: result?.error?.message || `the image API returned ${upstream.status}` } };
    }
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      return { status: 502, body: { error: 'Image API returned no image data.' } };
    }
    return { status: 200, body: { image: `data:image/png;base64,${b64}` } };
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return {
      status: 504,
      body: { error: aborted ? 'The image API took too long to respond.' : String(err?.message || err) },
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Node `(req, res)` adapter — used by server/index.mjs and the Vite dev plugin. */
export async function generateHandler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Use POST.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, { error: 'Expected a JSON body.' });
    return;
  }

  const { status, body } = await generateFromPayload(payload);
  send(res, status, body);
}
