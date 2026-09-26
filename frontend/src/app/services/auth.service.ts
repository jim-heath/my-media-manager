import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface AuthResponse {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiBaseUrl;
  private token: string | null = null;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Check for stored token on init
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken && !this.isTokenExpired(storedToken)) {
      this.token = storedToken;
      this.isAuthenticatedSubject.next(true);
    } else if (storedToken) {
      localStorage.removeItem('auth_token');
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const decoded = JSON.parse(atob(padded));
      return decoded.exp != null && decoded.exp * 1000 <= Date.now();
    } catch {
      return false;
    }
  }

  login(identifier: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/api/auth/local`, {
      identifier,
      password
    }).pipe(
      tap(response => {
        this.token = response.jwt;
        localStorage.setItem('auth_token', response.jwt);
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
    this.isAuthenticatedSubject.next(false);
  }

  handleSessionExpired(): void {
    this.logout();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (this.token && this.isTokenExpired(this.token)) {
      this.logout();
      return null;
    }
    return this.token;
  }

  isAuthenticated(): boolean {
    if (this.token && this.isTokenExpired(this.token)) {
      this.logout();
      return false;
    }
    return this.isAuthenticatedSubject.value;
  }
}
