import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AlbumService } from './album.service';
import { environment } from '../../environments/environment';

describe('AlbumService', () => {
  let service: AlbumService;
  let httpMock: HttpTestingController;

  const base = `${environment.apiBaseUrl}/api/albums`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AlbumService],
    });
    service = TestBed.inject(AlbumService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAlbums hits /search with pagination and optional query params', () => {
    service.getAlbums('beatles', 'The Beatles', 2, 50).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/search`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('50');
    expect(req.request.params.get('q')).toBe('beatles');
    expect(req.request.params.get('artist')).toBe('The Beatles');
    req.flush({ data: [], meta: {} });
  });

  it('getAlbums omits q/artist when not provided', () => {
    service.getAlbums().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/search`);
    expect(req.request.params.get('q')).toBeNull();
    expect(req.request.params.get('artist')).toBeNull();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    req.flush({ data: [], meta: {} });
  });

  it('getIssues hits /issues', () => {
    service.getIssues().subscribe();
    const req = httpMock.expectOne((r) => r.url === `${base}/issues`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: {} });
  });

  it('getAlbum requests a single album by documentId', () => {
    service.getAlbum('abc123').subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: {} as any });
  });

  it('getRecentlyAdded sorts by createdAt desc and populates cover', () => {
    service.getRecentlyAdded(5).subscribe();
    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.params.get('sort')).toBe('createdAt:desc');
    expect(req.request.params.get('pagination[pageSize]')).toBe('5');
    expect(req.request.params.get('populate')).toBe('cover');
    req.flush({ data: [], meta: {} });
  });

  it('createAlbum POSTs to the collection endpoint', () => {
    const album = { artist: 'A', title: 'B' };
    service.createAlbum(album).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(album);
    req.flush({ data: {} as any });
  });

  it('updateAlbum PUTs to the album endpoint', () => {
    service.updateAlbum('abc123', { title: 'New' }).subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'New' });
    req.flush({ data: {} as any });
  });

  it('deleteAlbum DELETEs the album endpoint', () => {
    service.deleteAlbum('abc123').subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'deleted' });
  });

  it('importCsv POSTs multipart form data to /import', () => {
    const file = new File(['upc,artist,title'], 'albums.csv', {
      type: 'text/csv',
    });
    service.importCsv(file).subscribe();
    const req = httpMock.expectOne(`${base}/import`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ imported: 0, failed: 0, errors: [] });
  });

  it('exportCsv requests a blob from /export/csv', () => {
    service.exportCsv().subscribe();
    const req = httpMock.expectOne(`${base}/export/csv`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('saveTracks PUTs the tracklist to /:id/tracks', () => {
    const tracks = [{ track_number: 1, title: 'Track 1', length: 200 }];
    service.saveTracks('abc123', tracks).subscribe();
    const req = httpMock.expectOne(`${base}/abc123/tracks`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ tracks });
    req.flush({ data: {} as any });
  });

  it('fetchCovers POSTs to /fetch-covers', () => {
    service.fetchCovers().subscribe();
    const req = httpMock.expectOne(`${base}/fetch-covers`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: '', missingCount: 0, note: '' });
  });
});
