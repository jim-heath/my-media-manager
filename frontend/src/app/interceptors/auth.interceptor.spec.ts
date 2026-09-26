import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getToken',
      'handleSessionExpired',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls handleSessionExpired on a 401 when a token was sent, and rethrows', () => {
    authServiceSpy.getToken.and.returnValue('valid-token');
    let error: any;
    http.get('/api/albums').subscribe({ error: (e) => (error = e) });

    const req = httpMock.expectOne('/api/albums');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-token');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.handleSessionExpired).toHaveBeenCalledTimes(1);
    expect(error).toBeTruthy();
    expect(error.status).toBe(401);
  });

  it('does not call handleSessionExpired on a 500', () => {
    authServiceSpy.getToken.and.returnValue('valid-token');
    let error: any;
    http.get('/api/albums').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne('/api/albums').flush({}, { status: 500, statusText: 'Server Error' });

    expect(authServiceSpy.handleSessionExpired).not.toHaveBeenCalled();
    expect(error.status).toBe(500);
  });

  it('does not call handleSessionExpired on a 401 when no token was sent', () => {
    authServiceSpy.getToken.and.returnValue(null);
    let error: any;
    http.get('/api/albums').subscribe({ error: (e) => (error = e) });

    const req = httpMock.expectOne('/api/albums');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.handleSessionExpired).not.toHaveBeenCalled();
    expect(error.status).toBe(401);
  });
});
