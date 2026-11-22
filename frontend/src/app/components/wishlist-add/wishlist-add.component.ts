import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { WishlistItem } from '../../models/wishlist.model';

@Component({
  selector: 'app-wishlist-add',
  template: `
    <div class="card">
      <h2>Add to Wishlist</h2>

      <div *ngIf="error" class="alert alert-error">{{ error }}</div>
      <div *ngIf="success" class="alert alert-success">{{ success }}</div>

      <!-- Validation Summary -->
      <div *ngIf="submitted && validationErrors.length > 0" class="alert alert-warning">
        <strong>Please fix the following errors:</strong>
        <ul style="margin: 5px 0; padding-left: 20px;">
          <li *ngFor="let err of validationErrors">{{ err }}</li>
        </ul>
      </div>

      <form (ngSubmit)="addItem()">
      <div class="form-row">
        <div class="form-group">
          <label>Artist *</label>
          <input
            type="text"
            [(ngModel)]="item.artist"
            name="artist"
            class="form-control"
            [class.input-error]="touched['artist'] && !item.artist"
            required
            [disabled]="saving"
            (blur)="markTouched('artist')"
          >
          <small *ngIf="touched['artist'] && !item.artist" class="error-text">Artist is required</small>
          <small *ngIf="touched['artist'] && item.artist && item.artist.length > 255" class="error-text">Max 255 characters</small>
        </div>

        <div class="form-group">
          <label>Album Title</label>
          <input
            type="text"
            [(ngModel)]="item.title"
            name="title"
            class="form-control"
            [disabled]="saving"
            (blur)="markTouched('title')"
          >
          <small *ngIf="touched['title'] && item.title && item.title.length > 255" class="error-text">Max 255 characters</small>
        </div>
      </div>

      <div class="form-row" style="margin-top: 15px;">
        <div class="form-group">
          <label>UPC (optional)</label>
          <input
            type="text"
            [(ngModel)]="item.upc"
            name="upc"
            class="form-control"
            [class.input-error]="touched['upc'] && item.upc && !isValidUpc()"
            placeholder="12-14 digits"
            [disabled]="saving"
            (blur)="markTouched('upc')"
          >
          <small *ngIf="touched['upc'] && item.upc && !isValidUpc()" class="error-text">UPC must be 12-14 digits</small>
        </div>

        <div class="form-group">
          <label>Release Date (optional)</label>
          <input
            type="text"
            [(ngModel)]="item.release_date"
            name="release_date"
            class="form-control"
            [class.input-error]="touched['release_date'] && item.release_date && !isValidDate()"
            placeholder="YYYY, YYYY-MM, or YYYY-MM-DD"
            [disabled]="saving"
            (blur)="markTouched('release_date')"
          >
          <small *ngIf="touched['release_date'] && item.release_date && !isValidDate()" class="error-text">Use YYYY, YYYY-MM, or YYYY-MM-DD format</small>
        </div>
      </div>

      <div class="form-group" style="margin-top: 15px;">
        <label>URL (optional)</label>
        <input
          type="text"
          [(ngModel)]="item.url"
          name="url"
          class="form-control"
          [class.input-error]="touched['url'] && item.url && !isValidUrl()"
          placeholder="https://..."
          [disabled]="saving"
          (blur)="markTouched('url')"
        >
        <small *ngIf="touched['url'] && item.url && !isValidUrl()" class="error-text">Must start with http:// or https://</small>
      </div>

      <div class="form-group" style="margin-top: 15px;">
        <label>Notes (optional)</label>
        <textarea
          [(ngModel)]="item.notes"
          name="notes"
          class="form-control"
          rows="4"
          [disabled]="saving"
        ></textarea>
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
          [disabled]="saving || !item.artist"
        >
          {{ saving ? 'Saving...' : 'Add to Wishlist' }}
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
  `]
})
export class WishlistAddComponent {
  item: Partial<WishlistItem> = {
    artist: '',
    title: '',
    upc: '',
    release_date: '',
    url: '',
    notes: ''
  };
  selectedFile: File | null = null;
  error = '';
  success = '';
  saving = false;
  submitted = false;
  touched: { [field: string]: boolean } = {};
  validationErrors: string[] = [];

  constructor(
    private wishlistService: WishlistService,
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
    if (!this.item.upc) return true;
    return /^\d{12,14}$/.test(this.item.upc);
  }

  isValidDate(): boolean {
    if (!this.item.release_date) return true;
    // Accept YYYY, YYYY-MM, or YYYY-MM-DD
    return /^\d{4}(-\d{2})?(-\d{2})?$/.test(this.item.release_date);
  }

  isValidUrl(): boolean {
    if (!this.item.url) return true;
    return /^https?:\/\//.test(this.item.url.trim());
  }

  markTouched(field: string): void {
    this.touched[field] = true;
  }

  validate(): void {
    this.validationErrors = [];

    if (!this.item.artist?.trim()) {
      this.validationErrors.push('Artist is required');
    } else if (this.item.artist.length > 255) {
      this.validationErrors.push('Artist must be less than 255 characters');
    }

    if (this.item.title && this.item.title.length > 255) {
      this.validationErrors.push('Title must be less than 255 characters');
    }

    if (this.item.upc && !this.isValidUpc()) {
      this.validationErrors.push('UPC must be 12-14 digits');
    }

    if (this.item.release_date && !this.isValidDate()) {
      this.validationErrors.push('Release Date must be in YYYY, YYYY-MM, or YYYY-MM-DD format');
    }

    if (this.item.url && !this.isValidUrl()) {
      this.validationErrors.push('URL must start with http:// or https://');
    }
  }

  addItem(): void {
    this.submitted = true;
    this.touched['artist'] = true;
    this.touched['title'] = true;
    this.touched['upc'] = true;
    this.touched['release_date'] = true;
    this.touched['url'] = true;
    this.validate();
    if (this.validationErrors.length > 0) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    this.wishlistService.createItem(this.item).subscribe({
      next: (response) => {
        const newItem = response.data;

        // Upload cover if selected
        if (this.selectedFile && newItem.documentId) {
          this.wishlistService.uploadCover(newItem.documentId, this.selectedFile).subscribe({
            next: () => {
              this.success = 'Item added with cover!';
              setTimeout(() => this.router.navigate(['/wishlist']), 1500);
            },
            error: (err) => {
              this.success = 'Item added, but cover upload failed: ' + err.message;
              setTimeout(() => this.router.navigate(['/wishlist']), 2000);
            }
          });
        } else {
          this.success = 'Item added to your wishlist!';
          setTimeout(() => this.router.navigate(['/wishlist']), 1500);
        }
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.error?.message || 'Failed to add item';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/wishlist']);
  }
}
