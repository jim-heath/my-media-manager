import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WishlistItem, WishlistResponse, PurchaseInput } from '../models/wishlist.model';
import { Album } from '../models/album.model';
import { environment } from '../../environments/environment';

@Injectable()
export class WishlistService {
  private apiUrl = `${environment.apiBaseUrl}/api/wishlist-items`;

  constructor(private http: HttpClient) { }

  getItems(search?: string, page: number = 1, pageSize: number = 24, sort?: string, searchBy?: string): Observable<WishlistResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('q', search);
    }
    if (sort) {
      params = params.set('sort', sort);
    }
    if (searchBy) {
      params = params.set('searchBy', searchBy);
    }

    return this.http.get<WishlistResponse>(`${this.apiUrl}/search`, { params });
  }

  getItem(documentId: string): Observable<{ data: WishlistItem }> {
    return this.http.get<{ data: WishlistItem }>(`${this.apiUrl}/${documentId}`);
  }

  createItem(item: Partial<WishlistItem>): Observable<{ data: WishlistItem }> {
    return this.http.post<{ data: WishlistItem }>(this.apiUrl, item);
  }

  updateItem(documentId: string, item: Partial<WishlistItem>): Observable<{ data: WishlistItem }> {
    return this.http.put<{ data: WishlistItem }>(`${this.apiUrl}/${documentId}`, item);
  }

  uploadCover(documentId: string, file: File): Observable<{ data: WishlistItem }> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post<{ data: WishlistItem }>(`${this.apiUrl}/${documentId}/cover`, formData);
  }

  deleteItem(documentId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${documentId}`);
  }

  purchase(documentId: string, input: PurchaseInput): Observable<{ data: Album }> {
    return this.http.post<{ data: Album }>(`${this.apiUrl}/${documentId}/purchase`, input);
  }
}
