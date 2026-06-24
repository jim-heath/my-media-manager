import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="container">
      <div class="login-card">
        <h2>Admin Login</h2>
        <p>Sign in to import, export, and manage album metadata.</p>
        
        <div *ngIf="error" class="alert alert-error">{{ error }}</div>
        
        <form (ngSubmit)="login()">
          <div class="form-group">
            <label>Username or Email</label>
            <input 
              type="text" 
              [(ngModel)]="identifier" 
              name="identifier"
              class="form-control"
              required
              [disabled]="loading"
            >
          </div>
          
          <div class="form-group">
            <label>Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="form-control"
              required
              [disabled]="loading"
            >
          </div>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="loading || !identifier || !password"
          >
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
        
        <div style="margin-top: 20px; text-align: center;">
          <a routerLink="/albums">← Back to Albums</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-card {
      max-width: 400px;
      margin: 50px auto;
      padding: 30px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .login-card h2 {
      margin-bottom: 10px;
      text-align: center;
    }
    .login-card p {
      color: #666;
      text-align: center;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    button {
      width: 100%;
    }
  `]
})
export class LoginComponent {
  identifier = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.loading = true;
    this.error = '';
    
    this.authService.login(this.identifier, this.password).subscribe({
      next: () => {
        this.router.navigate(['/albums']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
