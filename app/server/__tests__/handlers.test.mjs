import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_IMAGES, MAX_REFERENCES, generateFromPayload, imageSize } from '../generate.mjs';
import { detectFromPayload, schemaFor } from '../detect.mjs';
import { PANEL } from '../../src/data.ts';
import { MAX_IMAGES as CLIENT_MAX_IMAGES, MAX_REFERENCES as CLIENT_MAX_REFERENCES } from '../../src/lib/limits.ts';

/** Minimal but structurally valid PNG header at a known size. */
function png(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  return Buffer.concat([signature, ihdr]);
}

const dataUrl = (buffer, mime = 'image/png') => `data:${mime};base64,${buffer.toString('base64')}`;
const IMAGE = dataUrl(png(1536, 1024));

describe('imageSize', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    expect(imageSize(png(1536, 1024), 'image/png')).toEqual({ width: 1536, height: 1024 });
  });

  it('returns null for something that is not a PNG', () => {
    expect(imageSize(Buffer.from('not an image'), 'image/png')).toBeNull();
  });
});

describe('generateFromPayload', () => {
  const original = globalThis.fetch;
  let body;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    body = null;
    globalThis.fetch = vi.fn(async (_url, init) => {
      body = init.body;
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ b64_json: 'AAAA' }] }) };
    });
  });

  afterEach(() => {
    globalThis.fetch = original;
    delete process.env.OPENAI_API_KEY;
  });

  it('rejects a malformed image before spending a call', async () => {
    const result = await generateFromPayload({ image: 'nope', instructions: ['x'] });
    expect(result.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects an empty instruction list', async () => {
    const result = await generateFromPayload({ image: IMAGE, instructions: [] });
    expect(result.status).toBe(400);
  });

  it('validates the request before the server config, so a bad call is not blamed on the deployment', async () => {
    delete process.env.OPENAI_API_KEY;
    expect((await generateFromPayload({ image: 'nope', instructions: ['x'] })).status).toBe(400);
    expect((await generateFromPayload({ image: IMAGE, instructions: ['x'] })).status).toBe(503);
  });

  it('sends the mask to the image API', async () => {
    const result = await generateFromPayload({ image: IMAGE, mask: IMAGE, instructions: ['Siding — white.'] });
    expect(result.status).toBe(200);
    expect(body.has('mask')).toBe(true);
  });

  it('tells the model the edit is confined to the mask', async () => {
    await generateFromPayload({ image: IMAGE, mask: IMAGE, instructions: ['Siding — white.'] });
    expect(body.get('prompt')).toContain('transparent region of the mask');
  });

  it('omits the mask instruction when rendering the whole photo', async () => {
    await generateFromPayload({ image: IMAGE, instructions: ['Siding — white.'] });
    expect(body.has('mask')).toBe(false);
    expect(body.get('prompt')).not.toContain('transparent region of the mask');
  });

  it('rejects a mask that does not match the photo rather than paying for a failed call', async () => {
    const result = await generateFromPayload({
      image: IMAGE,
      mask: dataUrl(png(800, 600)),
      instructions: ['Siding — white.'],
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/800×600.*1536×1024/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-PNG mask', async () => {
    const result = await generateFromPayload({
      image: IMAGE,
      mask: dataUrl(Buffer.from('x'), 'image/jpeg'),
      instructions: ['Siding — white.'],
    });
    expect(result.status).toBe(400);
  });

  it('sends the photo first and each reference after it', async () => {
    const result = await generateFromPayload({
      image: IMAGE,
      references: [dataUrl(png(512, 512)), dataUrl(png(512, 512))],
      instructions: ['Roofing — black.', 'Siding — white.'],
    });
    expect(result.status).toBe(200);

    const images = body.getAll('image[]');
    expect(images).toHaveLength(3);
    expect(images[0].name).toBe('photo.png');
    expect(images[1].name).toBe('reference-1.png');
    expect(images[2].name).toBe('reference-2.png');
  });

  it('tells the model the trailing images are references, not scenery', async () => {
    await generateFromPayload({
      image: IMAGE,
      references: [dataUrl(png(512, 512))],
      instructions: ['Siding — white.'],
    });
    const prompt = body.get('prompt');
    expect(prompt).toContain('material reference');
    expect(prompt).toContain('Do not copy their shape, framing, edges or background');
  });

  it('says nothing about references when none are attached', async () => {
    await generateFromPayload({ image: IMAGE, instructions: ['Siding — white.'] });
    expect(body.getAll('image[]')).toHaveLength(1);
    expect(body.get('prompt')).not.toContain('material reference');
  });

  it('rejects more references than the image API allows rather than truncating', async () => {
    const tooMany = Array.from({ length: MAX_REFERENCES + 1 }, () => dataUrl(png(512, 512)));
    const result = await generateFromPayload({ image: IMAGE, references: tooMany, instructions: ['x'] });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(new RegExp(`${MAX_IMAGES} images`));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('accepts exactly the maximum', async () => {
    const most = Array.from({ length: MAX_REFERENCES }, () => dataUrl(png(512, 512)));
    const result = await generateFromPayload({ image: IMAGE, references: most, instructions: ['x'] });
    expect(result.status).toBe(200);
    expect(body.getAll('image[]')).toHaveLength(MAX_IMAGES);
  });

  it('rejects a reference that is not an image', async () => {
    const result = await generateFromPayload({ image: IMAGE, references: ['not-a-data-url'], instructions: ['x'] });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/Reference 1/);
  });

  it('rejects references that are not an array', async () => {
    const result = await generateFromPayload({ image: IMAGE, references: 'nope', instructions: ['x'] });
    expect(result.status).toBe(400);
  });

  it('still applies the mask to the photo when references are attached', async () => {
    const result = await generateFromPayload({
      image: IMAGE,
      mask: IMAGE,
      references: [dataUrl(png(512, 512))],
      instructions: ['Siding — white.'],
    });
    // The reference is 512x512 and must not be compared against the mask —
    // the mask applies to the first image only.
    expect(result.status).toBe(200);
    expect(body.has('mask')).toBe(true);
  });

  it('surfaces an upstream failure as a readable error', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false, status: 400,
      text: async () => JSON.stringify({ error: { message: 'content policy' } }),
    }));
    const result = await generateFromPayload({ image: IMAGE, instructions: ['x'] });
    expect(result.status).toBe(502);
    expect(result.body.error).toBe('content policy');
  });
});

