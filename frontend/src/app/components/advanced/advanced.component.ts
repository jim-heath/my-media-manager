import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlbumService } from '../../services/album.service';
import { Album, AlbumResponse } from '../../models/album.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-advanced',
  template: `
    <div class="card">
      <h2>Advanced</h2>
      <p style="color: #666; margin-bottom: 20px;">
        Collection-wide tools for managing metadata and exports.
      </p>

      <div *ngIf="message" class="alert alert-success">{{ message }}</div>
      <div *ngIf="error" class="alert alert-error">{{ error }}</div>

      <div class="advanced-section">
        <h3>Issues</h3>
        <p class="advanced-desc">Review albums with missing covers, failed metadata, or invalid years.</p>
        <button class="btn btn-warning" (click)="showIssues()">
          Show Issues ({{ issueCount }})
        </button>
      </div>

      <div class="advanced-section">
        <h3>Export</h3>
        <p class="advanced-desc">Download your collection.</p>
        <div class="section-actions">
          <button class="btn btn-success" (click)="exportCsv()">Export CSV</button>
          <button class="btn btn-success" (click)="exportJson()">Export JSON</button>
        </div>
      </div>

      <div class="advanced-section">
        <h3>Metadata</h3>
        <p class="advanced-desc">Run background jobs to enrich the collection.</p>
        <div class="section-actions">
          <button class="btn btn-warning" (click)="enrichPending()">Process Pending</button>
          <button class="btn btn-primary" (click)="fetchCovers()">Fetch Missing Covers</button>
        </div>
      </div>

      <div class="advanced-section">
        <h3>Recently Added</h3>
        <p class="advanced-desc">The latest titles added to your collection.</p>

        <div *ngIf="recentLoading" class="advanced-desc">Loading...</div>
        <p *ngIf="!recentLoading && recentAlbums.length === 0" class="advanced-desc">No albums added yet.</p>

        <ul *ngIf="!recentLoading && recentAlbums.length > 0" class="recent-list">
          <li *ngFor="let album of recentAlbums">
            <a [routerLink]="['/albums', album.documentId]" class="recent-item">
              <img
                *ngIf="album.cover"
                [src]="mediaUrl + (album.cover.formats.thumbnail.url || album.cover.url)"
                class="recent-cover"
                [alt]="album.title"
              >
              <span *ngIf="!album.cover" class="recent-cover recent-cover--empty"></span>
              <span class="recent-text">
                <span class="recent-title">{{ album.title }}</span>
                <span class="recent-artist">{{ album.artist }}</span>
              </span>
              <span *ngIf="album.createdAt" class="recent-date">{{ album.createdAt | date:'mediumDate' }}</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .advanced-section {
      padding: 16px 0;
      border-top: 1px solid #eee;
    }
    .advanced-section h3 {
      margin: 0 0 4px 0;
    }
    .advanced-desc {
      color: #666;
      margin: 0 0 12px 0;
    }
    .section-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    @media (max-width: 768px) {
      .section-actions {
        flex-direction: column;
        align-items: stretch;
      }
    }
    .recent-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .recent-list li {
      border-bottom: 1px solid #f0f0f0;
    }
    .recent-list li:last-child {
      border-bottom: none;
    }
    .recent-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      text-decoration: none;
      color: inherit;
    }
    .recent-item:hover {
      background: #f8f8f8;
    }
    .recent-cover {
      width: 44px;
      height: 44px;
      border-radius: 4px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .recent-cover--empty {
      background: #e0e0e0;
    }
    .recent-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    .recent-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .recent-artist {
      color: #666;
      font-size: 0.9em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .recent-date {
      color: #999;
      font-size: 0.85em;
      flex-shrink: 0;
    }
  `]
})
export class AdvancedComponent implements OnInit {
  issueCount = 0;
  message = '';
  error = '';
  recentAlbums: Album[] = [];
  recentLoading = false;
  readonly mediaUrl = environment.apiBaseUrl;

  constructor(
    private albumService: AlbumService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadIssueCount();
    this.loadRecentlyAdded();
  }

  private loadRecentlyAdded(): void {
    this.recentLoading = true;
    this.albumService.getRecentlyAdded(10).subscribe({
      next: (response: AlbumResponse) => {
        this.recentAlbums = response.data;
        this.recentLoading = false;
      },
      error: (err) => {
        console.error('Failed to load recently added albums:', err.message);
        this.recentLoading = false;
      }
    });
  }

  private loadIssueCount(): void {
    this.albumService.getIssues(1, 1).subscribe({
      next: (response: AlbumResponse) => {
        this.issueCount = response.meta.pagination.total;
      },
      error: (err) => {
        console.error('Failed to load issue count:', err.message);
      }
    });
  }

  showIssues(): void {
    this.router.navigate(['/albums'], { queryParams: { issues: 'true' } });
  }

  exportCsv(): void {
    this.albumService.exportCsv().subscribe({
      next: (blob) => this.downloadBlob(blob, 'albums.csv'),
      error: (err) => {
        this.error = 'Export failed: ' + err.message;
      }
    });
  }

  exportJson(): void {
    this.albumService.exportJson().subscribe({
      next: (blob) => this.downloadBlob(blob, 'albums.json'),
      error: (err) => {
        this.error = 'Export failed: ' + err.message;
      }
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  enrichPending(): void {
    this.albumService.enrichPending().subscribe({
      next: (result) => {
        this.error = '';
        this.message = `${result.message}\n\n${result.note}`;
      },
      error: (err) => {
        this.error = 'Failed to start enrichment: ' + err.message;
      }
    });
  }

  fetchCovers(): void {
    this.albumService.fetchCovers().subscribe({
      next: (result) => {
        this.error = '';
        this.message = `${result.message}\n\n${result.note}`;
      },
      error: (err) => {
        this.error = 'Failed to start cover fetch: ' + err.message;
      }
    });
  }
}
