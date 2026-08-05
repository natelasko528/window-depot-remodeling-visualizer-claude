try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env present; fall back to whatever is already in the environment.
}

/**
 * Provider status for the settings screen.
 *
 * This route exists so a rep standing in a driveway can tell "the render failed"
 * apart from "this deployment has no key", without anyone reading them a secret
 * over the phone. It reports whether a key is present, which model it will be
 * used with, and the last four characters so two keys can be told apart.
 *
 * It never returns a key. The last four characters cannot be used to
 * reconstruct one, which is the same trade card issuers and cloud consoles
 * make; everything else stays server-side.
 */

const DEFAULT_IMAGE_MODEL = 'gpt-image-1';
const DEFAULT_DETECT_MODEL = 'claude-opus-5';

function provider(key, model) {
  const usable = typeof key === 'string' && key.trim().length > 8;
  return {
    configured: usable,
    hint: usable ? key.trim().slice(-4) : null,
    model: usable ? model : null,
  };
}

export function statusFromEnv(env = process.env) {
  return {
    render: provider(env.OPENAI_API_KEY, env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL),
    detect: provider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || DEFAULT_DETECT_MODEL),
    // Derived from the photograph so the render lands in the same frame as the
    // original. Not configurable, and saying so here stops it being looked for.
    imageSize: 'Matched to the photo',
    timeoutMs: Number(env.GENERATE_TIMEOUT_MS) || 180_000,
  };
}

/**
 * A real call against each provider, chosen to cost nothing: both are metadata
 * reads, so "the key works" is verified without generating a billable image or
 * completion. Model lookups also catch a mistyped model name, which is the
 * other half of why a correctly-keyed deployment still fails.
 */
async function check(url, headers, what) {
  try {
    const res = await fetch(url, { headers });
    if (res.ok) return { ok: true, message: `${what} is reachable and the key is valid.` };
    if (res.status === 401) {
      return { ok: false, message: `${what} rejected the key. Check the environment variable on the deployment.` };
    }
    // A 403 can come from the provider *or* from a proxy in front of it, and
    // the two want completely different fixes — so say both rather than send
    // someone to rotate a key that was never the problem.
    if (res.status === 403) {
      return { ok: false, message: `${what} refused the request. Either the key lacks access, or a network policy is blocking the host.` };
    }
    if (res.status === 404) {
      return { ok: false, message: `The key works, but ${what} does not recognise that model name.` };
    }
    return { ok: false, message: `${what} returned ${res.status}.` };
  } catch (err) {
    return { ok: false, message: `Could not reach ${what}: ${String(err?.message || err)}` };
  }
}

export async function testProvider(name, env = process.env) {
  if (name === 'render') {
    const key = env.OPENAI_API_KEY;
    if (!key) return { status: 503, body: { ok: false, message: 'No OPENAI_API_KEY is set on this deployment.' } };
    const model = env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
    const body = await check(
      `https://api.openai.com/v1/models/${encodeURIComponent(model)}`,
      { authorization: `Bearer ${key}` },
      'The image service',
    );
    return { status: 200, body };
  }

  if (name === 'detect') {
    const key = env.ANTHROPIC_API_KEY;
    if (!key) return { status: 503, body: { ok: false, message: 'No ANTHROPIC_API_KEY is set on this deployment. Areas can still be drawn by hand.' } };
    const model = env.ANTHROPIC_MODEL || DEFAULT_DETECT_MODEL;
    const body = await check(
      `https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`,
      { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      'The detection service',
    );
    return { status: 200, body };
  }

  return { status: 400, body: { ok: false, message: 'Expected `test` to be "render" or "detect".' } };
}

export async function settingsFromPayload(method, payload) {
  if (method === 'GET') return { status: 200, body: statusFromEnv() };
  if (method === 'POST') return testProvider(payload?.test);
  return { status: 405, body: { error: 'Use GET or POST.' } };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Node `(req, res)` adapter — used by server/index.mjs and the Vite dev plugin. */
export async function settingsHandler(req, res) {
  const send = (status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });
    res.end(body);
  };

  let payload = null;
  if (req.method === 'POST') {
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      send(400, { ok: false, message: 'Expected a JSON body.' });
      return;
    }
  }

  const { status, body } = await settingsFromPayload(req.method, payload);
  send(status, body);
}
