import {
  isValidUrl,
  parseWishlistSort,
  parseWishlistSearchField,
  validateWishlistInput,
  MAX_URL_LENGTH,
} from '../../src/api/wishlist-item/validation';

describe('isValidUrl', () => {
  it('accepts absent/empty values (URL is optional)', () => {
    expect(isValidUrl(undefined)).toBe(true);
    expect(isValidUrl(null)).toBe(true);
    expect(isValidUrl('')).toBe(true);
    expect(isValidUrl('   ')).toBe(true);
  });

  it('accepts http and https links', () => {
    expect(isValidUrl('http://example.com/item')).toBe(true);
    expect(isValidUrl('https://www.discogs.com/release/12345')).toBe(true);
  });

  it('rejects non-http(s) protocols and plain text', () => {
    expect(isValidUrl('ftp://example.com/file')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
  });

  it('rejects URLs longer than the max length', () => {
    expect(isValidUrl('https://example.com/' + 'a'.repeat(MAX_URL_LENGTH))).toBe(false);
  });
});

describe('parseWishlistSort', () => {
  it('defaults to createdAt:desc with artist secondary', () => {
    expect(parseWishlistSort(undefined)).toEqual(['createdAt:desc', 'artist:asc']);
    expect(parseWishlistSort('')).toEqual(['createdAt:desc', 'artist:asc']);
  });

  it('returns canonical field casing for case-insensitive input', () => {
    expect(parseWishlistSort('createdat:asc')).toEqual(['createdAt:asc', 'artist:asc']);
    expect(parseWishlistSort('CREATEDAT:DESC')).toEqual(['createdAt:desc', 'artist:asc']);
  });

  it('falls back to the default for invalid fields or orders', () => {
    expect(parseWishlistSort('upc:asc')).toEqual(['createdAt:desc', 'artist:asc']);
    expect(parseWishlistSort('artist:sideways')).toEqual(['createdAt:desc', 'artist:asc']);
  });

  it('uses title:asc as secondary sort when sorting by artist', () => {
    expect(parseWishlistSort('artist:desc')).toEqual(['artist:desc', 'title:asc']);
    expect(parseWishlistSort('release_date:desc')).toEqual(['release_date:desc', 'artist:asc']);
  });
});

describe('parseWishlistSearchField', () => {
  it('defaults to artist', () => {
    expect(parseWishlistSearchField(undefined)).toBe('artist');
    expect(parseWishlistSearchField('')).toBe('artist');
  });

  it('accepts whitelisted fields case-insensitively', () => {
    expect(parseWishlistSearchField('title')).toBe('title');
    expect(parseWishlistSearchField('ALL')).toBe('all');
  });

  it('falls back to artist for unknown fields', () => {
    expect(parseWishlistSearchField('notes')).toBe('artist');
  });
});

describe('validateWishlistInput', () => {
  it('requires artist only when requireArtist is true', () => {
    expect(validateWishlistInput({}, { requireArtist: true })).toBe('Artist is required');
    expect(validateWishlistInput({ artist: '  ' }, { requireArtist: true })).toBe('Artist is required');
    expect(validateWishlistInput({}, { requireArtist: false })).toBeNull();
  });

  it('checks artist and title length', () => {
    expect(validateWishlistInput({ artist: 'a'.repeat(256) }, { requireArtist: false }))
      .toBe('Artist must be less than 255 characters');
    expect(validateWishlistInput({ artist: 'ok', title: 't'.repeat(256) }, { requireArtist: false }))
      .toBe('Title must be less than 255 characters');
  });

  it('checks UPC format', () => {
    expect(validateWishlistInput({ artist: 'a', upc: '123' }, { requireArtist: true }))
      .toBe('UPC must be 12-14 digits');
  });

  it('checks release date format', () => {
    expect(validateWishlistInput({ artist: 'a', release_date: '12/05/1999' }, { requireArtist: true }))
      .toBe('Release date must be in YYYY, YYYY-MM, or YYYY-MM-DD format');
  });

  it('checks URL format', () => {
    expect(validateWishlistInput({ artist: 'a', url: 'javascript:alert(1)' }, { requireArtist: true }))
      .toBe('URL must be a valid http(s) link');
  });

  it('checks notes length', () => {
    expect(validateWishlistInput({ artist: 'a', notes: 'n'.repeat(5001) }, { requireArtist: true }))
      .toBe('Notes must be less than 5000 characters');
  });

  it('returns null for valid input', () => {
    expect(validateWishlistInput({
      artist: 'Boards of Canada',
      title: 'Music Has the Right to Children',
      upc: '123456789012',
      release_date: '1998-04-20',
      url: 'https://example.com/item',
      notes: 'Warp reissue'
    }, { requireArtist: true })).toBeNull();
  });
});
