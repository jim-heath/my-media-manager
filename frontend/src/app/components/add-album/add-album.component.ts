import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlbumService } from '../../services/album.service';
import { Album, ImportResult } from '../../models/album.model';

@Component({
  selector: 'app-add-album',
  template: `
    <div class="card">
      <h2>Add Albums</h2>

      <div class="tab-bar">
        <button
          type="button"
          class="tab"
          [class.active]="activeTab === 'single'"
          (click)="activeTab = 'single'"
        >Single Album</button>
        <button
          type="button"
          class="tab"
          [class.active]="activeTab === 'csv'"
          (click)="activeTab = 'csv'"
        >Import CSV</button>
      </div>

      <!-- Single Album Tab -->
      <div *ngIf="activeTab === 'single'">
        <div *ngIf="error" class="alert alert-error">{{ error }}</div>
        <div *ngIf="success" class="alert alert-success">{{ success }}</div>

        <!-- Validation Summary -->
        <div *ngIf="submitted && validationErrors.length > 0" class="alert alert-warning">
          <strong>Please fix the following errors:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li *ngFor="let err of validationErrors">{{ err }}</li>
          </ul>
        </div>

        <form (ngSubmit)="addAlbum()">
        <div class="form-row">
          <div class="form-group">
            <label>Artist *</label>
            <input 
              type="text" 
              [(ngModel)]="album.artist" 
              name="artist"
              class="form-control"
              [class.input-error]="touched['artist'] && !album.artist"
              required
              [disabled]="saving"
              (blur)="markTouched('artist')"
            >
            <small *ngIf="touched['artist'] && !album.artist" class="error-text">Artist is required</small>
            <small *ngIf="touched['artist'] && album.artist && album.artist.length > 255" class="error-text">Max 255 characters</small>
          </div>
          
          <div class="form-group">
            <label>Album Title *</label>
            <input 
              type="text" 
              [(ngModel)]="album.title" 
              name="title"
              class="form-control"
              [class.input-error]="touched['title'] && !album.title"
              required
              [disabled]="saving"
              (blur)="markTouched('title')"
            >
            <small *ngIf="touched['title'] && !album.title" class="error-text">Title is required</small>
            <small *ngIf="touched['title'] && album.title && album.title.length > 255" class="error-text">Max 255 characters</small>
          </div>
        </div>
        
        <div class="form-row" style="margin-top: 15px;">
          <div class="form-group">
            <label>UPC (optional)</label>
            <input 
              type="text" 
              [(ngModel)]="album.upc" 
              name="upc"
              class="form-control"
              [class.input-error]="touched['upc'] && album.upc && !isValidUpc()"
              placeholder="12-14 digits"
              [disabled]="saving"
              (blur)="markTouched('upc')"
            >
            <small *ngIf="touched['upc'] && album.upc && !isValidUpc()" class="error-text">UPC must be 12-14 digits</small>
          </div>
          
          <div class="form-group">
            <label>Release Date (optional)</label>
            <input 
              type="text" 
              [(ngModel)]="album.release_date" 
              name="release_date"
              class="form-control"
              [class.input-error]="touched['release_date'] && album.release_date && !isValidDate()"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              [disabled]="saving"
              (blur)="markTouched('release_date')"
            >
            <small *ngIf="touched['release_date'] && album.release_date && !isValidDate()" class="error-text">Use YYYY, YYYY-MM, or YYYY-MM-DD format</small>
          </div>
        </div>
        
        <div class="form-row" style="margin-top: 15px;">
          <div class="form-group">
            <label>MusicBrainz ID (optional)</label>
            <input 
              type="text" 
              [(ngModel)]="album.mbid" 
              name="mbid"
              class="form-control"
              [disabled]="saving"
            >
          </div>
          
          <div class="form-group">
            <label>Discogs ID (optional)</label>
            <input 
              type="text" 
              [(ngModel)]="album.discogs_id" 
              name="discogs_id"
              class="form-control"
              [disabled]="saving"
            >
          </div>
        </div>
        
        <div class="form-group" style="margin-top: 20px;">
          <label>Cover Image (optional)</label>
          <input 
            type="file" 
            (change)="onFileSelected($event)"
            accept="image/*"
            class="form-control"
            [disabled]="saving"
          >
        </div>
        
        <div style="margin-top: 25px; display: flex; gap: 10px;">
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="saving || !album.artist || !album.title"
          >
            {{ saving ? 'Saving...' : 'Add Album' }}
          </button>
          <button 
            type="button" 
            class="btn btn-secondary"
            (click)="goBack()"
            [disabled]="saving"
          >
            Cancel
          </button>
        </div>
        </form>
      </div>

      <!-- Import CSV Tab -->
      <div *ngIf="activeTab === 'csv'">
        <div class="form-group">
          <label>Select CSV File</label>
          <input
            type="file"
            class="form-control"
            accept=".csv"
            (change)="onCsvSelected($event)"
          >
          <small style="color: #666; display: block; margin-top: 5px;">
            CSV format: upc, artist, title (header row required; upc optional)
          </small>
        </div>

        <button
          class="btn btn-primary"
          (click)="import()"
          [disabled]="importing"
        >
          {{ importing ? 'Importing...' : 'Import' }}
        </button>

        <div *ngIf="result" style="margin-top: 20px;">
          <div class="alert alert-success">
            Import completed!
            <ul style="margin-top: 10px;">
              <li>Imported: {{ result.imported }}</li>
              <li>Failed: {{ result.failed }}</li>
            </ul>
          </div>

          <div *ngIf="result.errors.length > 0" class="alert alert-error">
            <strong>Errors:</strong>
            <ul style="margin-top: 10px;">
              <li *ngFor="let err of result.errors">{{ err }}</li>
            </ul>
          </div>

          <button class="btn btn-success" (click)="goToAlbums()">
            View Collection →
          </button>
        </div>

        <div *ngIf="csvError" class="alert alert-error" style="margin-top: 20px;">
          {{ csvError }}
        </div>

        <div style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
          <h3>Sample CSV Format</h3>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto;">
upc,artist,title
782388079327,:wumpscut:,Women And Satan First
016861937027,Obituary,Cause Of Death
745316143323,At The Gates,Slaughter Of The Soul</pre>
          <p style="margin-top: 10px; color: #666;">
            Metadata will be automatically fetched from MusicBrainz and Discogs after import.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    .tab-bar {
      display: flex;
      gap: 4px;
      border-bottom: 2px solid #eee;
      margin-bottom: 20px;
    }
    .tab {
      background: none;
      border: none;
      padding: 10px 18px;
      font-size: 1rem;
      cursor: pointer;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
    }
    .tab:hover {
      color: #333;
    }
    .tab.active {
      color: #1976d2;
      border-bottom-color: #1976d2;
      font-weight: 600;
    }
  `]
})
export class AddAlbumComponent {
  album: Partial<Album> = {
    artist: '',
    title: '',
    upc: '',
    release_date: '',
    mbid: '',
    discogs_id: ''
  };
  selectedFile: File | null = null;
  error = '';
  success = '';
  saving = false;
  submitted = false;
  touched: { [field: string]: boolean } = {};
  validationErrors: string[] = [];

