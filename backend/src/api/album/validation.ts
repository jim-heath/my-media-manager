// Pure, dependency-free validation & sanitization helpers for album input.
// Kept separate from the controller so they can be unit-tested in isolation.

export const UPC_REGEX = /^\d{12,14}$/;
export const RELEASE_DATE_REGEX = /^\d{4}(-\d{2})?(-\d{2})?$/;
export const MAX_NAME_LENGTH = 255;
export const MBID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DISCOGS_ID_REGEX = /^\d{1,15}$/;
export const MAX_PAGE_SIZE = 100;

export const SORTABLE_FIELDS = ['artist', 'release_date', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

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

/** An mbid is valid when absent/empty or a MusicBrainz UUID. */
export function isValidMbid(mbid: unknown): boolean {
  if (mbid === undefined || mbid === null || mbid === '') return true;
  return MBID_REGEX.test(String(mbid).trim());
}

/** A Discogs release ID is valid when absent/empty or numeric. */
export function isValidDiscogsId(id: unknown): boolean {
  if (id === undefined || id === null || id === '') return true;
  return DISCOGS_ID_REGEX.test(String(id).trim());
}

/**
 * Parse and clamp pagination query params. Non-numeric or out-of-range values
 * fall back to safe defaults (page >= 1, 1 <= pageSize <= MAX_PAGE_SIZE).
 */
export function parsePagination(
  query: { page?: unknown; pageSize?: unknown },
  defaults: { page?: number; pageSize?: number } = {}
): { page: number; pageSize: number } {
  const defaultPage = defaults.page ?? 1;
  const defaultPageSize = defaults.pageSize ?? 20;

  let page = parseInt(String(query.page), 10);
  if (!Number.isFinite(page) || page < 1) page = defaultPage;

  let pageSize = parseInt(String(query.pageSize), 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { page, pageSize };
}

/**
 * Parse and whitelist a sort query param. Only the configured fields and
 * asc/desc directions are allowed; anything else falls back to the default.
 */
export function parseSort(
  sortQuery: unknown,
  defaults: { field?: string; order?: string } = {}
): string[] {
  const defaultField = SORTABLE_FIELDS.includes(String(defaults.field) as any) ? String(defaults.field) : 'artist';
  const defaultOrder = SORT_ORDERS.includes(String(defaults.order) as any) ? String(defaults.order) : 'asc';
  const defaultSort = `${defaultField}:${defaultOrder}`;

  const raw = String(sortQuery || defaultSort).toLowerCase();
  const [field, order] = raw.split(':');

  if (!SORTABLE_FIELDS.includes(field as any) || !SORT_ORDERS.includes(order as any)) {
    return [defaultSort, 'title:asc'];
  }

  return [`${field}:${order}`, 'title:asc'];
}

/**
 * Neutralize spreadsheet formula injection in CSV cells. Values starting with
 * =, +, -, @ (or tab/CR variants) are prefixed with a single quote so Excel
 * and LibreOffice treat them as text.
 */
export function escapeCsvFormula(value: unknown): string {
  const str = String(value ?? '');
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

/**
 * Detect the real image type from magic bytes. Returns 'jpeg', 'png', 'webp'
 * or null when the buffer is not one of the allowed formats.
 */
export function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'png';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  return null;
}

export interface AlbumInput {
  upc?: unknown;
  artist?: unknown;
  title?: unknown;
  release_date?: unknown;
  mbid?: unknown;
  discogs_id?: unknown;
}

/**
 * Validate album input. When `requireNames` is true (create), artist and title
 * must be present. Returns the first error message, or null when valid.
 */
export function validateAlbumInput(
  input: AlbumInput,
  { requireNames }: { requireNames: boolean }
): string | null {
  const { upc, artist, title, release_date, mbid, discogs_id } = input;

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
  if (!isValidMbid(mbid)) {
    return 'MusicBrainz ID must be a valid UUID';
  }
  if (!isValidDiscogsId(discogs_id)) {
    return 'Discogs ID must be numeric';
  }

  return null;
}
