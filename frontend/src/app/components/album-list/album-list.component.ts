import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlbumService } from '../../services/album.service';
import { AuthService } from '../../services/auth.service';
import { Album, AlbumResponse } from '../../models/album.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-album-list',
  template: `
    <div class="card">
      <div class="collection-header">
        <h2>Browse Collection</h2>
        <div class="total-counter">
          <span class="counter-number">{{ animatedCount }}</span>
          <span class="counter-label">titles</span>
        </div>
      </div>
      
      <div class="search-box">
        <input
          type="text"
          class="form-control"
          placeholder="Search albums or artists..."
          [(ngModel)]="searchQuery"
          (keyup.enter)="search()"
        >
        <button class="btn btn-primary" (click)="search()" aria-label="Search">
          <span class="btn-label">Search</span>
          <svg class="btn-ico" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
          </svg>
        </button>
        <button class="btn btn-secondary" (click)="reset()" aria-label="Reset">
          <span class="btn-label">Reset</span>
          <svg class="btn-ico" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
          </svg>
        </button>
      </div>

      <div *ngIf="showingIssues" style="margin-bottom: 15px;">
        <span style="margin-right: 10px; color: #666;">Showing albums with issues</span>
        <button class="btn btn-secondary" (click)="toggleIssues()">Show All Albums</button>
      </div>

      <div *ngIf="loading" class="alert alert-info">Loading albums...</div>
      <div *ngIf="error" class="alert alert-error">{{ error }}</div>

      <div class="grid" *ngIf="!loading && albums.length > 0">
        <div 
          class="album-card" 
          *ngFor="let album of albums"
          [routerLink]="['/albums', album.documentId]"
          style="cursor: pointer;"
        >
          <img 
            *ngIf="album.cover" 
            [src]="mediaUrl + (album.cover.formats.thumbnail.url || album.cover.url)" 
            class="album-cover"
            [alt]="album.title"
          >
          <div *ngIf="!album.cover" class="album-cover" style="display: flex; align-items: center; justify-content: center; background: #e0e0e0;">
            <span>No Cover</span>
          </div>
          
          <div class="album-info">
            <div class="album-title" [title]="album.title">{{ album.title }}</div>
            <div class="album-artist">{{ album.artist }}</div>
            <div class="album-meta">
              <span *ngIf="album.release_date">{{ album.release_date }}</span>
              <span *ngIf="album.tracks"> • {{ album.tracks.length }} tracks</span>
            </div>
            <div style="margin-top: 8px;">
              <span *ngIf="album.metadata_status !== 'completed'" class="badge badge-{{album.metadata_status}}">{{ album.metadata_status }}</span>
              <span *ngIf="album.issues?.includes('missing_cover')" class="badge badge-missing-cover">missing cover</span>
              <span *ngIf="album.issues?.includes('metadata_error')" class="badge badge-metadata-error" [title]="album.fetch_error || ''">metadata error</span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && albums.length === 0" class="alert alert-info">
        No albums found. 
        <a *ngIf="isAuthenticated" routerLink="/add-album">Add some albums</a>
        <span *ngIf="!isAuthenticated">Sign in to import albums.</span>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button
          (click)="changePage(currentPage - 1)"
          [disabled]="currentPage === 1"
        >Previous</button>

        <ng-container *ngFor="let item of visiblePages">
          <span *ngIf="item === '...'" style="padding: 8px 12px; color: #666;">...</span>
          <button
            *ngIf="item !== '...'"
            (click)="changePage(+item)"
            [class.active]="currentPage === +item"
          >{{ item }}</button>
        </ng-container>

        <button
          (click)="changePage(currentPage + 1)"
          [disabled]="currentPage === totalPages"
        >Next</button>
      </div>

      <div style="text-align: center; margin-top: 10px; color: #666;">
        Showing {{ albums.length }} of {{ totalItems }} albums
      </div>
    </div>
  `,
  styles: [`
    .search-box .btn-ico {
      display: none;
      width: 1.2em;
      height: 1.2em;
      fill: currentColor;
      vertical-align: middle;
    }
    @media (max-width: 768px) {
      .search-box .btn-label {
        display: none;
      }
      .search-box .btn-ico {
        display: inline-block;
      }
    }
  `]
})
export class AlbumListComponent implements OnInit, OnDestroy {
  albums: Album[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  isAuthenticated = false;
  showingIssues = false;
  readonly mediaUrl = environment.apiBaseUrl;

  currentPage = 1;
  pageSize = 21;  // Multiple of 3 for clean grid rows
  totalItems = 0;
  totalPages = 0;
  animatedCount = 0;
  private animationFrame: number | null = null;

  // Smart pagination: show first, last, current neighborhood, and ellipsis
  get visiblePages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2; // pages to show on each side of current

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  }

  constructor(
    private albumService: AlbumService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    this.searchQuery = params['q'] || '';
    this.currentPage = parseInt(params['page'], 10) || 1;
    this.showingIssues = params['issues'] === 'true';
    this.loadAlbums();
    this.startCounterAnimation();
  }

  private updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchQuery || null,
        page: this.currentPage > 1 ? this.currentPage.toString() : null,
        issues: this.showingIssues ? 'true' : null
      }
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private startCounterAnimation(): void {
    // Cancel any in-flight animation so loops don't overlap and fight over animatedCount
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    const startValue = this.animatedCount;
    // Scale duration to how far we have to count: smaller numbers finish quicker.
    // ~12ms per unit, clamped between 300ms and 2000ms.
    const distance = Math.abs(this.totalItems - startValue);
    const duration = Math.min(2000, Math.max(300, distance * 12));
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: starts fast, slows down at the end
      // Using easeOutQuart: 1 - (1 - t)^4
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      this.animatedCount = Math.floor(startValue + (this.totalItems - startValue) * easedProgress);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animatedCount = this.totalItems; // Ensure final value is exact
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  loadAlbums(): void {
    this.loading = true;
    this.error = '';

    const request = this.showingIssues
      ? this.albumService.getIssues(this.currentPage, this.pageSize)
      : this.albumService.getAlbums(
          this.searchQuery || undefined,
          undefined,
          this.currentPage,
          this.pageSize
        );

    request.subscribe({
      next: (response: AlbumResponse) => {
        this.albums = response.data;
        const pagination = response.meta.pagination;
        const oldTotal = this.totalItems;
        this.totalItems = pagination.total;
        this.totalPages = pagination.pageCount;
        this.loading = false;
        // Keep the counter in sync with the latest total. Animate larger changes
        // for a nice effect; snap small ones so it never shows a stale value.
        if (this.totalItems !== oldTotal) {
          if (Math.abs(this.totalItems - oldTotal) > 5) {
            this.startCounterAnimation();
          } else {
            this.animatedCount = this.totalItems;
          }
        }
      },
      error: (err) => {
        this.error = 'Failed to load albums: ' + err.message;
        this.loading = false;
      }
    });
  }

  search(): void {
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

  reset(): void {
    this.searchQuery = '';
    this.showingIssues = false;
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

  toggleIssues(): void {
    this.showingIssues = !this.showingIssues;
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateUrl();
      this.loadAlbums();
    }
  }
}
