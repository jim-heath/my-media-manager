import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { WishlistService } from './wishlist.service';
import { environment } from '../../environments/environment';

describe('WishlistService', () => {
  let service: WishlistService;
  let httpMock: HttpTestingController;

  const base = `${environment.apiBaseUrl}/api/wishlist-items`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WishlistService],
    });
    service = TestBed.inject(WishlistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getItems hits /search with pagination and optional query params', () => {
    service.getItems('aphex', 2, 50, 'artist:asc', 'title').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/search`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('50');
    expect(req.request.params.get('q')).toBe('aphex');
    expect(req.request.params.get('sort')).toBe('artist:asc');
    expect(req.request.params.get('searchBy')).toBe('title');
    req.flush({ data: [], meta: {} });
  });

  it('getItems omits optional params when not provided', () => {
    service.getItems().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/search`);
    expect(req.request.params.get('q')).toBeNull();
    expect(req.request.params.get('sort')).toBeNull();
    expect(req.request.params.get('searchBy')).toBeNull();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('24');
    req.flush({ data: [], meta: {} });
  });

  it('getItem requests a single item by documentId', () => {
    service.getItem('abc123').subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: {} as any });
  });

  it('createItem POSTs to the collection endpoint', () => {
    const item = { artist: 'A', title: 'B' };
    service.createItem(item).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(item);
    req.flush({ data: {} as any });
  });

  it('updateItem PUTs to the item endpoint', () => {
    service.updateItem('abc123', { title: 'New' }).subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ title: 'New' });
    req.flush({ data: {} as any });
  });

  it('purchase POSTs to /:id/purchase with the album details', () => {
    const input = { artist: 'A', title: 'B', upc: '123456789012' };
    service.purchase('abc123', input).subscribe();
    const req = httpMock.expectOne(`${base}/abc123/purchase`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ data: {} as any });
  });

  it('uploadCover POSTs multipart form data to /:id/cover', () => {
    const file = new File(['img'], 'cover.jpg', { type: 'image/jpeg' });
    service.uploadCover('abc123', file).subscribe();
    const req = httpMock.expectOne(`${base}/abc123/cover`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ data: {} as any });
  });

  it('deleteItem DELETEs the item endpoint', () => {
    service.deleteItem('abc123').subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'deleted' });
  });
});
