import { Cover } from './album.model';

export interface WishlistItem {
  id: number;
  documentId: string;
  artist: string;
  title?: string | null;
  upc?: string | null;
  release_date?: string | null;
  url?: string | null;
  notes?: string | null;
  cover?: Cover | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WishlistResponse {
  data: WishlistItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface PurchaseInput {
  artist: string;
  title: string;
  upc?: string;
  release_date?: string;
  mbid?: string;
  discogs_id?: string;
}
