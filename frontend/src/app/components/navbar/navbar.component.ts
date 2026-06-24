import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  template: `
    <nav class="navbar">
      <div class="container">
        <h1>
          <a routerLink="/albums">
            <svg class="brand-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M480-316q70 0 120-47.5T650-480q0-71-49.5-120.5T480-650q-69 0-116.5 50T316-480q0 69 47.5 116.5T480-316Zm-28.5-135.5Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"/>
            </svg>
            <span>My Media Manager</span>
          </a>
        </h1>
        <button
          class="menu-toggle"
          type="button"
          (click)="toggleMenu()"
          [attr.aria-expanded]="menuOpen"
          aria-label="Toggle navigation menu"
        >&#9776;</button>
        <nav class="nav-links" [class.open]="menuOpen">
          <a routerLink="/albums" routerLinkActive="active" (click)="closeMenu()">Browse</a>
          <a *ngIf="isAuthenticated" routerLink="/add-album" routerLinkActive="active" (click)="closeMenu()">Add Albums</a>
          <a *ngIf="isAuthenticated" routerLink="/advanced" routerLinkActive="active" (click)="closeMenu()">Advanced</a>
          <a *ngIf="!isAuthenticated" routerLink="/login" (click)="closeMenu()">Login</a>
          <a *ngIf="isAuthenticated" href="#" (click)="logout($event)">Logout</a>
        </nav>
      </div>
    </nav>
  `,
  styles: [`
    .navbar h1 a {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .navbar h1 .brand-icon {
      width: 1.4em;
      height: 1.4em;
      fill: currentColor;
      flex-shrink: 0;
    }
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      color: white;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
    }
    @media (max-width: 768px) {
      .menu-toggle {
        display: block;
      }
      .nav-links {
        display: none;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        margin-top: 10px;
      }
      .nav-links.open {
        display: flex;
      }
      .navbar .container {
        flex-wrap: wrap;
      }
      .navbar .nav-links a {
        margin-left: 0;
        width: 100%;
      }
    }
  `]
})
export class NavbarComponent {
  isAuthenticated = false;
  menuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(event: Event): void {
    event.preventDefault();
    this.closeMenu();
    this.authService.logout();
    this.router.navigate(['/albums']);
  }
}
