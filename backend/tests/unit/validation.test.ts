import {
  sanitizeText,
  isValidUpc,
  isValidReleaseDate,
  isValidNameLength,
  validateAlbumInput,
  MAX_NAME_LENGTH,
} from '../../src/api/album/validation';

describe('sanitizeText', () => {
  it('strips angle brackets to prevent basic XSS', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  The Beatles  ')).toBe('The Beatles');
  });

  it('coerces null/undefined to an empty string', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('leaves clean values untouched', () => {
    expect(sanitizeText('Abbey Road')).toBe('Abbey Road');
  });
});

describe('isValidUpc', () => {
  it('accepts absent/empty values (UPC is optional)', () => {
    expect(isValidUpc(undefined)).toBe(true);
    expect(isValidUpc(null)).toBe(true);
    expect(isValidUpc('')).toBe(true);
  });

  it('accepts 12-14 digit codes', () => {
    expect(isValidUpc('123456789012')).toBe(true);
    expect(isValidUpc('1234567890123')).toBe(true);
    expect(isValidUpc('12345678901234')).toBe(true);
  });

  it('rejects too-short, too-long, or non-numeric codes', () => {
    expect(isValidUpc('12345678901')).toBe(false);
    expect(isValidUpc('123456789012345')).toBe(false);
    expect(isValidUpc('12345abc9012')).toBe(false);
  });
});

describe('isValidReleaseDate', () => {
  it('accepts absent/empty values', () => {
    expect(isValidReleaseDate(undefined)).toBe(true);
    expect(isValidReleaseDate('')).toBe(true);
  });

  it('accepts YYYY, YYYY-MM and YYYY-MM-DD', () => {
    expect(isValidReleaseDate('1969')).toBe(true);
    expect(isValidReleaseDate('1969-09')).toBe(true);
    expect(isValidReleaseDate('1969-09-26')).toBe(true);
  });

  it('rejects malformed dates', () => {
    expect(isValidReleaseDate('69')).toBe(false);
    expect(isValidReleaseDate('1969/09/26')).toBe(false);
    expect(isValidReleaseDate('September 1969')).toBe(false);
  });
});

describe('isValidNameLength', () => {
  it('accepts values within the max length', () => {
    expect(isValidNameLength('A'.repeat(MAX_NAME_LENGTH))).toBe(true);
  });

  it('rejects values over the max length', () => {
    expect(isValidNameLength('A'.repeat(MAX_NAME_LENGTH + 1))).toBe(false);
  });

  it('treats undefined as valid (field not provided)', () => {
    expect(isValidNameLength(undefined)).toBe(true);
  });
});

describe('validateAlbumInput', () => {
  describe('create (requireNames: true)', () => {
    const opts = { requireNames: true };

    it('passes with valid required fields', () => {
      expect(
        validateAlbumInput({ artist: 'The Beatles', title: 'Abbey Road' }, opts)
      ).toBeNull();
    });

    it('requires artist and title', () => {
      expect(validateAlbumInput({ title: 'Abbey Road' }, opts)).toBe(
        'Artist and title are required'
      );
      expect(validateAlbumInput({ artist: 'The Beatles' }, opts)).toBe(
        'Artist and title are required'
      );
    });

    it('rejects an invalid UPC', () => {
      expect(
        validateAlbumInput(
          { artist: 'A', title: 'B', upc: 'not-a-upc' },
          opts
        )
      ).toBe('UPC must be 12-14 digits');
    });

    it('rejects an invalid release date', () => {
      expect(
        validateAlbumInput(
          { artist: 'A', title: 'B', release_date: '26-09-1969' },
          opts
        )
      ).toBe('Release date must be in YYYY, YYYY-MM, or YYYY-MM-DD format');
    });

    it('rejects an over-long artist', () => {
      expect(
        validateAlbumInput(
          { artist: 'A'.repeat(256), title: 'B' },
          opts
        )
      ).toBe('Artist must be less than 255 characters');
    });
  });

  describe('update (requireNames: false)', () => {
    const opts = { requireNames: false };

    it('allows omitting artist and title', () => {
      expect(validateAlbumInput({ release_date: '2001' }, opts)).toBeNull();
    });

    it('still validates provided fields', () => {
      expect(validateAlbumInput({ upc: 'abc' }, opts)).toBe(
        'UPC must be 12-14 digits'
      );
    });
  });
});
