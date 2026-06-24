// Pure, dependency-free validation & sanitization helpers for album input.
// Kept separate from the controller so they can be unit-tested in isolation.

export const UPC_REGEX = /^\d{12,14}$/;
export const RELEASE_DATE_REGEX = /^\d{4}(-\d{2})?(-\d{2})?$/;
export const MAX_NAME_LENGTH = 255;

/** Strip angle brackets (basic XSS guard) and trim surrounding whitespace. */
export function sanitizeText(value: unknown): string {
  return String(value ?? '').replace(/[<>]/g, '').trim();
}

/** A UPC is valid when absent/empty or made of 12-14 digits. */
export function isValidUpc(upc: unknown): boolean {
  if (upc === undefined || upc === null || upc === '') return true;
  return UPC_REGEX.test(String(upc));
}

/** A release date is valid when absent/empty or matches YYYY, YYYY-MM, YYYY-MM-DD. */
export function isValidReleaseDate(date: unknown): boolean {
  if (date === undefined || date === null || date === '') return true;
  return RELEASE_DATE_REGEX.test(String(date));
}

/** A name (artist/title) is valid when within the max length. */
export function isValidNameLength(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return String(value).length <= MAX_NAME_LENGTH;
}

export interface AlbumInput {
  upc?: unknown;
  artist?: unknown;
  title?: unknown;
  release_date?: unknown;
}

/**
 * Validate album input. When `requireNames` is true (create), artist and title
 * must be present. Returns the first error message, or null when valid.
 */
export function validateAlbumInput(
  input: AlbumInput,
  { requireNames }: { requireNames: boolean }
): string | null {
  const { upc, artist, title, release_date } = input;

  if (requireNames) {
    if (!artist || !title) {
      return 'Artist and title are required';
    }
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

  return null;
}
