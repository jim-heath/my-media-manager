import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { WishlistItem, PurchaseInput } from '../../models/wishlist.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-wishlist-detail',
  template: `
    <div class="card" *ngIf="item">
      <div style="display: flex; gap: 30px; flex-wrap: wrap;">
        <div style="flex: 0 0 300px;">
          <img
            *ngIf="item.cover && !editing"
            [src]="mediaUrl + item.cover.url"
            (click)="openLightbox()"
            class="detail-cover"
            [alt]="item.title || 'Untitled'"
          >
          <div
            *ngIf="!item.cover && !editing"
            style="width: 100%; height: 300px; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center;"
          >
            <span>No Cover Available</span>
          </div>

          <!-- Cover Upload (edit mode) -->
          <div *ngIf="editing" style="border: 2px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center;">
            <img
              *ngIf="item.cover"
              [src]="mediaUrl + item.cover.url"
              style="width: 100%; max-height: 200px; object-fit: contain; margin-bottom: 10px;"
            >
            <div *ngIf="!item.cover" style="height: 100px; display: flex; align-items: center; justify-content: center; color: #666;">
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
                <h1><em *ngIf="!item.title">Untitled</em>{{ item.title }}</h1>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h2 style="color: #666; font-weight: normal; margin: 0;">{{ item.artist }}</h2>
                  <a *ngIf="item.artist" class="artist-link" [href]="discogsArtistUrl" target="_blank" rel="noopener" title="Search Discogs" aria-label="Search Discogs for artist">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3zm3 16v-7h2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7v2H5v12h12z"/>
                    </svg>
                  </a>
                  <a *ngIf="item.artist" class="artist-link" [href]="musicbrainzArtistUrl" target="_blank" rel="noopener" title="Search MusicBrainz" aria-label="Search MusicBrainz for artist">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </a>
                </div>
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

            <div class="info-grid" style="display: grid; gap: 10px; margin-bottom: 20px;">
              <div *ngIf="item.upc"><strong>UPC:</strong> {{ item.upc }}</div>
              <div *ngIf="item.release_date"><strong>Release Date:</strong> {{ item.release_date }}</div>
              <div *ngIf="item.createdAt"><strong>Added:</strong> {{ item.createdAt | date:'mediumDate' }}</div>
              <div *ngIf="item.url"><strong>Link:</strong> <a [href]="item.url" target="_blank" rel="noopener">{{ item.url }}</a></div>
            </div>

            <p *ngIf="item.notes" style="white-space: pre-wrap">{{ item.notes }}</p>
          </div>

          <!-- Edit Mode -->
          <div *ngIf="editing">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2>Edit Wishlist Item</h2>
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
                <label>Title</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.title"
                  name="title"
                  class="form-control"
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
                <label>URL</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.url"
                  name="url"
                  class="form-control"
                  placeholder="https://..."
                >
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea
                  [(ngModel)]="editForm.notes"
                  name="notes"
                  class="form-control"
                  rows="4"
                ></textarea>
              </div>

              <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap;">
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="saving || !editForm.artist"
                >
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button
                  type="button"
                  class="btn btn-success"
                  (click)="openPurchase()"
                  [disabled]="saving"
                >
                  Mark as Purchased
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  (click)="confirmDelete()"
                  [disabled]="saving"
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="error" class="alert alert-error">
      {{ error }}
    </div>

    <!-- Cover lightbox -->
    <div *ngIf="lightboxOpen" class="lightbox-overlay" (click)="closeLightbox()">
      <button class="lightbox-close" (click)="closeLightbox()" aria-label="Close lightbox">×</button>
      <img [src]="lightboxImage" class="lightbox-image" (click)="$event.stopPropagation()" [alt]="item?.title || 'Untitled'">
    </div>

    <!-- Delete confirmation modal -->
    <div *ngIf="showDeleteModal" class="modal-overlay" (click)="cancelDelete()">
      <div class="modal-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <h3 class="modal-title">Remove from wishlist?</h3>
        <p class="modal-text">
          Are you sure you want to remove <strong>{{ item?.title || 'Untitled' }}</strong>
          by <strong>{{ item?.artist }}</strong> from your wishlist?
        </p>
        <ul class="modal-list">
          <li *ngIf="item?.cover">The cover image will be removed</li>
        </ul>
        <p class="modal-warning">This action cannot be undone.</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" (click)="cancelDelete()" [disabled]="saving">Cancel</button>
          <button class="btn btn-danger" (click)="deleteItem()" [disabled]="saving">
            {{ saving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Purchase modal -->
    <div *ngIf="showPurchaseModal" class="modal-overlay" (click)="cancelPurchase()">
      <div class="modal-dialog purchase-dialog" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <h3 class="modal-title">Mark as purchased</h3>
        <p class="modal-text">
          This will remove the item from your wishlist and add it to your collection.
          Fill in the details required for an album.
        </p>

        <div *ngIf="purchaseError" class="alert alert-error">{{ purchaseError }}</div>

        <div *ngIf="purchaseSubmitted && purchaseValidationErrors.length > 0" class="alert alert-warning">
          <strong>Please fix the following errors:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li *ngFor="let err of purchaseValidationErrors">{{ err }}</li>
          </ul>
        </div>

        <form (ngSubmit)="confirmPurchase()">
          <div class="form-group">
            <label>Artist *</label>
            <input
              type="text"
              [(ngModel)]="purchaseForm.artist"
              name="purchase_artist"
              class="form-control"
              required
              [disabled]="saving"
            >
          </div>

          <div class="form-group">
            <label>Album Title *</label>
            <input
              type="text"
              [(ngModel)]="purchaseForm.title"
              name="purchase_title"
              class="form-control"
              required
              [disabled]="saving"
            >
          </div>

          <div class="form-group">
            <label>UPC (optional)</label>
            <input
              type="text"
              [(ngModel)]="purchaseForm.upc"
              name="purchase_upc"
              class="form-control"
              placeholder="12-14 digits"
              [disabled]="saving"
            >
          </div>

          <div class="form-group">
            <label>Release Date (optional)</label>
            <input
              type="text"
              [(ngModel)]="purchaseForm.release_date"
              name="purchase_release_date"
              class="form-control"
              placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
              [disabled]="saving"
            >
          </div>

          <div class="form-group">
            <label>MusicBrainz ID (optional)</label>
            <input
              type="text"
              [(ngModel)]="purchaseForm.mbid"
              name="purchase_mbid"
              class="form-control"
              [disabled]="saving"
            >
          </div>

          <div class="form-group">
            <label>Discogs ID (optional)</label>
            <input
              type="text"
              [(ngModel)]="purchaseForm.discogs_id"
              name="purchase_discogs_id"
              class="form-control"
              [disabled]="saving"
            >
          </div>

          <p style="color: #666; margin: 10px 0;">
            The wishlist cover image, if any, will be carried over to the album.
          </p>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="cancelPurchase()" [disabled]="saving">Cancel</button>
            <button
              type="submit"
              class="btn btn-success"
              [disabled]="saving || !purchaseForm.artist || !purchaseForm.title"
            >
              {{ saving ? 'Adding...' : 'Add to Collection' }}
            </button>
          </div>
        </form>
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
      max-height: 90vh;
      overflow-y: auto;
    }
    .purchase-dialog {
      max-width: 520px;
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
export class WishlistDetailComponent implements OnInit {
  item: WishlistItem | null = null;
  error = '';
  isAuthenticated = false;
  showDeleteModal = false;
  lightboxOpen = false;
  readonly mediaUrl = environment.apiBaseUrl;

  get lightboxImage(): string {
    if (!this.item?.cover) return '';
    const large = this.item.cover.formats?.large?.url;
    return this.mediaUrl + (large || this.item.cover.url);
  }

  get discogsArtistUrl(): string {
    const artist = this.item?.artist || '';
    return 'https://www.discogs.com/search/?q=' + encodeURIComponent(artist) + '&type=artist';
  }

  get musicbrainzArtistUrl(): string {
    const artist = this.item?.artist || '';
    return 'https://musicbrainz.org/search?query=' + encodeURIComponent(artist) + '&type=artist';
  }

  // Edit mode
  editing = false;
  saving = false;
  saveError = '';
  saveSuccess = '';
  editForm: Partial<WishlistItem> = {};
  selectedCoverFile: File | null = null;

  // Purchase modal
  showPurchaseModal = false;
  purchaseForm: PurchaseInput = { artist: '', title: '' };
  purchaseError = '';
  purchaseSubmitted = false;
  purchaseValidationErrors: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private wishlistService: WishlistService,
    private authService: AuthService
  ) {
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
    });
  }

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('id');
    if (documentId) {
      this.loadItem(documentId);
    }
  }

  loadItem(documentId: string): void {
    this.wishlistService.getItem(documentId).subscribe({
      next: (response) => {
        this.item = response.data;
        this.error = '';
      },
      error: (err) => {
        this.error = 'Failed to load wishlist item: ' + err.message;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  openLightbox(): void {
    if (!this.item?.cover) return;
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }

  confirmDelete(): void {
    if (!this.item) return;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    if (this.saving) return;
    this.showDeleteModal = false;
  }

  deleteItem(): void {
    if (!this.item) return;

    this.saving = true;
    this.wishlistService.deleteItem(this.item.documentId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.router.navigate(['/wishlist']);
      },
      error: (err) => {
        this.saving = false;
        this.showDeleteModal = false;
        this.saveError = err.error?.error?.message || 'Failed to delete item';
      }
    });
  }

  // Edit mode methods
  startEdit(): void {
    if (!this.item) return;
    this.editing = true;
    this.editForm = {
      artist: this.item.artist,
      title: this.item.title,
      upc: this.item.upc,
      release_date: this.item.release_date,
      url: this.item.url,
      notes: this.item.notes
    };
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
    if (!this.item || !this.editForm.artist) return;

    this.saving = true;
    this.saveError = '';
    this.saveSuccess = '';

    this.wishlistService.updateItem(this.item.documentId, this.editForm).subscribe({
      next: (response) => {
        this.item = response.data;

        // Upload cover if selected
        if (this.selectedCoverFile && this.item) {
          this.wishlistService.uploadCover(this.item.documentId, this.selectedCoverFile).subscribe({
            next: (coverResponse) => {
              this.item = coverResponse.data;
              this.saving = false;
              this.editing = false;
              this.saveSuccess = 'Item updated with new cover!';
              setTimeout(() => this.saveSuccess = '', 2000);
            },
            error: (err) => {
              this.saving = false;
              this.saveSuccess = 'Item updated, but cover upload failed';
              setTimeout(() => {
                this.editing = false;
                this.saveSuccess = '';
              }, 2000);
            }
          });
        } else {
          this.saving = false;
          this.editing = false;
          this.saveSuccess = 'Item updated successfully!';
          setTimeout(() => this.saveSuccess = '', 2000);
        }
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err.error?.error?.message || 'Failed to update item';
      }
    });
  }

  // Purchase modal
  openPurchase(): void {
    if (!this.item) return;
    this.purchaseForm = {
      artist: this.item.artist || '',
      title: this.item.title || '',
      upc: this.item.upc || '',
      release_date: this.item.release_date || ''
    };
    this.purchaseError = '';
    this.purchaseSubmitted = false;
    this.purchaseValidationErrors = [];
    this.showPurchaseModal = true;
  }

  cancelPurchase(): void {
    if (this.saving) return;
    this.showPurchaseModal = false;
  }

  private validatePurchase(): void {
    this.purchaseValidationErrors = [];

    if (!this.purchaseForm.artist?.trim()) {
      this.purchaseValidationErrors.push('Artist is required');
    } else if (this.purchaseForm.artist.length > 255) {
      this.purchaseValidationErrors.push('Artist must be less than 255 characters');
    }

    if (!this.purchaseForm.title?.trim()) {
      this.purchaseValidationErrors.push('Album Title is required');
    } else if (this.purchaseForm.title.length > 255) {
      this.purchaseValidationErrors.push('Title must be less than 255 characters');
    }

    if (this.purchaseForm.upc && !/^\d{12,14}$/.test(this.purchaseForm.upc)) {
      this.purchaseValidationErrors.push('UPC must be 12-14 digits');
    }

    if (this.purchaseForm.release_date && !/^\d{4}(-\d{2})?(-\d{2})?$/.test(this.purchaseForm.release_date)) {
      this.purchaseValidationErrors.push('Release Date must be in YYYY, YYYY-MM, or YYYY-MM-DD format');
    }
  }

  confirmPurchase(): void {
    if (!this.item) return;

    this.purchaseSubmitted = true;
    this.validatePurchase();
    if (this.purchaseValidationErrors.length > 0) return;

    this.saving = true;
    this.purchaseError = '';

    this.wishlistService.purchase(this.item.documentId, this.purchaseForm).subscribe({
      next: (response) => {
        this.saving = false;
        this.showPurchaseModal = false;
        this.router.navigate(['/albums', response.data.documentId]);
      },
      error: (err) => {
        this.saving = false;
        this.purchaseError = err.error?.error?.message || 'Failed to mark as purchased';
      }
    });
  }
}
