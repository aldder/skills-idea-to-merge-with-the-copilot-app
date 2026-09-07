import { describe, expect, it } from 'vitest';
import {
  formatBookmark,
  generateSlug,
  normalizeUrl,
  parseBookmarks,
  SEPARATOR,
} from './bookmarks';

describe('normalizeUrl', () => {
  it('normalises a URL without a scheme the same as one with https://', () => {
    expect(normalizeUrl('www.example.com')).toBe(normalizeUrl('https://www.example.com'));
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('trims whitespace before normalising', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });

  it('preserves an existing non-https scheme', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns an empty string for empty input instead of throwing', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('parseBookmarks', () => {
  it('recovers an empty stored value as an empty array', () => {
    expect(parseBookmarks(null)).toEqual([]);
    expect(parseBookmarks('')).toEqual([]);
  });

  it('recovers corrupted JSON as an empty array instead of throwing', () => {
    expect(() => parseBookmarks('{not valid json')).not.toThrow();
    expect(parseBookmarks('{not valid json')).toEqual([]);
  });

  it('recovers a legacy/non-array stored value as an empty array', () => {
    expect(parseBookmarks('{"url":"https://example.com","slug":"mona-7fk2"}')).toEqual([]);
    expect(parseBookmarks('"just a string"')).toEqual([]);
    expect(parseBookmarks('42')).toEqual([]);
  });

  it('drops malformed entries while keeping valid ones', () => {
    const raw = JSON.stringify([
      { url: 'https://example.com', slug: 'mona-7fk2' },
      { url: 'https://missing-slug.com' },
      { slug: 'mona-abcd' },
      null,
      'not-an-object',
      42,
      { url: '', slug: 'mona-blank-url' },
      { url: 'https://valid.com', slug: '' },
    ]);
    expect(parseBookmarks(raw)).toEqual([{ url: 'https://example.com', slug: 'mona-7fk2' }]);
  });
});

describe('formatBookmark', () => {
  it('formats using the exact " :: " separator', () => {
    expect(SEPARATOR).toBe(' :: ');
    expect(formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' })).toBe(
      'https://www.example.com :: mona-7fk2',
    );
  });
});

describe('generateSlug', () => {
  it('always uses the mona- prefix', () => {
    expect(generateSlug()).toMatch(/^mona-[A-Za-z0-9]+$/);
  });

  it('avoids collisions with existing slugs', () => {
    const existing = new Set(['mona-AAAA']);
    let calls = 0;
    const randomFn = () => {
      calls += 1;
      // First call would collide with "mona-AAAA" (num=0), second call
      // produces something else.
      return calls === 1 ? 0 : 0.5;
    };
    const slug = generateSlug(existing, randomFn);
    expect(slug).not.toBe('mona-AAAA');
    expect(calls).toBeGreaterThan(1);
  });
});