  // Tabs: default to adding a single album
  activeTab: 'single' | 'csv' = 'single';

  // CSV import state
  csvFile: File | null = null;
  importing = false;
  result: ImportResult | null = null;
  csvError = '';

  constructor(
    private albumService: AlbumService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  // Validation methods
  isValidUpc(): boolean {
    if (!this.album.upc) return true;
    return /^\d{12,14}$/.test(this.album.upc);
  }

  isValidDate(): boolean {
    if (!this.album.release_date) return true;
    // Accept YYYY, YYYY-MM, or YYYY-MM-DD
    return /^\d{4}(-\d{2})?(-\d{2})?$/.test(this.album.release_date);
  }

  markTouched(field: string): void {
    this.touched[field] = true;
  }

  validate(): void {
    this.validationErrors = [];

    if (!this.album.artist?.trim()) {
      this.validationErrors.push('Artist is required');
    } else if (this.album.artist.length > 255) {
      this.validationErrors.push('Artist must be less than 255 characters');
    }

    if (!this.album.title?.trim()) {
      this.validationErrors.push('Album Title is required');
    } else if (this.album.title.length > 255) {
      this.validationErrors.push('Title must be less than 255 characters');
    }

    if (this.album.upc && !this.isValidUpc()) {
      this.validationErrors.push('UPC must be 12-14 digits');
    }

    if (this.album.release_date && !this.isValidDate()) {
      this.validationErrors.push('Release Date must be in YYYY, YYYY-MM, or YYYY-MM-DD format');
    }
  }

  addAlbum(): void {
    this.submitted = true;
    this.touched['artist'] = true;
    this.touched['title'] = true;
    this.touched['upc'] = true;
    this.touched['release_date'] = true;
    this.validate();
    if (this.validationErrors.length > 0) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    this.albumService.createAlbum(this.album).subscribe({
      next: (response) => {
        const newAlbum = response.data;
        
        // Upload cover if selected
        if (this.selectedFile && newAlbum.documentId) {
          this.albumService.uploadCover(newAlbum.documentId, this.selectedFile).subscribe({
            next: () => {
              this.success = 'Album added with cover!';
              setTimeout(() => this.router.navigate(['/albums']), 1500);
            },
            error: (err) => {
              this.success = 'Album added, but cover upload failed: ' + err.message;
              setTimeout(() => this.router.navigate(['/albums']), 2000);
            }
          });
        } else {
          this.success = 'Album added successfully!';
          setTimeout(() => this.router.navigate(['/albums']), 1500);
        }
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.error?.message || 'Failed to add album';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/albums']);
  }

  // CSV import
  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.csvFile = input.files[0];
      this.result = null;
      this.csvError = '';
    }
  }

  import(): void {
    if (!this.csvFile) {
      this.csvError = 'Please select a CSV file before importing.';
      return;
    }

    this.importing = true;
    this.csvError = '';

    this.albumService.importCsv(this.csvFile).subscribe({
      next: (result) => {
        this.result = result;
        this.importing = false;
      },
      error: (err) => {
        this.csvError = 'Import failed: ' + err.message;
        this.importing = false;
      }
    });
  }

  goToAlbums(): void {
    this.router.navigate(['/albums']);
  }
}
