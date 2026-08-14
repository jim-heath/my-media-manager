import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlbumService } from '../../services/album.service';
import { AuthService } from '../../services/auth.service';
import { Album } from '../../models/album.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-album-detail',
  template: `
    <div class="card" *ngIf="album">
      <div style="display: flex; gap: 30px; flex-wrap: wrap;">
        <div style="flex: 0 0 300px;">
          <img
            *ngIf="album.cover && !editing"
            [src]="mediaUrl + album.cover.url"
            (click)="openLightbox()"
            class="detail-cover"
            [alt]="album.title"
          >
          <div 
            *ngIf="!album.cover && !editing" 
            style="width: 100%; height: 300px; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center;"
          >
            <span>No Cover Available</span>
          </div>
          
          <!-- Cover Upload (edit mode) -->
          <div *ngIf="editing" style="border: 2px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center;">
            <img 
              *ngIf="album.cover" 
              [src]="mediaUrl + album.cover.url" 
              style="width: 100%; max-height: 200px; object-fit: contain; margin-bottom: 10px;"
            >
            <div *ngIf="!album.cover" style="height: 100px; display: flex; align-items: center; justify-content: center; color: #666;">
              No cover image
            </div>
            <input 
              type="file" 
              (change)="onCoverSelected($event)"
              accept="image/*"
              class="form-control"
              style="margin-top: 10px;"
            >
            <small style="color: #666;">Select new image to replace cover</small>
          </div>
        </div>

        <div style="flex: 1; min-width: 300px;">
          <!-- View Mode -->
          <div *ngIf="!editing">
            <div class="detail-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div style="min-width: 0;">
                <h1>{{ album.title }}</h1>
                <h2 style="color: #666; font-weight: normal;">{{ album.artist }}</h2>
              </div>
              <div class="header-actions" style="display: flex; gap: 10px; flex-shrink: 0;">
                <button *ngIf="isAuthenticated" class="btn btn-secondary" (click)="startEdit()" style="white-space: nowrap;" aria-label="Edit">
                  <span class="btn-label">Edit</span>
                  <svg class="btn-ico" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T846-624L319-96H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                  </svg>
                </button>
                <button class="btn btn-secondary" (click)="goBack()" style="white-space: nowrap;" aria-label="Back">
                  <span class="btn-label">← Back</span>
                  <svg class="btn-ico" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M313-440l224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div *ngIf="album.metadata_status !== 'completed'" style="margin-bottom: 20px;">
              <span class="badge badge-{{album.metadata_status}}">{{ album.metadata_status }}</span>
            </div>

            <div class="info-grid" style="display: grid; gap: 10px; margin-bottom: 20px;">
              <div *ngIf="album.upc"><strong>UPC:</strong> {{ album.upc }}</div>
              <div *ngIf="album.release_date"><strong>Release Date:</strong> {{ album.release_date }}</div>
              <div *ngIf="album.mbid"><strong>MusicBrainz ID:</strong> {{ album.mbid }}</div>
              <div *ngIf="album.discogs_id"><strong>Discogs ID:</strong> {{ album.discogs_id }}</div>
            </div>

            <div *ngIf="album.metadata_status === 'failed' && album.fetch_error" class="alert alert-error">
              <strong>Error:</strong> {{ album.fetch_error }}
            </div>

            <button 
              *ngIf="isAuthenticated && album.metadata_status !== 'fetching'"
              class="btn btn-primary" 
              (click)="enrich()"
              [disabled]="enriching"
            >
              {{ enriching ? 'Enriching...' : 'Refresh Metadata' }}
            </button>
          </div>

          <!-- Edit Mode -->
          <div *ngIf="editing">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2>Edit Album</h2>
              <button class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
            </div>

            <div *ngIf="saveError" class="alert alert-error">{{ saveError }}</div>
            <div *ngIf="saveSuccess" class="alert alert-success">{{ saveSuccess }}</div>

            <form (ngSubmit)="saveEdit()">
              <div class="form-group">
                <label>Artist *</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.artist" 
                  name="artist"
                  class="form-control"
                  required
                >
              </div>

              <div class="form-group">
                <label>Title *</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.title" 
                  name="title"
                  class="form-control"
                  required
                >
              </div>

              <div class="form-group">
                <label>UPC</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.upc" 
                  name="upc"
                  class="form-control"
                >
              </div>

              <div class="form-group">
                <label>Release Date</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.release_date" 
                  name="release_date"
                  class="form-control"
                  placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
                >
              </div>

              <div class="form-group">
                <label>MusicBrainz ID</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.mbid" 
                  name="mbid"
                  class="form-control"
                >
              </div>

              <div class="form-group">
                <label>Discogs ID or URL</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.discogs_id" 
                  name="discogs_id"
                  class="form-control"
                  placeholder="e.g. 249504 or https://www.discogs.com/release/249504-..."
                >
                <small style="color: #666;">
                  Can't auto-identify an album? Find it on Discogs, paste its
                  release ID or URL here, and saving will pull metadata &amp; cover
                  directly from that release.
                </small>
              </div>

              <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: space-between;">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  [disabled]="saving || !editForm.artist || !editForm.title"
                >
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button 
                  type="button" 
                  class="btn btn-danger"
                  (click)="confirmDelete()"
                  [disabled]="saving"
                >
                  Delete Album
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Tracklist: view mode -->
      <div *ngIf="!editingTracks" style="margin-top: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 *ngIf="album.tracks && album.tracks.length > 0">Tracklist ({{ album.tracks.length }} tracks)</h3>
          <h3 *ngIf="!album.tracks || album.tracks.length === 0">Tracklist</h3>
          <button
            *ngIf="isAuthenticated"
            class="btn btn-secondary"
            (click)="startEditTracks()"
          >
            {{ (album.tracks && album.tracks.length > 0) ? 'Edit Tracks' : 'Add Tracks Manually' }}
          </button>
        </div>

        <table *ngIf="album.tracks && album.tracks.length > 0" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #ddd;">
              <th style="text-align: left; padding: 10px;">#</th>
              <th style="text-align: left; padding: 10px;">Title</th>
              <th style="text-align: left; padding: 10px;">Length</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              *ngFor="let track of album.tracks" 
              style="border-bottom: 1px solid #eee;"
            >
              <td style="padding: 10px;">{{ track.track_number }}</td>
              <td style="padding: 10px;">{{ track.title }}</td>
              <td style="padding: 10px;">{{ formatLength(track.length) }}</td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!album.tracks || album.tracks.length === 0" class="alert alert-info" style="margin-top: 10px;">
          No track information available.
          <button 
            *ngIf="isAuthenticated && album.metadata_status !== 'fetching'"
            class="btn btn-primary" 
            (click)="enrich()"
            style="margin-left: 10px;"
          >Fetch Metadata</button>
        </div>
      </div>

      <!-- Tracklist: manual edit mode -->
      <div *ngIf="editingTracks" class="track-edit" style="margin-top: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3>Edit Tracklist</h3>
          <button class="btn btn-secondary" (click)="cancelEditTracks()">Cancel</button>
        </div>

        <div *ngIf="trackError" class="alert alert-error">{{ trackError }}</div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #ddd;">
              <th style="text-align: left; padding: 8px; width: 40px;">#</th>
              <th style="text-align: left; padding: 8px;">Title</th>
              <th style="text-align: left; padding: 8px; width: 110px;">Length</th>
              <th style="width: 80px;"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let track of trackForm; let i = index" style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">{{ i + 1 }}</td>
              <td style="padding: 8px;">
                <input
                  type="text"
                  [(ngModel)]="track.title"
                  [name]="'track_title_' + i"
                  class="form-control"
                  placeholder="Track title"
                >
              </td>
              <td style="padding: 8px;">
                <input
                  type="text"
                  [(ngModel)]="track.lengthStr"
                  [name]="'track_length_' + i"
                  class="form-control"
                  placeholder="M:SS"
                >
              </td>
              <td style="padding: 8px; text-align: center;">
                <button type="button" class="btn btn-danger" (click)="removeTrackRow(i)" aria-label="Remove track">
                  <span class="btn-label">Remove</span>
                  <svg class="btn-ico" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="track-actions" style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">
          <div class="track-buttons" style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-secondary" (click)="addTrackRow()">+ Add Track</button>
            <button type="button" class="btn btn-primary" (click)="saveTracks()" [disabled]="savingTracks">
              {{ savingTracks ? 'Saving...' : 'Save Tracklist' }}
            </button>
          </div>
          <small class="track-hint" style="color: #666;">Length is optional. Use M:SS (e.g. 3:45) or seconds.</small>
        </div>
      </div>
    </div>

    <div *ngIf="error" class="alert alert-error">
      {{ error }}
    </div>

    <!-- Cover lightbox -->
    <div *ngIf="lightboxOpen" class="lightbox-overlay" (click)="closeLightbox()">
      <button class="lightbox-close" (click)="closeLightbox()" aria-label="Close lightbox">×</button>
      <img [src]="lightboxImage" class="lightbox-image" (click)="$event.stopPropagation()" [alt]="album?.title">
    </div>

    <!-- Delete confirmation modal -->
    <div *ngIf="showDeleteModal" class="modal-overlay" (click)="cancelDelete()">
      <div class="modal-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <h3 class="modal-title">Delete album?</h3>
        <p class="modal-text">
          Are you sure you want to delete <strong>{{ album?.title }}</strong>
          by <strong>{{ album?.artist }}</strong>?
        </p>
        <ul class="modal-list">
          <li>{{ album?.tracks?.length || 0 }} track(s) will be removed</li>
          <li *ngIf="album?.cover">The album cover image will be removed</li>
        </ul>
        <p class="modal-warning">This action cannot be undone.</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="cancelDelete()" [disabled]="saving">Cancel</button>
          <button class="btn btn-danger" (click)="deleteAlbum()" [disabled]="saving">
            {{ saving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions .btn-ico {
      display: none;
      width: 1.2em;
      height: 1.2em;
      fill: currentColor;
      vertical-align: middle;
    }
    .track-edit .btn-ico {
      display: none;
      width: 1.2em;
      height: 1.2em;
      fill: currentColor;
      vertical-align: middle;
    }
    @media (max-width: 768px) {
      .detail-header {
        flex-direction: column-reverse;
        align-items: stretch !important;
      }
      .detail-header .header-actions {
        justify-content: flex-end;
        margin-bottom: 10px;
      }
      .header-actions .btn-label {
        display: none;
      }
      .header-actions .btn-ico {
        display: inline-block;
      }
      .track-edit .btn-label {
        display: none;
      }
      .track-edit .btn-ico {
        display: inline-block;
      }
      .track-actions {
        flex-direction: column;
        align-items: stretch;
      }
      .track-actions .track-hint {
        order: -1;
      }
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: modal-fade 0.15s ease-out;
    }
    .modal-dialog {
      background: #fff;
      border-radius: 10px;
      padding: 24px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
      animation: modal-pop 0.15s ease-out;
    }
    .modal-title {
      margin: 0 0 12px 0;
    }
    .modal-text {
      margin: 0 0 12px 0;
      color: #333;
    }
    .modal-list {
      margin: 0 0 12px 0;
      padding-left: 20px;
      color: #666;
    }
    .modal-warning {
      margin: 0 0 20px 0;
      color: #c0392b;
      font-weight: 600;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    @keyframes modal-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modal-pop {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `],
})
export class AlbumDetailComponent implements OnInit {
  album: Album | null = null;
  error = '';
  enriching = false;
  isAuthenticated = false;
  showDeleteModal = false;
  lightboxOpen = false;
  readonly mediaUrl = environment.apiBaseUrl;

