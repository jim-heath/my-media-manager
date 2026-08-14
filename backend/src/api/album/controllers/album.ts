import { factories } from '@strapi/strapi';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  validateAlbumInput,
  sanitizeText,
  parsePagination,
  parseSort,
  parseSearchField,
  escapeCsvFormula,
  detectImageType
} from '../validation';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMPORT_ROWS = 10000;

export default factories.createCoreController('api::album.album', ({ strapi }) => ({
  // FR-1: Import Collection
  async import(ctx) {
    const { files } = ctx.request;
    
    if (!files || !files.file) {
      return ctx.badRequest('No file uploaded');
    }

    const file: any = Array.isArray(files.file) ? files.file[0] : files.file;

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      return ctx.badRequest('CSV file too large. Maximum size is 5MB.');
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      const buffer = fs.readFileSync(file.filepath || file.path);
      const lines = buffer.toString().split('\n').filter(line => line.trim());

      if (lines.length - 1 > MAX_IMPORT_ROWS) {
        return ctx.badRequest(`CSV has too many rows. Maximum is ${MAX_IMPORT_ROWS}.`);
      }
      
      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        const upc = (row.upc || '').trim();
        const artist = row.artist || '';
        const title = row.title || '';

        // UPC is optional (some CDs have no barcode); artist + title are required
        if (!artist || !title) {
          results.failed++;
          results.errors.push(`Line ${i + 1}: Missing required fields (artist and title)`);
          continue;
        }

        try {
          // Match on UPC when present, otherwise fall back to artist + title
          const existing = upc
            ? await strapi.documents('api::album.album').findFirst({
                filters: { upc }
              })
            : await strapi.documents('api::album.album').findFirst({
                filters: { artist, title }
              });

          if (existing) {
            // Update existing album
            await strapi.documents('api::album.album').update({
              documentId: existing.documentId,
              data: {
                artist,
                title,
                metadata_status: 'pending'
              }
            });
          } else {
            // Create new album (store null when no UPC so the unique constraint allows many)
            await strapi.documents('api::album.album').create({
              data: {
                upc: upc || null,
                artist,
                title,
                metadata_status: 'pending'
              }
            });
          }
          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Line ${i + 1}: ${err.message}`);
        }
      }

      // Trigger metadata enrichment in background
      const metadataService = strapi.service('api::metadata.metadata');
      if (metadataService) {
        metadataService.enrichPendingAlbums();
      }

      return results;
    } catch (error: any) {
      return ctx.badRequest('Error processing CSV: ' + error.message);
    }
  },

  // FR-7: Export Dataset
  async exportCsv(ctx) {
    const albums = await strapi.documents('api::album.album').findMany({
      populate: ['tracks'],
      sort: ['artist:asc', 'title:asc']
    });

    const tempFile = path.join(os.tmpdir(), `albums_export_${Date.now()}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: tempFile,
      header: [
        { id: 'upc', title: 'upc' },
        { id: 'artist', title: 'artist' },
        { id: 'title', title: 'title' },
        { id: 'release_date', title: 'release_date' },
        { id: 'mbid', title: 'mbid' },
        { id: 'discogs_id', title: 'discogs_id' },
        { id: 'track_count', title: 'track_count' }
      ]
    });

    const records = albums.map(album => ({
      upc: escapeCsvFormula(album.upc),
      artist: escapeCsvFormula(album.artist),
      title: escapeCsvFormula(album.title),
      release_date: escapeCsvFormula(album.release_date || ''),
      mbid: escapeCsvFormula(album.mbid || ''),
      discogs_id: escapeCsvFormula(album.discogs_id || ''),
      track_count: (album as any).tracks?.length || 0
    }));

    await csvWriter.writeRecords(records);

    ctx.set('Content-Type', 'text/csv');
    ctx.set('Content-Disposition', 'attachment; filename=albums.csv');
    ctx.body = fs.createReadStream(tempFile);

    // Cleanup after sending
    ctx.res.on('finish', () => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Already removed or inaccessible; nothing to do
      }
    });
  },

  async exportJson(ctx) {
    const albums = await strapi.documents('api::album.album').findMany({
      populate: ['tracks'],
      sort: ['artist:asc', 'title:asc']
    });

    ctx.set('Content-Type', 'application/json');
    ctx.set('Content-Disposition', 'attachment; filename=albums.json');
    ctx.body = JSON.stringify(albums, null, 2);
  },

  // FR-6: Search and Browse
  async search(ctx) {
    const { q, artist } = ctx.query;
    const { page, pageSize } = parsePagination(ctx.query);
    const sort = parseSort(ctx.query.sort);
    const searchBy = parseSearchField(ctx.query.searchBy);

    const filters: any = {};

    if (q) {
      if (searchBy === 'all') {
        filters.$or = [
          { artist: { $containsi: q } },
          { title: { $containsi: q } },
          { release_date: { $containsi: q } }
        ];
      } else if (searchBy === 'year') {
        filters.release_date = { $containsi: q };
      } else if (searchBy === 'title') {
        filters.title = { $containsi: q };
      } else {
        filters.artist = { $containsi: q };
      }
    }

    if (artist) {
      filters.artist = { $containsi: artist };
    }

    const albums = await strapi.documents('api::album.album').findMany({
      filters,
      populate: ['tracks', 'cover'],
      sort: sort as any,
      start: (page - 1) * pageSize,
      limit: pageSize
    });

    const count = await strapi.documents('api::album.album').count({ filters });

    return {
      data: albums,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(count / pageSize),
          total: count
        }
      }
    };
  },

  // Override findOne to populate cover and tracks (Strapi 5 does not populate by default)
  async findOne(ctx) {
    const { id } = ctx.params;

    const album = await strapi.documents('api::album.album').findOne({
      documentId: id,
      populate: ['tracks', 'cover']
    });

    if (!album) {
      return ctx.notFound('Album not found');
    }

    return { data: album };
  },

  // Trigger metadata enrichment
  async enrich(ctx) {
    const { id } = ctx.params;
    
    const album = await strapi.documents('api::album.album').findOne({
      documentId: id
    });
    
    if (!album) {
      return ctx.notFound('Album not found');
    }

    try {
      const metadataService = strapi.service('api::metadata.metadata');
      await metadataService.enrichAlbum(album);
      
      const updated = await strapi.documents('api::album.album').findOne({
        documentId: id,
        populate: ['tracks', 'cover']
      });
      
      return { data: updated };
    } catch (error: any) {
      return ctx.badRequest('Enrichment failed: ' + error.message);
    }
  },

  // Manually save an album's tracklist (replaces all existing tracks)
  async saveTracks(ctx) {
    const { id } = ctx.params;
    const { tracks } = ctx.request.body;

    if (!Array.isArray(tracks)) {
      return ctx.badRequest('tracks must be an array');
    }

    const album = await strapi.documents('api::album.album').findOne({
      documentId: id
    });

    if (!album) {
      return ctx.notFound('Album not found');
    }

    // Validate and normalize incoming tracks
    const sanitize = (str: string) => String(str).replace(/[<>]/g, '').trim();
    const normalized: { track_number: number; title: string; length: number | null }[] = [];

    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      const title = t && t.title != null ? sanitize(t.title) : '';
      if (!title) {
        return ctx.badRequest(`Track ${i + 1} is missing a title`);
      }
      if (title.length > 255) {
        return ctx.badRequest(`Track ${i + 1} title must be less than 255 characters`);
      }

      let length: number | null = null;
      if (t.length !== undefined && t.length !== null && t.length !== '') {
        const parsed = Number(t.length);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return ctx.badRequest(`Track ${i + 1} has an invalid length`);
        }
        length = Math.round(parsed);
      }

      normalized.push({
        track_number: i + 1, // renumber sequentially in submitted order
        title,
        length
      });
    }

    try {
      // Remove existing tracks for this album
      const existingTracks = await strapi.documents('api::track.track').findMany({
        filters: { album: { documentId: id } }
      });
      for (const track of existingTracks) {
        await strapi.documents('api::track.track').delete({
          documentId: track.documentId
        });
      }

      // Create the new tracks
      for (const trackData of normalized) {
        await strapi.documents('api::track.track').create({
          data: {
            ...trackData,
            album: id
          }
        });
      }

      // A manual tracklist means metadata is no longer "failed"/"pending"
      await strapi.documents('api::album.album').update({
        documentId: id,
        data: { metadata_status: 'completed', fetch_error: null }
      });

      const updated = await strapi.documents('api::album.album').findOne({
        documentId: id,
        populate: ['tracks', 'cover']
      });

      return { data: updated };
    } catch (error: any) {
      return ctx.badRequest('Failed to save tracks: ' + error.message);
    }
  },

  // Create single album manually
  async create(ctx) {
    const { upc, artist, title, release_date, mbid, discogs_id } = ctx.request.body;

    const validationError = validateAlbumInput(
      { upc, artist, title, release_date, mbid, discogs_id },
      { requireNames: true }
    );
    if (validationError) {
      return ctx.badRequest(validationError);
    }

    try {
      const album = await strapi.documents('api::album.album').create({
        data: {
          upc: upc ? upc.trim() : null,
          artist: sanitizeText(artist),
          title: sanitizeText(title),
          release_date: release_date || null,
          mbid: mbid ? mbid.trim() : null,
          discogs_id: discogs_id ? String(discogs_id).trim() : null,
          metadata_status: 'pending'
        }
      });

      return { data: album };
    } catch (error: any) {
      return ctx.badRequest('Failed to create album: ' + error.message);
    }
  },

  // Update album metadata
  async update(ctx) {
    const { id } = ctx.params;
    const { upc, artist, title, release_date, mbid, discogs_id } = ctx.request.body;

    const validationError = validateAlbumInput(
      { upc, artist, title, release_date, mbid, discogs_id },
      { requireNames: false }
    );
    if (validationError) {
      return ctx.badRequest(validationError);
    }

    const album = await strapi.documents('api::album.album').findOne({
      documentId: id
    });

    if (!album) {
      return ctx.notFound('Album not found');
    }

    try {
      await strapi.documents('api::album.album').update({
        documentId: id,
        data: {
          ...(upc !== undefined && { upc: upc ? upc.trim() : null }),
          ...(artist !== undefined && { artist: sanitizeText(artist) }),
          ...(title !== undefined && { title: sanitizeText(title) }),
          ...(release_date !== undefined && { release_date: release_date || null }),
          ...(mbid !== undefined && { mbid: mbid ? mbid.trim() : null }),
          ...(discogs_id !== undefined && { discogs_id: discogs_id ? String(discogs_id).trim() : null })
        }
      });

      // Fetch populated album for response
      const updated = await strapi.documents('api::album.album').findOne({
        documentId: id,
        populate: ['tracks', 'cover']
      });

      return { data: updated };
    } catch (error: any) {
      return ctx.badRequest('Failed to update album: ' + error.message);
    }
  },

  // Upload/replace album cover
  async uploadCover(ctx) {
    const { id } = ctx.params;
    const { files } = ctx.request;
    
    if (!files || !files.cover) {
      return ctx.badRequest('No cover image uploaded');
    }

    // Validate file size (max 5MB)
    const file: any = Array.isArray(files.cover) ? files.cover[0] : files.cover;
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return ctx.badRequest('File too large. Maximum size is 5MB.');
    }

    // Validate file type via magic bytes (client-supplied MIME types are spoofable)
    let detectedType: ReturnType<typeof detectImageType>;
    try {
      const fd = fs.openSync(file.filepath || file.path, 'r');
      const header = Buffer.alloc(12);
      fs.readSync(fd, header, 0, 12, 0);
      fs.closeSync(fd);
      detectedType = detectImageType(header);
    } catch (e) {
      return ctx.badRequest('Could not read uploaded file.');
    }
    if (!detectedType) {
      return ctx.badRequest('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    const album = await strapi.documents('api::album.album').findOne({
      documentId: id,
      populate: ['cover']
    }) as any;
    
    if (!album) {
      return ctx.notFound('Album not found');
    }

    try {
      const uploadService = strapi.plugin('upload').service('upload');

      // Delete old cover if exists
      if (album.cover && album.cover.documentId) {
        try {
          await strapi.documents('plugin::upload.file').delete({
            documentId: album.cover.documentId
          });
        } catch (e) {
          // Ignore if already deleted
        }
      }

      // Upload new cover
      const uploadData = {
        data: {
          fileInfo: {
            name: `cover_${album.documentId}.jpg`,
            alternativeText: `${album.artist} - ${album.title} cover`,
            caption: `Album cover for ${album.title}`
          }
        },
        files: {
          filepath: file.filepath || file.path,
          originalFilename: file.originalFilename || file.name || 'cover.jpg',
          mimetype: file.mimetype || file.type || 'image/jpeg',
          size: file.size
        }
      };

      const uploadedFiles = await uploadService.upload(uploadData);
      const coverId = uploadedFiles[0]?.id || null;

      // Update album with new cover
      await strapi.documents('api::album.album').update({
        documentId: id,
        data: { cover: coverId }
      });

      // Fetch populated album for response
      const updated = await strapi.documents('api::album.album').findOne({
        documentId: id,
        populate: ['tracks', 'cover']
      });

      return { data: updated };
    } catch (error: any) {
      return ctx.badRequest('Cover upload failed: ' + error.message);
    }
  },

  // Delete album and associated data
  async delete(ctx) {
    const { id } = ctx.params;
    
    const album = await strapi.documents('api::album.album').findOne({
      documentId: id,
      populate: ['tracks', 'cover']
    }) as any;
    
    if (!album) {
      return ctx.notFound('Album not found');
    }

    try {
      // Delete cover file if exists
      if (album.cover && album.cover.documentId) {
        try {
          await strapi.documents('plugin::upload.file').delete({
            documentId: album.cover.documentId
          });
        } catch (e) {
          // Ignore if already deleted or error
        }
      }

      // Delete associated tracks
      if (album.tracks && album.tracks.length > 0) {
        for (const track of album.tracks) {
          try {
            await strapi.documents('api::track.track').delete({
              documentId: track.documentId
            });
          } catch (e) {
            // Continue with other tracks
          }
        }
      }

      // Delete the album
      await strapi.documents('api::album.album').delete({
        documentId: id
      });

      return { success: true, message: 'Album deleted successfully' };
    } catch (error: any) {
      return ctx.badRequest('Failed to delete album: ' + error.message);
    }
  },

  // Identify albums with metadata errors or missing covers
  async issues(ctx) {
    const { page, pageSize } = parsePagination(ctx.query);
    const sort = parseSort(ctx.query.sort);

    const filters: any = {
      $or: [
        { metadata_status: 'failed' },
        { cover: null }
      ]
    };

    const albums = await strapi.documents('api::album.album').findMany({
      filters,
      populate: ['tracks', 'cover'],
      sort: sort as any,
      start: (page - 1) * pageSize,
      limit: pageSize
    });

    const count = await strapi.documents('api::album.album').count({ filters });

    const data = albums.map((album: any) => {
      const issues: string[] = [];
      if (!album.cover) {
        issues.push('missing_cover');
      }
      if (album.metadata_status === 'failed') {
        issues.push('metadata_error');
      }
      return {
        ...album,
        issues
      };
    });

    return {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(count / pageSize),
          total: count
        }
      }
    };
  },

  // Backfill covers for albums that currently have none (iTunes/Deezer/CAA)
  async fetchCovers(ctx: any) {
    try {
      strapi.log.info('[fetchCovers] Manual trigger started');
      const metadataService = strapi.service('api::metadata.metadata');

      if (!metadataService) {
        return ctx.badRequest('Metadata service not found');
      }

      // Run in background so we can return immediately
      metadataService.fetchMissingCovers().catch((error: any) => {
        strapi.log.error('[fetchCovers] Background cover fetch error:', error.message);
      });

      const missingCount = await strapi.documents('api::album.album').count({
        filters: { cover: { id: { $null: true } } } as any
      });

      return {
        success: true,
        message: `Cover fetch started for ${missingCount} albums missing a cover`,
        missingCount,
        note: 'Processing 50 albums per run from iTunes/Deezer. Check server logs for progress.'
      };
    } catch (error: any) {
      strapi.log.error('[fetchCovers] Error:', error.message);
      return ctx.badRequest('Failed to start cover fetch: ' + error.message);
    }
  },

  // Manually trigger enrichment of all pending albums
  async enrichPending(ctx: any) {
    try {
      strapi.log.info('[enrichPending] Manual trigger started');
      const metadataService = strapi.service('api::metadata.metadata');

      if (!metadataService) {
        return ctx.badRequest('Metadata service not found');
      }

      // Run enrichment in background so we can return immediately
      metadataService.enrichPendingAlbums().catch((error: any) => {
        strapi.log.error('[enrichPending] Background enrichment error:', error.message);
      });

      // Count pending albums for response
      const pendingCount = await strapi.documents('api::album.album').count({
        filters: { metadata_status: 'pending' }
      });

      return {
        success: true,
        message: `Enrichment started for ${pendingCount} pending albums`,
        pendingCount,
        note: 'Processing 50 albums every 5 minutes. Check server logs for progress.'
      };
    } catch (error: any) {
      strapi.log.error('[enrichPending] Error:', error.message);
      return ctx.badRequest('Failed to start enrichment: ' + error.message);
    }
  }
}));
