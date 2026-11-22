// Pure, dependency-free validation & sanitization helpers for wishlist input.
// Kept separate from the controller so they can be unit-tested in isolation.

import {
  isValidUpc,
  isValidReleaseDate,
  isValidNameLength,
  SORT_ORDERS
} from '../album/validation';

export const WISHLIST_SORTABLE_FIELDS = ['createdAt', 'artist', 'release_date', 'title'] as const;
export const WISHLIST_SEARCH_FIELDS = ['artist', 'title', 'all'] as const;
export const MAX_URL_LENGTH = 2048;
export const MAX_NOTES_LENGTH = 5000;

/** A URL is valid when absent/empty or an http(s) link within the max length. */
export function isValidUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  const str = String(value).trim();
  if (str === '') return true;
  if (str.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parse and whitelist a sort query param. Field matching is case-insensitive
 * but the canonical casing is returned. Anything invalid falls back to the
 * default (newest first). A secondary sort keeps results stable.
 */
export function parseWishlistSort(sortQuery: unknown): string[] {
  const defaultSort = 'createdAt:desc';

  const raw = String(sortQuery || defaultSort);
  const [rawField, rawOrder] = raw.split(':');

  const field = WISHLIST_SORTABLE_FIELDS.find(
    f => f.toLowerCase() === String(rawField).toLowerCase()
  );
  const order = SORT_ORDERS.includes(String(rawOrder).toLowerCase() as any)
    ? String(rawOrder).toLowerCase()
    : null;

  if (!field || !order) {
    return [defaultSort, 'artist:asc'];
  }

  return [`${field}:${order}`, field === 'artist' ? 'title:asc' : 'artist:asc'];
}

/**
 * Parse and whitelist a search-field query param. Defaults to artist.
 */
export function parseWishlistSearchField(fieldQuery: unknown): string {
  const raw = String(fieldQuery || 'artist').toLowerCase();
  return WISHLIST_SEARCH_FIELDS.includes(raw as any) ? raw : 'artist';
}

export interface WishlistInput {
  artist?: unknown;
  title?: unknown;
  upc?: unknown;
  release_date?: unknown;
  url?: unknown;
  notes?: unknown;
}

/**
 * Validate wishlist input. When `requireArtist` is true (create), artist must
 * be present. Returns the first error message, or null when valid.
 */
export function validateWishlistInput(
  input: WishlistInput,
  { requireArtist }: { requireArtist: boolean }
): string | null {
  const { artist, title, upc, release_date, url, notes } = input;

  if (requireArtist && (!artist || String(artist).trim() === '')) {
    return 'Artist is required';
  }

  if (!isValidNameLength(artist)) {
    return 'Artist must be less than 255 characters';
  }
  if (!isValidNameLength(title)) {
    return 'Title must be less than 255 characters';
  }
  if (!isValidUpc(upc)) {
    return 'UPC must be 12-14 digits';
  }
  if (!isValidReleaseDate(release_date)) {
    return 'Release date must be in YYYY, YYYY-MM, or YYYY-MM-DD format';
  }
  if (!isValidUrl(url)) {
    return 'URL must be a valid http(s) link';
  }
  if (notes !== undefined && notes !== null && String(notes).length > MAX_NOTES_LENGTH) {
    return 'Notes must be less than 5000 characters';
  }

  return null;
}
