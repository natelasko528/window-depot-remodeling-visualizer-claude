import { afterEach, describe, expect, it, vi } from 'vitest';
import { settingsFromPayload, statusFromEnv, testProvider } from '../settings.mjs';

const KEY = 'sk-proj-abcdefghijklmnop1234';

describe('statusFromEnv', () => {
  it('reports a configured provider without returning the key', () => {
    const status = statusFromEnv({ OPENAI_API_KEY: KEY });
    expect(status.render.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain(KEY);
  });

  it('gives only the last four characters, which cannot rebuild a key', () => {
    const status = statusFromEnv({ OPENAI_API_KEY: KEY });
    expect(status.render.hint).toBe('1234');
    expect(status.render.hint).toHaveLength(4);
  });

  it('says nothing at all when no key is set', () => {
    const status = statusFromEnv({});
    expect(status.render).toEqual({ configured: false, hint: null, model: null });
    expect(status.detect).toEqual({ configured: false, hint: null, model: null });
  });

  it('treats a blank or stub value as unconfigured rather than reporting a green light', () => {
    expect(statusFromEnv({ ANTHROPIC_API_KEY: '   ' }).detect.configured).toBe(false);
    expect(statusFromEnv({ ANTHROPIC_API_KEY: 'todo' }).detect.configured).toBe(false);
  });

  it('names the model the key will be used with, so a typo is visible', () => {
    const status = statusFromEnv({ ANTHROPIC_API_KEY: KEY, ANTHROPIC_MODEL: 'claude-nonesuch' });
    expect(status.detect.model).toBe('claude-nonesuch');
  });
});

describe('testProvider', () => {
  const original = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = original;
  });

  it('does not call out at all when there is no key', async () => {
    globalThis.fetch = vi.fn();
    const result = await testProvider('render', {});
    expect(result.status).toBe(503);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('checks a model rather than generating anything, so the test is free', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200 }));
    await testProvider('render', { OPENAI_API_KEY: KEY, OPENAI_IMAGE_MODEL: 'gpt-image-1' });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/models/gpt-image-1');
    expect(init.headers.authorization).toBe(`Bearer ${KEY}`);
  });

  it('tells a rejected key apart from an unknown model', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 401 }));
    expect((await testProvider('render', { OPENAI_API_KEY: KEY })).body.message).toMatch(/rejected the key/);

    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404 }));
    expect((await testProvider('render', { OPENAI_API_KEY: KEY })).body.message).toMatch(/model name/);
  });

  it('does not blame the key for a 403, which a proxy sends too', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 403 }));
    const message = (await testProvider('render', { OPENAI_API_KEY: KEY })).body.message;
    expect(message).toMatch(/network policy/);
    expect(message).not.toMatch(/rejected the key/);
  });

  it('says detection is optional when its key is missing, because drawing by hand still works', async () => {
    const result = await testProvider('detect', {});
    expect(result.body.message).toMatch(/by hand/);
  });

  it('reports an unreachable service instead of throwing', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('getaddrinfo ENOTFOUND'); });
    const result = await testProvider('detect', { ANTHROPIC_API_KEY: KEY });
    expect(result.body.ok).toBe(false);
    expect(result.body.message).toMatch(/Could not reach/);
  });

  it('rejects an unknown provider name', async () => {
    expect((await testProvider('everything', { OPENAI_API_KEY: KEY })).status).toBe(400);
  });
});

describe('settingsFromPayload', () => {
  it('serves status on GET', async () => {
    const { status, body } = await settingsFromPayload('GET', null);
    expect(status).toBe(200);
    expect(body).toHaveProperty('render');
  });

  it('refuses anything but GET and POST', async () => {
    expect((await settingsFromPayload('DELETE', null)).status).toBe(405);
  });
});
