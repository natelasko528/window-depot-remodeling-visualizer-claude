import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, TIMEOUT_BOUNDS, hydrate, initials } from '../lib/settings';
import { MAX_REFERENCES } from '../lib/limits';
import { priceLabel } from '../derived';

describe('hydrate', () => {
  it('fills in a field added after a tablet was last saved', () => {
    const settings = hydrate({ rep: { name: 'Alex Reyes' } } as never);
    expect(settings.rep.market).toBe('');
    expect(settings.render.maxReferences).toBe(MAX_REFERENCES);
  });

  it('refuses a timeout short enough to abort every render before it starts', () => {
    expect(hydrate({ render: { timeoutMs: 0 } } as never).render.timeoutMs).toBe(TIMEOUT_BOUNDS.min);
  });

  it('caps references at what the image API will actually accept', () => {
    expect(hydrate({ render: { maxReferences: 99 } } as never).render.maxReferences).toBe(MAX_REFERENCES);
    expect(hydrate({ render: { maxReferences: -3 } } as never).render.maxReferences).toBe(0);
  });

  it('falls back rather than propagating a corrupt number into an AbortController', () => {
    expect(hydrate({ render: { timeoutMs: Number.NaN } } as never).render.timeoutMs)
      .toBe(DEFAULT_SETTINGS.render.timeoutMs);
  });

  it('holds no field that could carry an API key', () => {
    const settings = hydrate(undefined);
    const keys = [...Object.keys(settings.render), ...Object.keys(settings.rep)].join(' ').toLowerCase();
    expect(keys).not.toContain('key');
    expect(keys).not.toContain('token');
    expect(keys).not.toContain('secret');
  });
});

describe('initials', () => {
  it('takes the first and last name', () => {
    expect(initials('Alex Reyes')).toBe('AR');
    expect(initials('Maria de la Cruz')).toBe('MC');
  });

  it('handles one name, and an unconfigured tablet', () => {
    expect(initials('Alex')).toBe('A');
    expect(initials('   ')).toBe('WD');
  });
});

describe('priceLabel', () => {
  it('reads the way a rep would say it', () => {
    expect(priceLabel(18.4, 'sq ft')).toBe('$18.40 / sq ft');
    expect(priceLabel(3200, undefined)).toBe('$3,200.00');
  });

  it('says nothing when there is no price, rather than showing $0.00', () => {
    expect(priceLabel(undefined, 'sq ft')).toBe('');
    expect(priceLabel(Number.NaN, 'each')).toBe('');
  });
});
