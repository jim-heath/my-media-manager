import {
  sanitizeText,
  isValidUpc,
  isValidReleaseDate,
  isValidNameLength,
  isValidMbid,
  isValidDiscogsId,
  parsePagination,
  buildYearFilter,
  escapeCsvFormula,
  detectImageType,
  validateAlbumInput,
  MAX_NAME_LENGTH,
  MAX_PAGE_SIZE,
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

    it('rejects a malformed mbid', () => {
      expect(validateAlbumInput({ mbid: '../../../evil' }, opts)).toBe(
        'MusicBrainz ID must be a valid UUID'
      );
    });

    it('rejects a non-numeric discogs_id', () => {
      expect(validateAlbumInput({ discogs_id: '123/../abc' }, opts)).toBe(
        'Discogs ID must be numeric'
      );
    });
  });
});

describe('isValidMbid', () => {
  it('accepts absent/empty values', () => {
    expect(isValidMbid(undefined)).toBe(true);
    expect(isValidMbid(null)).toBe(true);
    expect(isValidMbid('')).toBe(true);
  });

  it('accepts a valid MusicBrainz UUID', () => {
    expect(isValidMbid('f5093c06-23e3-404f-aeaa-40f72885ee3a')).toBe(true);
    expect(isValidMbid('F5093C06-23E3-404F-AEAA-40F72885EE3A')).toBe(true);
  });

  it('rejects path-injection attempts', () => {
    expect(isValidMbid('../../recording/x')).toBe(false);
    expect(isValidMbid('abc?query=1')).toBe(false);
    expect(isValidMbid('not-a-uuid')).toBe(false);
  });
});

describe('isValidDiscogsId', () => {
  it('accepts absent/empty values', () => {
    expect(isValidDiscogsId(undefined)).toBe(true);
    expect(isValidDiscogsId(null)).toBe(true);
    expect(isValidDiscogsId('')).toBe(true);
  });

  it('accepts numeric IDs (string or number)', () => {
    expect(isValidDiscogsId('249504')).toBe(true);
    expect(isValidDiscogsId(249504)).toBe(true);
  });

  it('rejects non-numeric or path-like values', () => {
    expect(isValidDiscogsId('249504/../users')).toBe(false);
    expect(isValidDiscogsId('abc')).toBe(false);
  });
});

describe('parsePagination', () => {
  it('returns defaults when params are missing', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('parses valid values', () => {
    expect(parsePagination({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 });
  });

  it('clamps pageSize to MAX_PAGE_SIZE', () => {
    expect(parsePagination({ pageSize: '1000000' }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('falls back on non-numeric or negative input', () => {
    expect(parsePagination({ page: 'abc', pageSize: '-5' })).toEqual({ page: 1, pageSize: 20 });
    expect(parsePagination({ page: '0', pageSize: 'NaN' })).toEqual({ page: 1, pageSize: 20 });
  });
});

describe('buildYearFilter', () => {
  it('turns a single year into a half-open range', () => {
    expect(buildYearFilter('1999')).toEqual({ $gte: '1999', $lt: '2000' });
  });

  it('matches YYYY-MM and YYYY-MM-DD values within the year', () => {
    const filter = buildYearFilter('1999')!;
    for (const value of ['1999', '1999-05', '1999-05-21', '1999-12-31']) {
      expect(value >= filter.$gte).toBe(true);
      expect(value < filter.$lt).toBe(true);
    }
  });

  it('excludes dates outside the requested year', () => {
    const filter = buildYearFilter('1999')!;
    expect('1998-12-31' >= filter.$gte).toBe(false);
    expect('2000-01-01' < filter.$lt).toBe(false);
  });

  it('supports an inclusive year range', () => {
    expect(buildYearFilter('1990-1999')).toEqual({ $gte: '1990', $lt: '2000' });
  });

  it('normalizes a reversed range', () => {
    expect(buildYearFilter('1999-1990')).toEqual({ $gte: '1990', $lt: '2000' });
  });

  it('tolerates spaces around the range separator', () => {
    expect(buildYearFilter(' 1990 - 1999 ')).toEqual({ $gte: '1990', $lt: '2000' });
  });

  it('omits the upper bound at the 4-digit ceiling', () => {
    expect(buildYearFilter('9999')).toEqual({ $gte: '9999' });
  });

  it('returns null for partial years and non-year queries', () => {
    expect(buildYearFilter('19')).toBeNull();
    expect(buildYearFilter('199')).toBeNull();
    expect(buildYearFilter('19999')).toBeNull();
    expect(buildYearFilter('1999-05')).toBeNull();
    expect(buildYearFilter('nineties')).toBeNull();
    expect(buildYearFilter('')).toBeNull();
    expect(buildYearFilter(null)).toBeNull();
    expect(buildYearFilter(undefined)).toBeNull();
  });
});

describe('escapeCsvFormula', () => {
  it('prefixes formula-leading characters with a quote', () => {
    expect(escapeCsvFormula('=cmd|calc')).toBe("'=cmd|calc");
    expect(escapeCsvFormula('+1+1')).toBe("'+1+1");
    expect(escapeCsvFormula('-1')).toBe("'-1");
    expect(escapeCsvFormula('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('leaves normal values untouched', () => {
    expect(escapeCsvFormula('Abbey Road')).toBe('Abbey Road');
    expect(escapeCsvFormula('123456789012')).toBe('123456789012');
  });

  it('coerces null/undefined to an empty string', () => {
    expect(escapeCsvFormula(null)).toBe('');
    expect(escapeCsvFormula(undefined)).toBe('');
  });
});

describe('detectImageType', () => {
  const pad = (bytes: number[]) => Buffer.from([...bytes, ...Array(Math.max(0, 12 - bytes.length)).fill(0)]);

  it('detects JPEG magic bytes', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
  });

  it('detects PNG magic bytes', () => {
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
  });

  it('detects WebP magic bytes', () => {
    const buf = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
    expect(detectImageType(buf)).toBe('webp');
  });

  it('rejects non-image content regardless of claimed MIME type', () => {
    expect(detectImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
    expect(detectImageType(Buffer.from('<script>x</script>'))).toBeNull();
  });

  it('rejects buffers that are too short', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
