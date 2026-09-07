// Pure helpers for Mona's Bookmark Manager.
//
// These functions have no dependency on the DOM or browser storage APIs so
// they can be unit tested directly (see src/lib/bookmarks.test.ts) and are
// safe to import from the client-side <script> in Bookmarks.astro.

export interface Bookmark {
  url: string;
  slug: string;
}

/** localStorage key that holds the saved bookmarks array. */
export const STORAGE_KEY = 'mona-bookmarks';

/** Visible separator rendered between a bookmark's URL and its slug. */
export const SEPARATOR = ' :: ';

const BASE62_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const SLUG_PREFIX = 'mona-';
const SLUG_BODY_LENGTH = 4;

/**
 * Normalises a user-typed URL so that equivalent inputs (with or without a
 * scheme) resolve to the same saved value. Accepts bare hosts like
 * "example.com" and defaults them to "https://".
 */
export function normalizeUrl(input: string): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '';

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    let result = parsed.toString();
    // Drop the bare trailing slash URL() adds for path-less URLs so
    // "example.com" and "https://example.com" both normalise identically
    // and render without a stray trailing slash.
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      result = result.replace(/\/$/, '');
    }
    return result;
  } catch {
    // Not a parseable URL (e.g. empty host) — fall back to the raw,
    // scheme-prefixed input rather than throwing.
    return withScheme;
  }
}

/** Encodes a non-negative integer as a base62 string. */
export function toBase62(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return BASE62_CHARS[0];
  let value = Math.floor(num);
  let result = '';
  while (value > 0) {
    result = BASE62_CHARS[value % 62] + result;
    value = Math.floor(value / 62);
  }
  return result;
}

/**
 * Generates a short "mona-" prefixed base62 slug that isn't already present
 * in `existingSlugs`. `randomFn` is injectable for deterministic tests.
 */
export function generateSlug(
  existingSlugs: ReadonlySet<string> = new Set(),
  randomFn: () => number = Math.random,
): string {
  const space = 62 ** SLUG_BODY_LENGTH;
  let slug: string;
  do {
    const num = Math.floor(randomFn() * space);
    slug = SLUG_PREFIX + toBase62(num).padStart(SLUG_BODY_LENGTH, BASE62_CHARS[0]);
  } while (existingSlugs.has(slug));
  return slug;
}

/** Formats a bookmark for display, e.g. "https://example.com :: mona-7fk2". */
export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url}${SEPARATOR}${bookmark.slug}`;
}

function isValidBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === 'string' &&
    candidate.url.trim().length > 0 &&
    typeof candidate.slug === 'string' &&
    candidate.slug.trim().length > 0
  );
}

/**
 * Parses a raw string read from localStorage into a trusted array of
 * bookmarks. Never throws: empty, corrupted, legacy (non-array), or
 * partially malformed values are dropped/filtered instead of propagating.
 */
export function parseBookmarks(raw: string | null | undefined): Bookmark[] {
  if (!raw) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];

  return data.filter(isValidBookmark).map(({ url, slug }) => ({ url, slug }));
}

/** Serialises bookmarks for storage. */
export function serializeBookmarks(bookmarks: readonly Bookmark[]): string {
  return JSON.stringify(bookmarks);
}
