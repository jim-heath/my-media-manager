import { Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlbumService } from '../../services/album.service';
import { AuthService } from '../../services/auth.service';
import { ScrollPositionService } from '../../services/scroll-position.service';
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
        <select
          class="form-control search-field"
          [ngModel]="searchBy"
          (ngModelChange)="setSearchBy($event)"
        >
          <option *ngFor="let option of searchOptions" [value]="option.value">{{ option.label }}</option>
        </select>
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

      <div class="view-controls" *ngIf="!loading">
        <div class="sort-control">
          <label for="sort-by" class="sort-label">Sort</label>
          <select
            id="sort-by"
            class="form-control sort-select"
            [ngModel]="sortBy"
            (ngModelChange)="setSort($event)"
          >
            <option *ngFor="let option of sortOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="split-button" role="group" aria-label="Album view">
          <button
            type="button"
            class="btn"
            [class.active]="viewMode === 'grid'"
            (click)="setView('grid')"
            aria-pressed="viewMode === 'grid'"
          >Grid</button>
          <button
            type="button"
            class="btn"
            [class.active]="viewMode === 'list'"
            (click)="setView('list')"
            aria-pressed="viewMode === 'list'"
          >List</button>
          <button
            type="button"
            class="btn"
            [class.active]="viewMode === 'compact'"
            (click)="setView('compact')"
            aria-pressed="viewMode === 'compact'"
          >Compact</button>
        </div>

      </div>

      <div *ngIf="showingIssues" style="margin-bottom: 15px;">
        <span style="margin-right: 10px; color: #666;">Showing albums with issues</span>
        <button class="btn btn-secondary" (click)="toggleIssues()">Show All Albums</button>
      </div>

      <div *ngIf="loading" class="alert alert-info">Loading albums...</div>
      <div *ngIf="error" class="alert alert-error">{{ error }}</div>

      <ng-container *ngIf="!loading && albums.length > 0" [ngSwitch]="viewMode">
        <!-- Default grid view -->
        <div *ngSwitchCase="'grid'" class="grid">
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

        <!-- List view: one album per row, square cover left, info right -->
        <div *ngSwitchCase="'list'" class="view-list">
          <div
            class="album-list-item"
            *ngFor="let album of albums"
            [routerLink]="['/albums', album.documentId]"
          >
            <div class="list-cover-wrap">
              <img
                *ngIf="album.cover"
                [src]="mediaUrl + (album.cover.formats.thumbnail.url || album.cover.url)"
                class="list-cover"
                [alt]="album.title"
              >
              <div *ngIf="!album.cover" class="list-cover" style="display: flex; align-items: center; justify-content: center; background: #e0e0e0;">
                <span>No Cover</span>
              </div>
            </div>
            <div class="list-info">
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

        <!-- Compact grid view: smaller square covers, more per row -->
        <div *ngSwitchCase="'compact'" class="view-compact">
          <div
            class="compact-card"
            *ngFor="let album of albums"
            [routerLink]="['/albums', album.documentId]"
          >
            <img
              *ngIf="album.cover"
              [src]="mediaUrl + (album.cover.formats.thumbnail.url || album.cover.url)"
              class="compact-cover"
              [alt]="album.title"
            >
            <div *ngIf="!album.cover" class="compact-cover" style="display: flex; align-items: center; justify-content: center; background: #e0e0e0;">
              <span>No Cover</span>
            </div>
            <div class="compact-info">
              <div class="compact-title" [title]="album.title">{{ album.title }}</div>
              <div class="compact-artist">{{ album.artist }}</div>
            </div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="!loading && albums.length === 0" class="alert alert-info">
        No albums found. 
        <a *ngIf="isAuthenticated" routerLink="/add-album">Add some albums</a>
        <span *ngIf="!isAuthenticated">Sign in to import albums.</span>
      </div>

      <div *ngIf="loadingMore" class="alert alert-info">Loading more albums...</div>
      <div #sentinel *ngIf="hasMore" class="sentinel" aria-hidden="true"></div>

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
export class AlbumListComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  albums: Album[] = [];
  loading = false;
  error = '';
  searchQuery = '';
  isAuthenticated = false;
  showingIssues = false;
  viewMode: 'grid' | 'list' | 'compact' = 'grid';
  readonly mediaUrl = environment.apiBaseUrl;

  readonly sortOptions = [
    { value: 'artist:asc', label: 'Artist (A–Z)' },
    { value: 'artist:desc', label: 'Artist (Z–A)' },
    { value: 'release_date:asc', label: 'Year (oldest first)' },
    { value: 'release_date:desc', label: 'Year (newest first)' }
  ];
  sortBy = 'artist:asc';

  readonly searchOptions = [
    { value: 'artist', label: 'Artist' },
    { value: 'title', label: 'Album' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All fields' }
  ];
  searchBy = 'artist';

  currentPage = 1;
  pageSize = 24;
  totalItems = 0;
  totalPages = 0;
  animatedCount = 0;
  private animationFrame: number | null = null;
  loadingMore = false;
  private observer?: IntersectionObserver;
  private observed = false;
  private shouldCheckMore = false;
  restoreScrollY: number | null = null;

  @ViewChild('sentinel', { static: false }) sentinel?: ElementRef;

  get hasMore(): boolean {
    return this.albums.length < this.totalItems;
  }

  constructor(
    private albumService: AlbumService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private scrollService: ScrollPositionService
  ) {
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    this.searchQuery = params['q'] || '';
    this.currentPage = 1;
    this.showingIssues = params['issues'] === 'true';
    const requestedSort = String(params['sort'] || '');
    this.sortBy = this.sortOptions.some(o => o.value === requestedSort) ? requestedSort : 'artist:asc';
    const requestedSearchBy = String(params['searchBy'] || '');
    this.searchBy = this.searchOptions.some(o => o.value === requestedSearchBy) ? requestedSearchBy : 'artist';
    const savedView = localStorage.getItem('albumViewMode') as 'grid' | 'list' | 'compact' | null;
    this.viewMode = savedView && ['grid', 'list', 'compact'].includes(savedView) ? savedView : 'grid';
    this.loadAlbums();
    this.startCounterAnimation();
    this.restoreScrollY = this.scrollService.consume();
  }

  private updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchQuery || null,
        searchBy: this.searchBy !== 'artist' ? this.searchBy : null,
        sort: this.sortBy !== 'artist:asc' ? this.sortBy : null,
        issues: this.showingIssues ? 'true' : null
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.scrollService.save(window.scrollY);
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.observer?.disconnect();
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
    this.currentPage = 1;
    this.albums = [];
    this.loadBatch();
  }

  private loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.currentPage++;
    this.loadBatch();
  }

  private loadBatch(): void {
    if (this.albums.length === 0) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }
    this.error = '';

    const request = this.showingIssues
      ? this.albumService.getIssues(this.currentPage, this.pageSize, this.sortBy)
      : this.albumService.getAlbums(
          this.searchQuery || undefined,
          undefined,
          this.currentPage,
          this.pageSize,
          this.sortBy,
          this.searchBy
        );

    request.subscribe({
      next: (response: AlbumResponse) => {
        const newAlbums = response.data;
        this.albums = this.albums.length === 0 ? newAlbums : [...this.albums, ...newAlbums];
        const pagination = response.meta.pagination;
        const oldTotal = this.totalItems;
        this.totalItems = pagination.total;
        this.totalPages = pagination.pageCount;
        this.loading = false;
        this.loadingMore = false;
        this.shouldCheckMore = true;
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
        this.loadingMore = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && !this.loading && !this.loadingMore && this.hasMore) {
        this.loadMore();
      }
    }, { root: null, rootMargin: '0px 0px 200px 0px', threshold: 0 });
  }

  ngAfterViewChecked(): void {
    if (this.hasMore && this.observer && this.sentinel?.nativeElement && !this.observed) {
      this.observer.observe(this.sentinel.nativeElement);
      this.observed = true;
    }
    if (!this.hasMore && this.observed) {
      this.observer?.disconnect();
      this.observed = false;
    }
    if (this.restoreScrollY !== null && !this.loading && !this.loadingMore) {
      this.tryRestoreScroll();
    }
    if (this.shouldCheckMore) {
      this.shouldCheckMore = false;
      this.checkLoadMore();
    }
  }

  private tryRestoreScroll(): void {
    if (this.restoreScrollY === null || typeof window === 'undefined' || !this.sentinel?.nativeElement) {
      return;
    }
    const docHeight = document.documentElement.scrollHeight;
    const maxY = docHeight - window.innerHeight;
    if (this.restoreScrollY <= maxY || !this.hasMore) {
      window.scrollTo(0, Math.max(0, Math.min(this.restoreScrollY, maxY)));
      this.restoreScrollY = null;
    } else if (this.hasMore) {
      setTimeout(() => this.loadMore(), 0);
    }
  }

  private checkLoadMore(): void {
    if (this.loading || this.loadingMore || !this.hasMore || !this.sentinel?.nativeElement || typeof window === 'undefined') {
      return;
    }
    const rect = this.sentinel.nativeElement.getBoundingClientRect();
    const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top <= viewportBottom) {
      setTimeout(() => this.loadMore(), 0);
    }
  }

  search(): void {
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

  reset(): void {
    this.searchQuery = '';
    this.searchBy = 'artist';
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

  setView(mode: 'grid' | 'list' | 'compact'): void {
    this.viewMode = mode;
    localStorage.setItem('albumViewMode', mode);
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

  setSort(sort: string): void {
    this.sortBy = this.sortOptions.some(o => o.value === sort) ? sort : 'artist:asc';
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

  setSearchBy(searchBy: string): void {
    this.searchBy = this.searchOptions.some(o => o.value === searchBy) ? searchBy : 'artist';
    this.currentPage = 1;
    this.updateUrl();
    this.loadAlbums();
  }

}
