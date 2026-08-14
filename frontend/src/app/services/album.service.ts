import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Album, AlbumResponse, ImportResult } from '../models/album.model';
import { environment } from '../../environments/environment';

@Injectable()
export class AlbumService {
  private apiUrl = `${environment.apiBaseUrl}/api/albums`;

  constructor(private http: HttpClient) { }

  getAlbums(search?: string, artist?: string, page: number = 1, pageSize: number = 20, sort?: string, searchBy?: string): Observable<AlbumResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('q', search);
    }
    if (artist) {
      params = params.set('artist', artist);
    }
    if (sort) {
      params = params.set('sort', sort);
    }
    if (searchBy) {
      params = params.set('searchBy', searchBy);
    }

    return this.http.get<AlbumResponse>(`${this.apiUrl}/search`, { params });
  }

  getIssues(page: number = 1, pageSize: number = 20, sort?: string): Observable<AlbumResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<AlbumResponse>(`${this.apiUrl}/issues`, { params });
  }

  getAlbum(documentId: string): Observable<{ data: Album }> {
    return this.http.get<{ data: Album }>(`${this.apiUrl}/${documentId}`);
  }

  getRecentlyAdded(limit: number = 10): Observable<AlbumResponse> {
    const params = new HttpParams()
      .set('sort', 'createdAt:desc')
      .set('pagination[page]', '1')
      .set('pagination[pageSize]', limit.toString())
      .set('populate', 'cover');

    return this.http.get<AlbumResponse>(this.apiUrl, { params });
  }

  enrichAlbum(documentId: string): Observable<{ data: Album }> {
    return this.http.post<{ data: Album }>(`${this.apiUrl}/${documentId}/enrich`, {});
  }

  importCsv(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(`${this.apiUrl}/import`, formData);
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/csv`, { responseType: 'blob' });
  }

  exportJson(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/json`, { responseType: 'blob' });
  }

  createAlbum(album: Partial<Album>): Observable<{ data: Album }> {
    return this.http.post<{ data: Album }>(this.apiUrl, album);
  }

  updateAlbum(documentId: string, album: Partial<Album>): Observable<{ data: Album }> {
    return this.http.put<{ data: Album }>(`${this.apiUrl}/${documentId}`, album);
  }

  uploadCover(documentId: string, file: File): Observable<{ data: Album }> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post<{ data: Album }>(`${this.apiUrl}/${documentId}/cover`, formData);
  }

  deleteAlbum(documentId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${documentId}`);
  }

  enrichPending(): Observable<{ success: boolean; message: string; pendingCount: number; note: string }> {
    return this.http.post<{ success: boolean; message: string; pendingCount: number; note: string }>(`${this.apiUrl}/enrich-pending`, {});
  }

  fetchCovers(): Observable<{ success: boolean; message: string; missingCount: number; note: string }> {
    return this.http.post<{ success: boolean; message: string; missingCount: number; note: string }>(`${this.apiUrl}/fetch-covers`, {});
  }

  saveTracks(documentId: string, tracks: { track_number: number; title: string; length: number | null }[]): Observable<{ data: Album }> {
    return this.http.put<{ data: Album }>(`${this.apiUrl}/${documentId}/tracks`, { tracks });
  }
}
