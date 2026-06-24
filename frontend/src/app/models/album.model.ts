export interface Track {
  id: number;
  track_number: number;
  title: string;
  length: number | null;
  mbid?: string;
}

export interface Cover {
  id: number;
  url: string;
  formats: {
    thumbnail: { url: string };
    small: { url: string };
    medium: { url: string };
    large: { url: string };
  };
}

export interface Album {
  id: number;
  documentId: string;
  upc: string;
  artist: string;
  title: string;
  release_date?: string;
  cover?: Cover;
  mbid?: string;
  discogs_id?: string;
  spotify_id?: string;
  metadata_status: 'pending' | 'fetching' | 'completed' | 'failed';
  fetch_error?: string;
  tracks?: Track[];
  createdAt?: string;
  updatedAt?: string;
  issues?: string[];
}

export interface AlbumResponse {
  data: Album[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}
