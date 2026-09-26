import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

function makeJwt(exp: number): string {
  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ exp })}.sig`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const loginUrl = `${environment.apiBaseUrl}/api/auth/local`;

  beforeEach(() => {
    localStorage.clear();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: Router, useValue: routerSpy }],
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
    const restored = new AuthService({} as any, {} as any);

    expect(restored.getToken()).toBe('persisted-token');
    expect(restored.isAuthenticated()).toBe(true);
  });

  it('discards an expired stored token on construction', () => {
    const expiredJwt = makeJwt(Math.floor(Date.now() / 1000) - 60);
    localStorage.setItem('auth_token', expiredJwt);

    const restored = new AuthService({} as any, {} as any);

    expect(restored.isAuthenticated()).toBe(false);
    expect(restored.getToken()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('restores a non-expired stored token on construction', () => {
    const validJwt = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('auth_token', validJwt);

    const restored = new AuthService({} as any, {} as any);

    expect(restored.getToken()).toBe(validJwt);
    expect(restored.isAuthenticated()).toBe(true);
  });

  it('handleSessionExpired clears the token and navigates to /login', () => {
    localStorage.setItem('auth_token', 'persisted-token');
    const restored = new AuthService({} as any, routerSpy);

    restored.handleSessionExpired();

    expect(restored.getToken()).toBeNull();
    expect(restored.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
