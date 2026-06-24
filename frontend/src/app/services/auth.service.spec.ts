import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const loginUrl = `${environment.apiBaseUrl}/api/auth/local`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts unauthenticated when no token is stored', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('logs in, stores the token and flips the auth state', () => {
    const states: boolean[] = [];
    service.isAuthenticated$.subscribe((s) => states.push(s));

    service.login('user@example.com', 'secret').subscribe();

    const req = httpMock.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      identifier: 'user@example.com',
      password: 'secret',
    });

    req.flush({
      jwt: 'jwt-token-123',
      user: { id: 1, username: 'user', email: 'user@example.com' },
    });

    expect(service.getToken()).toBe('jwt-token-123');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('auth_token')).toBe('jwt-token-123');
    expect(states).toEqual([false, true]);
  });

  it('logout clears the token and auth state', () => {
    service.login('user@example.com', 'secret').subscribe();
    httpMock.expectOne(loginUrl).flush({
      jwt: 'jwt-token-123',
      user: { id: 1, username: 'user', email: 'user@example.com' },
    });

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('restores an existing token from localStorage on construction', () => {
    localStorage.setItem('auth_token', 'persisted-token');

    // Re-create the service so its constructor reads localStorage.
    const restored = new AuthService({} as any);

    expect(restored.getToken()).toBe('persisted-token');
    expect(restored.isAuthenticated()).toBe(true);
  });
});
