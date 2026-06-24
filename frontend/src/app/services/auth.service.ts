import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  constructor(private http: HttpClient) {
    // Check for stored token on init
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      this.token = storedToken;
      this.isAuthenticatedSubject.next(true);
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

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}