describe('detectFromPayload', () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('requires the category list', async () => {
    const result = await detectFromPayload({ image: IMAGE });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/categories/);
  });

  it('rejects a malformed image', async () => {
    const result = await detectFromPayload({ image: 'nope', categories: ['Siding'] });
    expect(result.status).toBe(400);
  });

  it('reports a missing key only once the request itself is valid', async () => {
    const result = await detectFromPayload({ image: IMAGE, categories: ['Siding'] });
    expect(result.status).toBe(503);
  });
});

describe('detection can only ever return sellable categories', () => {
  it('builds the schema enum from the catalogue it is given', () => {
    const categories = Object.keys(PANEL);
    const schema = schemaFor(categories);
    expect(schema.properties.surfaces.items.properties.category.enum).toEqual(categories);
  });

  it('has no category the catalogue cannot price', () => {
    const schema = schemaFor(Object.keys(PANEL));
    for (const category of schema.properties.surfaces.items.properties.category.enum) {
      expect(PANEL[category], `${category} is detectable but has no products`).toBeDefined();
    }
  });
});

describe('client and server agree on the image budget', () => {
  it('shares the same cap, so the client never builds a request the server rejects', () => {
    expect(CLIENT_MAX_IMAGES).toBe(MAX_IMAGES);
    expect(CLIENT_MAX_REFERENCES).toBe(MAX_REFERENCES);
  });
});
