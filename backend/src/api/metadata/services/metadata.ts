import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';

// A meaningful, unique User-Agent is REQUIRED by MusicBrainz. Generic/placeholder
// strings (e.g. user@example.com) get rate-limited or blocked. Override via env.
const USER_AGENT = process.env.APP_USER_AGENT
  || 'MyMusicManager/1.0 (https://github.com/my-music-manager)';

// Rate limiting for MusicBrainz (1 req/sec as per SRS)
let mbLastRequest = 0;
const MB_RATE_LIMIT = 1000; // ms

async function mbRateLimit() {
  const now = Date.now();
  const elapsed = now - mbLastRequest;
  if (elapsed < MB_RATE_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, MB_RATE_LIMIT - elapsed));
  }
  mbLastRequest = Date.now();
}

// Simple retry wrapper for external API calls
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 1000
): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isNetworkError = error.code === 'ECONNRESET' || 
                            error.code === 'ETIMEDOUT' || 
                            error.code === 'ECONNABORTED' ||
                            error.message?.includes('socket disconnected');
      if (i === retries || !isNetworkError) throw error;
      strapi.log.warn(`Network error, retrying in ${delayMs}ms... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delayMs * (i + 1))); // exponential backoff
    }
  }
  return null;
}

export default {
  // FR-2: Metadata Lookup - Main enrichment function
  async enrichAlbum(album: any) {
    const { artist, title, upc } = album;
    
    try {
      // Mark as fetching
      await strapi.documents('api::album.album').update({
        documentId: album.documentId,
        data: { metadata_status: 'fetching', fetch_error: null }
      });

      // If the user supplied a Discogs release ID/URL, fetch that exact release.
      // This bypasses the fuzzy text search that fails for hard-to-match albums.
      if (album.discogs_id) {
        const discogsData = await this.getDiscogsReleaseById(album.discogs_id);
        if (discogsData) {
          await this.updateFromDiscogs(album, discogsData);
          return;  // Discogs path already marks as completed
        }
        strapi.log.warn(`[enrichAlbum] Discogs ID "${album.discogs_id}" set but fetch failed for ${artist} - ${title}; falling back to search`);
      }

      // If we already have a MusicBrainz ID, fetch the release directly
      // (avoids the flaky text search and lets a manual refresh re-fetch cover/tracks).
      let mbData = null;
      if (album.mbid) {
        mbData = await this.getReleaseDetails(album.mbid);
      }

      // Otherwise search MusicBrainz by artist/title/barcode
      if (!mbData) {
        mbData = await this.searchMusicBrainz(artist, title, upc);
      }
      
      if (mbData && mbData.mbid) {
        await this.updateFromMusicBrainz(album, mbData);
      } else if (album.mbid) {
        // MusicBrainz is unavailable (e.g. rate limited) but we already have an mbid.
        // Preserve existing metadata/tracks and at least refresh the cover
        // (CAA via the mbid, then iTunes/Deezer as fallbacks).
        const coverId = await this.fetchBestCover(album, album.mbid);
        await strapi.documents('api::album.album').update({
          documentId: album.documentId,
          data: {
            metadata_status: 'completed',
            fetch_error: null,
            ...(coverId ? { cover: coverId } : {})
          }
        });
        return;
      } else {
        // Fallback to Discogs
        let discogsData = await this.searchDiscogs(artist, title, upc);
        if (discogsData) {
          await this.updateFromDiscogs(album, discogsData);
          return;  // Discogs path already marks as completed
        }

        // No metadata anywhere — still try to grab a cover from the
        // auth-free, MusicBrainz-independent sources (iTunes/Deezer).
        const coverId = await this.fetchBestCover(album);
        if (coverId) {
          await strapi.documents('api::album.album').update({
            documentId: album.documentId,
            data: { cover: coverId, metadata_status: 'completed', fetch_error: null }
          });
          return;
        }

        throw new Error('No metadata found in any source');
      }

      // Mark as completed (MusicBrainz path only - Discogs path returns early)
      await strapi.documents('api::album.album').update({
        documentId: album.documentId,
        data: { metadata_status: 'completed', fetch_error: null }
      });

    } catch (error: any) {
      strapi.log.error('Metadata enrichment failed:', error);
      await strapi.documents('api::album.album').update({
        documentId: album.documentId,
        data: { 
          metadata_status: 'failed', 
          fetch_error: error.message 
        }
      });
      throw error;
    }
  },

  // FR-2, FR-5: Search MusicBrainz
  async searchMusicBrainz(artist: string, title: string, upc?: string) {
    await mbRateLimit();
    
    try {
      let query = `artist:"${artist}" AND release:"${title}"`;
      if (upc) {
        query += ` AND barcode:"${upc}"`;
      }

      const response = await retryWithBackoff(() => 
        axios.get('https://musicbrainz.org/ws/2/release/', {
          params: { query, fmt: 'json', limit: 5 },
          timeout: 10000,
          headers: {
            'User-Agent': USER_AGENT
          }
        })
      ) || { data: { releases: [] } };

      const releases = response.data?.releases || [];
      if (releases.length === 0) return null;

      // Find best match
      const bestMatch = releases.find((r: any) => 
        r.barcode === upc || 
        r.title.toLowerCase() === title.toLowerCase()
      ) || releases[0];

      // Get detailed info for the matched release
      return await this.getReleaseDetails(bestMatch.id);

    } catch (error: any) {
      console.error('MusicBrainz search error:', error.message);
      return null;
    }
  },

  // Fetch a specific MusicBrainz release by its ID (recordings, artists, release group)
  async getReleaseDetails(mbid: string) {
    await mbRateLimit();

    try {
      const detailsResponse = await retryWithBackoff(() =>
        axios.get(
          `https://musicbrainz.org/ws/2/release/${mbid}`,
          {
            params: { 
              fmt: 'json', 
              inc: 'recordings+artists+release-groups' 
            },
            timeout: 10000,
            headers: {
              'User-Agent': USER_AGENT
            }
          }
        )
      ) || { data: {} };

      const details = detailsResponse.data;
      
      // Extract tracks
      const tracks: any[] = [];
      const media = details.media || [];
      let trackNumber = 1;
      
      for (const medium of media) {
        for (const track of (medium.tracks || [])) {
          tracks.push({
            track_number: trackNumber++,
            title: track.title,
            length: track.length ? Math.floor(track.length / 1000) : null,
            mbid: track.recording?.id
          });
        }
      }

      return {
        mbid: details.id || mbid,
        release_group_mbid: details['release-group']?.id || null,
        release_date: details.date || details['release-group']?.['first-release-date'],
        tracks,
        artist_credit: details['artist-credit']?.map((a: any) => a.name).join(', ')
      };

    } catch (error: any) {
      console.error('MusicBrainz release fetch error:', error.message);
      return null;
    }
  },

  // Fetch cover art for an album (release first, then release group) and store it.
  // Returns the uploaded file id, or null if no cover could be obtained.
  async fetchAndStoreCover(album: any, mbid: string, releaseGroupMbid?: string | null) {
    const coverUrl = await this.fetchCoverArtArchive(mbid, releaseGroupMbid);
    if (!coverUrl) return null;
    return await this.downloadAndUploadCover(coverUrl, album, 'CoverArtArchive');
  },

  // Try every available source to obtain a cover, in order of preference.
  // Cover Art Archive depends on MusicBrainz being reachable; iTunes and Deezer
  // are auth-free and on independent infrastructure, so they work even when
  // MusicBrainz/CAA are blocked or unreachable. Returns an uploaded file id or null.
  async fetchBestCover(album: any, mbid?: string | null, releaseGroupMbid?: string | null) {
    if (mbid) {
      const caa = await this.fetchAndStoreCover(album, mbid, releaseGroupMbid);
      if (caa) return caa;
    }

    const itunes = await this.fetchItunesCover(album);
    if (itunes) return itunes;

    const deezer = await this.fetchDeezerCover(album);
    if (deezer) return deezer;

    return null;
  },

  // Fetch a cover from the iTunes Search API (free, no auth required).
  async fetchItunesCover(album: any) {
    try {
      const response = await retryWithBackoff(() =>
        axios.get('https://itunes.apple.com/search', {
          params: {
            term: `${album.artist} ${album.title}`,
            entity: 'album',
            limit: 5
          },
          timeout: 10000,
          headers: { 'User-Agent': USER_AGENT }
        })
      ) || { data: { results: [] } };

      const results = response.data?.results || [];
      if (results.length === 0) return null;

      const match = results.find((r: any) =>
        r.collectionName?.toLowerCase() === album.title.toLowerCase()
      ) || results[0];

      let artwork = match.artworkUrl100 || match.artworkUrl60;
      if (!artwork) return null;

      // iTunes returns a small thumbnail by default; request a larger version
      // (600x600 stays comfortably under the 1MB cap as JPEG).
      artwork = artwork.replace(/\/\d+x\d+bb\.(jpg|png)/, '/600x600bb.$1');

      return await this.downloadAndUploadCover(artwork, album, 'iTunes');
    } catch (error: any) {
      strapi.log.warn(`[iTunes] Cover lookup failed for ${album.artist} - ${album.title}: ${error.message}`);
      return null;
    }
  },

  // Fetch a cover from the Deezer API (free, no auth required).
  async fetchDeezerCover(album: any) {
    try {
      const response = await retryWithBackoff(() =>
        axios.get('https://api.deezer.com/search/album', {
          params: {
            q: `artist:"${album.artist}" album:"${album.title}"`,
            limit: 5
          },
          timeout: 10000,
          headers: { 'User-Agent': USER_AGENT }
        })
      ) || { data: { data: [] } };

      const results = response.data?.data || [];
      if (results.length === 0) return null;

      const match = results.find((r: any) =>
        r.title?.toLowerCase() === album.title.toLowerCase()
      ) || results[0];

      // cover_big is 500x500; fall back to smaller sizes if missing.
      const artwork = match.cover_big || match.cover_medium || match.cover;
      if (!artwork) return null;

      return await this.downloadAndUploadCover(artwork, album, 'Deezer');
    } catch (error: any) {
      strapi.log.warn(`[Deezer] Cover lookup failed for ${album.artist} - ${album.title}: ${error.message}`);
      return null;
    }
  },

  // Update album from MusicBrainz data
  async updateFromMusicBrainz(album: any, mbData: any) {
    // FR-3: Fetch Cover Art (CAA first, then iTunes/Deezer as fallbacks)
    const coverId = await this.fetchBestCover(album, mbData.mbid, mbData.release_group_mbid);

    // Update album
    await strapi.documents('api::album.album').update({
      documentId: album.documentId,
      data: {
        mbid: mbData.mbid,
        release_date: mbData.release_date,
        cover: coverId,
        metadata_status: 'completed'
      }
    });

    // FR-4: Fetch Tracklist
    // Delete existing tracks
    const existingTracks = await strapi.documents('api::track.track').findMany({
      filters: { album: { documentId: album.documentId } }
    });
    
    for (const track of existingTracks) {
      await strapi.documents('api::track.track').delete({
        documentId: track.documentId
      });
    }

    // Create new tracks
    for (const trackData of mbData.tracks) {
      await strapi.documents('api::track.track').create({
        data: {
          ...trackData,
          album: album.documentId
        }
      });
    }
  },

  // FR-3: Fetch Cover Art from Cover Art Archive.
  // Tries the specific release first, then falls back to the release group
  // (many releases have no image while their release group does).
  async fetchCoverArtArchive(mbid: string, releaseGroupMbid?: string | null) {
    const release = await this.fetchCoverArtFrom(`http://coverartarchive.org/release/${mbid}`);
    if (release) return release;

    if (releaseGroupMbid) {
      return await this.fetchCoverArtFrom(`http://coverartarchive.org/release-group/${releaseGroupMbid}`);
    }

    return null;
  },

  // Fetch the best cover image URL from a Cover Art Archive endpoint
  async fetchCoverArtFrom(url: string) {
    try {
      const response = await retryWithBackoff(() => 
        axios.get(url, { timeout: 15000 })
      ) || { data: {} };

      const images = response.data?.images || [];

      // Prefer front cover
      for (const img of images) {
        if (img.types?.includes('Front')) {
          // 250px thumbnail keeps us safely under the 1MB cap
          return img.thumbnails?.small || img.thumbnails?.['250'] || img.thumbnails?.large || img.image;
        }
      }

      // Fallback to first image
      if (images.length > 0) {
        return images[0].thumbnails?.small || images[0].thumbnails?.['250'] || images[0].thumbnails?.large || images[0].image;
      }

      return null;
    } catch (error: any) {
      // 404 simply means no cover art at this endpoint
      // Timeout errors (ECONNRESET, ETIMEDOUT, etc.) are common with CAA
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        strapi.log.warn(`[CAA] Timeout fetching ${url}: ${error.code}`);
      } else if (error.response?.status !== 404) {
        strapi.log.warn(`[CAA] Fetch failed (${url}): ${error.message}`);
      }
      return null;
    }
  },

  // Build the Discogs Authorization header from env config.
  // Supports either a consumer key/secret pair (from a Discogs "application")
  // or a personal access token. Returns null if neither is configured.
  getDiscogsAuthHeader() {
    const key = process.env.DISCOGS_CONSUMER_KEY;
    const secret = process.env.DISCOGS_CONSUMER_SECRET;
    if (key && secret) {
      return `Discogs key=${key}, secret=${secret}`;
    }

    const token = process.env.DISCOGS_TOKEN;
    if (token) {
      return `Discogs token=${token}`;
    }

    return null;
  },

  // Search Discogs as fallback
  async searchDiscogs(artist: string, title: string, upc?: string) {
    const authHeader = this.getDiscogsAuthHeader();
    
    if (!authHeader) {
      console.warn('No Discogs credentials configured');
      return null;
    }

    try {
      const response = await retryWithBackoff(() =>
        axios.get('https://api.discogs.com/database/search', {
          params: {
            q: `${artist} ${title}`,
            type: 'release',
            per_page: 5
          },
          headers: {
            'Authorization': authHeader,
            'User-Agent': USER_AGENT
          }
        })
      ) || { data: { results: [] } };

      const results = response.data?.results || [];
      if (results.length === 0) return null;

      // Try to match by barcode
      let match = results[0];
      if (upc) {
        for (const r of results) {
          if (r.barcode?.includes(upc)) {
            match = r;
            break;
          }
        }
      }

      // Get full release details
      return await this.getDiscogsReleaseById(match.id);

    } catch (error: any) {
      console.error('Discogs search error:', error.message);
      return null;
    }
  },

  // Extract a numeric Discogs release id from a raw id, a "[rNNN]" reference,
  // or a discogs.com release URL (e.g. https://www.discogs.com/release/249504-Foo).
  parseDiscogsReleaseId(ref: any): string | null {
    if (!ref && ref !== 0) return null;
    const str = String(ref).trim();
    if (!str) return null;

    // discogs.com/release/123456 or /releases/123456
    const urlMatch = str.match(/releases?\/(\d+)/i);
    if (urlMatch) return urlMatch[1];

    // [r123456] reference style
    const bracketMatch = str.match(/\[?r(\d+)\]?/i);
    if (bracketMatch) return bracketMatch[1];

    // Plain numeric id
    if (/^\d+$/.test(str)) return str;

    // Last resort: first run of digits
    const anyDigits = str.match(/(\d+)/);
    return anyDigits ? anyDigits[1] : null;
  },

  // Normalize a Discogs release details payload into the shape used by updateFromDiscogs.
  parseDiscogsRelease(details: any, releaseId: string) {
    if (!details || !details.id) return null;

    const tracks = (details.tracklist || [])
      // Discogs tracklists can contain headings/index entries with no position
      .filter((track: any) => track.type_ === undefined || track.type_ === 'track')
      .map((track: any, idx: number) => {
        // Parse duration MM:SS to seconds
        let length = null;
        if (track.duration) {
          const parts = track.duration.split(':').map(Number);
          if (parts.length === 2) {
            length = parts[0] * 60 + parts[1];
          }
        }

        return {
          track_number: idx + 1,
          title: track.title,
          length
        };
      });

    return {
      discogs_id: String(details.id || releaseId),
      release_date: details.year?.toString(),
      tracks,
      images: details.images,
      artist: (details.artists || []).map((a: any) => a.name).join(', ') || undefined,
      title: details.title
    };
  },

  // Fetch a specific Discogs release directly by ID (or a URL / "[rNNN]" ref).
  // This bypasses the fuzzy text search, which fails for hard-to-match albums.
  async getDiscogsReleaseById(ref: any) {
    const authHeader = this.getDiscogsAuthHeader();
    if (!authHeader) {
      console.warn('No Discogs credentials configured');
      return null;
    }

    const releaseId = this.parseDiscogsReleaseId(ref);
    if (!releaseId) {
      strapi.log.warn(`[Discogs] Could not parse a release id from "${ref}"`);
      return null;
    }

    try {
      const detailsResponse = await retryWithBackoff(() =>
        axios.get(`https://api.discogs.com/releases/${releaseId}`, {
          headers: {
            'Authorization': authHeader,
            'User-Agent': USER_AGENT
          }
        })
      ) || { data: {} };

      return this.parseDiscogsRelease(detailsResponse.data, releaseId);
    } catch (error: any) {
      strapi.log.error(`[Discogs] Failed to fetch release ${releaseId}: ${error.message}`);
      return null;
    }
  },

  // Update from Discogs data
  async updateFromDiscogs(album: any, discogsData: any) {
    // Try to download cover from Discogs
    let coverId = null;
    if (discogsData.images && discogsData.images.length > 0) {
      const coverUrl = discogsData.images[0].resource_url || discogsData.images[0].uri;
      strapi.log.info(`[Discogs] Fetching cover for ${album.artist} - ${album.title} from ${coverUrl.substring(0, 80)}...`);
      coverId = await this.downloadAndUploadCover(coverUrl, album, 'Discogs');
      if (!coverId) {
        strapi.log.warn(`[Discogs] Cover download/upload failed for ${album.artist} - ${album.title}`);
      }
    } else {
      strapi.log.info(`[Discogs] No images available for ${album.artist} - ${album.title}`);
    }

    // If Discogs couldn't provide a cover, try the auth-free fallbacks.
    if (!coverId) {
      coverId = await this.fetchItunesCover(album) || await this.fetchDeezerCover(album);
    }

    // Update album
    await strapi.documents('api::album.album').update({
      documentId: album.documentId,
      data: {
        discogs_id: discogsData.discogs_id,
        release_date: discogsData.release_date,
        cover: coverId,
        metadata_status: 'completed'
      }
    });

    // Delete existing tracks
    const existingTracks = await strapi.documents('api::track.track').findMany({
      filters: { album: { documentId: album.documentId } }
    });
    
    for (const track of existingTracks) {
      await strapi.documents('api::track.track').delete({
        documentId: track.documentId
      });
    }

    // Create new tracks
    for (const trackData of discogsData.tracks) {
      await strapi.documents('api::track.track').create({
        data: {
          ...trackData,
          album: album.documentId
        }
      });
    }
  },

  // Download cover image and upload to Strapi (SRS: max 1MB)
  async downloadAndUploadCover(url: string, album: any, source: string = 'unknown') {
    try {
      strapi.log.info(`[${source}] Downloading cover from ${url.substring(0, 80)}... for ${album.artist} - ${album.title}`);
      
      const response = await retryWithBackoff(() =>
        axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxContentLength: 1000000, // 1MB limit per SRS
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://www.discogs.com/'
          }
        })
      ) || { data: Buffer.from([]) };

      // Check size
      if (response.data.length > 1000000) {
        strapi.log.warn(`[${source}] Cover image too large (${response.data.length} bytes > 1MB), skipping`);
        return null;
      }

      // Save to temp file
      const tempFile = path.join(os.tmpdir(), `cover_${album.documentId}_${Date.now()}.jpg`);
      fs.writeFileSync(tempFile, Buffer.from(response.data));
      strapi.log.info(`[${source}] Cover saved to temp file: ${tempFile} (${response.data.length} bytes)`);

      // Upload to Strapi
      const uploadService = strapi.plugin('upload').service('upload');
      
      // Use UPC in filename if available, otherwise use album documentId prefix
      const fileId = album.upc || album.documentId.substring(0, 8);
      const uploadData = {
        data: {
          fileInfo: {
            name: `cover_${fileId}.jpg`,
            alternativeText: `${album.artist} - ${album.title} cover`,
            caption: `Album cover for ${album.title}`
          }
        },
        files: {
          filepath: tempFile,
          originalFilename: `cover_${fileId}.jpg`,
          mimetype: 'image/jpeg',
          size: response.data.length
        }
      };

      strapi.log.info(`[${source}] Uploading cover to Strapi...`);
      const uploadedFiles = await uploadService.upload(uploadData);
      strapi.log.info(`[${source}] Upload complete. Files returned: ${uploadedFiles?.length || 0}`);
      
      // Cleanup temp file
      fs.unlinkSync(tempFile);

      const fileIdReturned = uploadedFiles[0]?.id || null;
      strapi.log.info(`[${source}] Cover file ID: ${fileIdReturned}`);
      return fileIdReturned;

    } catch (error: any) {
      strapi.log.error(`[${source}] Cover download/upload error: ${error.message}`);
      if (error.response) {
        strapi.log.error(`[${source}] Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      return null;
    }
  },

  // Background job to enrich pending albums
  async enrichPendingAlbums() {
    try {
      // Count total pending
      const totalPending = await strapi.documents('api::album.album').count({
        filters: { metadata_status: 'pending' }
      });
      strapi.log.info(`[enrichPendingAlbums] Total pending albums: ${totalPending}`);

      if (totalPending === 0) {
        strapi.log.info('[enrichPendingAlbums] No pending albums to process');
        return;
      }

      const pending = await strapi.documents('api::album.album').findMany({
        filters: { metadata_status: 'pending' },
        limit: 50
      });

      strapi.log.info(`[enrichPendingAlbums] Processing batch of ${pending.length} albums`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pending.length; i++) {
        const album = pending[i];
        strapi.log.info(`[enrichPendingAlbums] Processing ${i + 1}/${pending.length}: ${album.artist} - ${album.title}`);

        try {
          await this.enrichAlbum(album);
          successCount++;
          strapi.log.info(`[enrichPendingAlbums] ✓ Success: ${album.artist} - ${album.title}`);
        } catch (error: any) {
          errorCount++;
          strapi.log.error(`[enrichPendingAlbums] ✗ Failed: ${album.artist} - ${album.title}:`, error.message);
        }

        // Small delay to respect rate limits (1.5s between albums)
        if (i < pending.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      strapi.log.info(`[enrichPendingAlbums] Batch complete. Success: ${successCount}, Failed: ${errorCount}, Remaining: ${totalPending - pending.length}`);
    } catch (error: any) {
      strapi.log.error('[enrichPendingAlbums] Fatal error:', error.message);
    }
  },

  // Backfill: try to fetch covers for existing albums that have none, using the
  // auth-free, MusicBrainz-independent sources (iTunes/Deezer, plus CAA if an
  // mbid is already present). Does not touch existing metadata or tracks.
  async fetchMissingCovers() {
    try {
      const totalMissing = await strapi.documents('api::album.album').count({
        filters: { cover: { id: { $null: true } } }
      });
      strapi.log.info(`[fetchMissingCovers] Albums missing a cover: ${totalMissing}`);

      if (totalMissing === 0) {
        strapi.log.info('[fetchMissingCovers] Nothing to do');
        return;
      }

      const albums = await strapi.documents('api::album.album').findMany({
        filters: { cover: { id: { $null: true } } },
        populate: ['cover'],
        limit: 50
      });

      strapi.log.info(`[fetchMissingCovers] Processing batch of ${albums.length} albums`);

      let foundCount = 0;
      let missCount = 0;

      for (let i = 0; i < albums.length; i++) {
        const album = albums[i];
        strapi.log.info(`[fetchMissingCovers] Processing ${i + 1}/${albums.length}: ${album.artist} - ${album.title}`);

        try {
          const coverId = await this.fetchBestCover(album, album.mbid);
          if (coverId) {
            await strapi.documents('api::album.album').update({
              documentId: album.documentId,
              data: { cover: coverId }
            });
            foundCount++;
            strapi.log.info(`[fetchMissingCovers] ✓ Cover found: ${album.artist} - ${album.title}`);
          } else {
            missCount++;
            strapi.log.info(`[fetchMissingCovers] ✗ No cover: ${album.artist} - ${album.title}`);
          }
        } catch (error: any) {
          missCount++;
          strapi.log.error(`[fetchMissingCovers] Error for ${album.artist} - ${album.title}:`, error.message);
        }

        // Small delay to be polite to the external APIs
        if (i < albums.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      strapi.log.info(`[fetchMissingCovers] Batch complete. Found: ${foundCount}, Still missing: ${missCount}, Remaining overall: ${totalMissing - albums.length}`);
    } catch (error: any) {
      strapi.log.error('[fetchMissingCovers] Fatal error:', error.message);
    }
  }
};
