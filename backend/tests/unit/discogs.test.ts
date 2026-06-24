import metadataService from '../../src/api/metadata/services/metadata';

const { parseDiscogsReleaseId } = metadataService as any;

describe('parseDiscogsReleaseId', () => {
  it('extracts the id from a full discogs.com release URL', () => {
    expect(
      parseDiscogsReleaseId('https://www.discogs.com/release/249504-Rick-Astley')
    ).toBe('249504');
  });

  it('extracts the id from a /releases/ URL', () => {
    expect(
      parseDiscogsReleaseId('https://api.discogs.com/releases/249504')
    ).toBe('249504');
  });

  it('extracts the id from a [rNNN] reference', () => {
    expect(parseDiscogsReleaseId('[r249504]')).toBe('249504');
    expect(parseDiscogsReleaseId('r249504')).toBe('249504');
  });

  it('accepts a plain numeric id (string or number)', () => {
    expect(parseDiscogsReleaseId('249504')).toBe('249504');
    expect(parseDiscogsReleaseId(249504)).toBe('249504');
  });

  it('falls back to the first run of digits', () => {
    expect(parseDiscogsReleaseId('release-249504-foo')).toBe('249504');
  });

  it('returns null for empty or non-numeric input', () => {
    expect(parseDiscogsReleaseId('')).toBeNull();
    expect(parseDiscogsReleaseId(null)).toBeNull();
    expect(parseDiscogsReleaseId(undefined)).toBeNull();
    expect(parseDiscogsReleaseId('no-digits-here')).toBeNull();
  });

  it('treats 0 as a valid (non-empty) reference', () => {
    expect(parseDiscogsReleaseId(0)).toBe('0');
  });
});
