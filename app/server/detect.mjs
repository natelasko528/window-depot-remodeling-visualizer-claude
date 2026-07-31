import Anthropic from '@anthropic-ai/sdk';

try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env present; fall back to whatever is already in the environment.
}

/**
 * Surface detection.
 *
 * Claude reads the photograph and returns the regions a remodeler would quote.
 * This is what makes the app work on an arbitrary house — the prototype's
 * hardcoded rectangles were positioned for one specific JPEG and meant nothing
 * anywhere else.
 *
 * Coordinates come back normalised 0..1 so an overlay lands correctly at any
 * render size, on any photo, at any device pixel ratio.
 */

// Kept in step with the PANEL catalogue in src/data.ts — a category the app has
// no products for would produce an area the rep cannot actually price.
const CATEGORIES = [
  'Roofing',
  'Siding',
  'Windows',
  'Entry doors',
  'Patio doors',
  'Gutters, soffit & fascia',
];

const SCHEMA = {
  type: 'object',
  properties: {
    surfaces: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: CATEGORIES },
          label: {
            type: 'string',
            description: 'Short human name a salesperson would say out loud, e.g. "Rear wall siding" or "Garage roof plane".',
          },
          polygon: {
            type: 'array',
            description: 'Outline in normalised image coordinates, 0..1, clockwise. 4-12 points.',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
              required: ['x', 'y'],
              additionalProperties: false,
            },
          },
          approx_sqft: {
            type: ['number', 'null'],
            description: 'Rough area in square feet if it can be estimated from the photo, otherwise null.',
          },
          confidence: { type: 'number', description: '0..1' },
        },
        required: ['category', 'label', 'polygon', 'approx_sqft', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['surfaces'],
  additionalProperties: false,
};

const PROMPT = [
  'This is a photograph of a house taken at a home-improvement sales appointment.',
  '',
  'Identify each exterior surface that could be quoted as a remodeling job, and',
  'outline it as a polygon in normalised coordinates where (0,0) is the top-left',
  'of the image and (1,1) is the bottom-right.',
  '',
  'Rules:',
  '- Only outline surfaces that are actually visible in this photograph.',
  '- Trace the real edges of each surface. Do not return a bounding box that',
  '  swallows sky, ground, landscaping, or the neighbouring property.',
  '- Give each roof plane, each wall, and each door its own entry. Group windows',
  '  that sit together on one wall into a single entry.',
  '- Use 4 to 12 points per polygon: enough to follow the roofline and corners,',
  '  not so many that it becomes a trace of every shingle.',
  '- Estimate approx_sqft only when the photo gives you something to scale',
  '  against (a door, a standard window). Otherwise return null rather than a guess.',
  '- Set confidence below 0.5 for a surface that is heavily shadowed, cropped by',
  '  the frame, or obscured by a tree or vehicle.',
  '',
  'If the image is not a photograph of a building, return an empty surfaces array.',
].join('\n');

const MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function decodeDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(dataUrl ?? '');
  if (!match || !MEDIA_TYPES.has(match[1])) return null;
  return { mediaType: match[1], data: match[2] };
}

function clamp01(n) {
  return Math.min(1, Math.max(0, Number(n) || 0));
}

/**
 * Transport-agnostic core, mirroring generate.mjs so the same code runs behind
 * the Vite dev plugin, the local Node server and the Vercel function.
 */
export async function detectFromPayload(payload) {
  // Validate the request before checking server config, so a malformed call
  // gets an accurate 400 rather than a 503 that blames the deployment.
  const image = decodeDataUrl(payload?.image);
  if (!image) {
    return { status: 400, body: { error: 'Expected `image` as a base64 PNG, JPEG, WebP or GIF data URL.' } };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { status: 503, body: { error: 'No ANTHROPIC_API_KEY configured on the server.' } };
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
      // Thinking is on by default on Opus 5 and shares this budget with the
      // response, so this is sized well above the JSON itself.
      max_tokens: 8000,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { status: 422, body: { error: 'That photo could not be analysed. Mark the areas by hand instead.' } };
    }
    if (response.stop_reason === 'max_tokens') {
      return { status: 502, body: { error: 'The analysis ran long and was cut off. Try again, or mark the areas by hand.' } };
    }

    const text = response.content.find((block) => block.type === 'text')?.text;
    if (!text) {
      return { status: 502, body: { error: 'The vision model returned nothing to read.' } };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 502, body: { error: 'The vision model returned unreadable JSON.' } };
    }

    // The schema constrains shape but not sanity: coordinates are clamped and
    // degenerate polygons dropped so a bad detection cannot break the overlay
    // or produce a mask with no area.
    const surfaces = (Array.isArray(parsed.surfaces) ? parsed.surfaces : [])
      .map((s) => ({
        category: s.category,
        label: String(s.label ?? '').trim() || s.category,
        polygon: (Array.isArray(s.polygon) ? s.polygon : []).map((p) => ({
          x: clamp01(p?.x),
          y: clamp01(p?.y),
        })),
        approxSqft: typeof s.approx_sqft === 'number' ? s.approx_sqft : null,
        confidence: typeof s.confidence === 'number' ? clamp01(s.confidence) : null,
      }))
      .filter((s) => CATEGORIES.includes(s.category) && s.polygon.length >= 3);

    return { status: 200, body: { surfaces } };
  } catch (err) {
    const status = err?.status;
    if (status === 429) {
      return { status: 429, body: { error: 'The vision service is rate limited. Try again in a moment.' } };
    }
    return { status: 502, body: { error: String(err?.message || err) } };
  }
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
export async function detectHandler(req, res) {
  const send = (status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });
    res.end(body);
  };

  if (req.method !== 'POST') {
    send(405, { error: 'Use POST.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    send(400, { error: 'Expected a JSON body.' });
    return;
  }

  const { status, body } = await detectFromPayload(payload);
  send(status, body);
}