  get lightboxImage(): string {
    if (!this.album?.cover) return '';
    const large = this.album.cover.formats?.large?.url;
    return this.mediaUrl + (large || this.album.cover.url);
  }

  // Edit mode
  editing = false;
  saving = false;
  saveError = '';
  saveSuccess = '';
  editForm: Partial<Album> = {};
  selectedCoverFile: File | null = null;
  private originalDiscogsId: string | null = null;

  // Manual tracklist editing
  editingTracks = false;
  savingTracks = false;
  trackError = '';
  trackForm: { title: string; lengthStr: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private albumService: AlbumService,
    private authService: AuthService
  ) {
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
    });
  }

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('id');
    if (documentId) {
      this.loadAlbum(documentId);
    }
  }

  loadAlbum(documentId: string): void {
    this.albumService.getAlbum(documentId).subscribe({
      next: (response) => {
        this.album = response.data;
        this.error = '';
      },
      error: (err) => {
        this.error = 'Failed to load album: ' + err.message;
      }
    });
  }

  enrich(): void {
    if (!this.album) return;
    
    this.enriching = true;
    this.albumService.enrichAlbum(this.album.documentId).subscribe({
      next: (response) => {
        this.album = response.data;
        this.enriching = false;
        this.error = '';
      },
      error: (err) => {
        this.error = 'Enrichment failed: ' + err.message;
        this.enriching = false;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  // After saving, if the user entered a new Discogs ID/URL, immediately fetch
  // metadata directly from that release.
  private maybeFetchFromDiscogs(): void {
    const newId = (this.editForm.discogs_id || '').trim();
    if (newId && newId !== (this.originalDiscogsId || '')) {
      this.enrich();
    }
  }

  formatLength(seconds: number | null): string {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Manual tracklist editing
  startEditTracks(): void {
    if (!this.album) return;
    this.trackError = '';
    const existing = this.album.tracks || [];
    this.trackForm = existing.length > 0
      ? existing.map(t => ({
          title: t.title,
          lengthStr: t.length != null ? this.formatLength(t.length) : ''
        }))
      : [{ title: '', lengthStr: '' }];
    this.editingTracks = true;
  }

  cancelEditTracks(): void {
    this.editingTracks = false;
    this.trackForm = [];
    this.trackError = '';
  }

  addTrackRow(): void {
    this.trackForm.push({ title: '', lengthStr: '' });
  }

  removeTrackRow(index: number): void {
    this.trackForm.splice(index, 1);
  }

  // Parse a length string (M:SS, MM:SS, or plain seconds) into seconds.
  // Returns null for empty input, or NaN for invalid input.
  private parseLength(value: string): number | null | typeof NaN {
    const str = (value || '').trim();
    if (!str) return null;

    if (str.includes(':')) {
      const parts = str.split(':');
      if (parts.length !== 2) return NaN;
      const mins = Number(parts[0]);
      const secs = Number(parts[1]);
      if (!Number.isInteger(mins) || !Number.isInteger(secs) || mins < 0 || secs < 0 || secs > 59) {
        return NaN;
      }
      return mins * 60 + secs;
    }

    const seconds = Number(str);
    if (!Number.isFinite(seconds) || seconds < 0) return NaN;
    return Math.round(seconds);
  }

  saveTracks(): void {
    if (!this.album) return;
    this.trackError = '';

    const payload: { track_number: number; title: string; length: number | null }[] = [];
    for (let i = 0; i < this.trackForm.length; i++) {
      const row = this.trackForm[i];
      const title = (row.title || '').trim();
      if (!title) {
        this.trackError = `Track ${i + 1} is missing a title.`;
        return;
      }
      const length = this.parseLength(row.lengthStr);
      if (Number.isNaN(length as number)) {
        this.trackError = `Track ${i + 1} has an invalid length. Use M:SS (e.g. 3:45) or seconds.`;
        return;
      }
      payload.push({ track_number: i + 1, title, length: length as number | null });
    }

    this.savingTracks = true;
    this.albumService.saveTracks(this.album.documentId, payload).subscribe({
      next: (response) => {
        this.album = response.data;
        this.savingTracks = false;
        this.editingTracks = false;
        this.trackForm = [];
        this.error = '';
      },
      error: (err) => {
        this.savingTracks = false;
        this.trackError = err.error?.error?.message || 'Failed to save tracks';
      }
    });
  }

  // Delete album
  openLightbox(): void {
    if (!this.album?.cover) return;
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }

  confirmDelete(): void {
    if (!this.album) return;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    if (this.saving) return;
    this.showDeleteModal = false;
  }

  deleteAlbum(): void {
    if (!this.album) return;

    this.saving = true;
    this.albumService.deleteAlbum(this.album.documentId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.router.navigate(['/albums']);
      },
      error: (err) => {
        this.saving = false;
        this.showDeleteModal = false;
        this.saveError = err.error?.error?.message || 'Failed to delete album';
      }
    });
  }

  // Edit mode methods
  startEdit(): void {
    if (!this.album) return;
    this.editing = true;
    this.editForm = {
      artist: this.album.artist,
      title: this.album.title,
      upc: this.album.upc,
      release_date: this.album.release_date,
      mbid: this.album.mbid,
      discogs_id: this.album.discogs_id
    };
    this.originalDiscogsId = this.album.discogs_id || null;
    this.saveError = '';
    this.saveSuccess = '';
    this.selectedCoverFile = null;
  }

  cancelEdit(): void {
    this.editing = false;
    this.editForm = {};
    this.selectedCoverFile = null;
    this.saveError = '';
    this.saveSuccess = '';
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedCoverFile = input.files[0];
    }
  }

  saveEdit(): void {
    if (!this.album || !this.editForm.artist || !this.editForm.title) return;

    this.saving = true;
    this.saveError = '';
    this.saveSuccess = '';

    this.albumService.updateAlbum(this.album.documentId, this.editForm).subscribe({
      next: (response) => {
        this.album = response.data;

        // Upload cover if selected
        if (this.selectedCoverFile && this.album) {
          this.albumService.uploadCover(this.album.documentId, this.selectedCoverFile).subscribe({
            next: (coverResponse) => {
              this.album = coverResponse.data;
              this.saving = false;
              this.editing = false;
              this.saveSuccess = 'Album updated with new cover!';
              setTimeout(() => this.saveSuccess = '', 2000);
            },
            error: (err) => {
              this.saving = false;
              this.saveSuccess = 'Album updated, but cover upload failed';
              setTimeout(() => {
                this.editing = false;
                this.saveSuccess = '';
              }, 2000);
            }
          });
        } else {
          this.saving = false;
          this.editing = false;
          this.saveSuccess = 'Album updated successfully!';
          setTimeout(() => this.saveSuccess = '', 2000);
        }

        this.maybeFetchFromDiscogs();
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err.error?.error?.message || 'Failed to update album';
      }
    });
  }
}
