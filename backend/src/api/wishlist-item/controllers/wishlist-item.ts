import { factories } from '@strapi/strapi';
import fs from 'fs';
import {
  parsePagination,
  sanitizeText,
  detectImageType,
  validateAlbumInput
} from '../../album/validation';
import {
  parseWishlistSort,
  parseWishlistSearchField,
  validateWishlistInput
} from '../validation';

export default factories.createCoreController('api::wishlist-item.wishlist-item', ({ strapi }) => ({
  // Search and Browse
  async search(ctx) {
    const { q } = ctx.query;
    const { page, pageSize } = parsePagination(ctx.query);
    const sort = parseWishlistSort(ctx.query.sort);
    const searchBy = parseWishlistSearchField(ctx.query.searchBy);

    const filters: any = {};

    if (q) {
      if (searchBy === 'all') {
        filters.$or = [
          { artist: { $containsi: q } },
          { title: { $containsi: q } },
          { notes: { $containsi: q } }
        ];
      } else if (searchBy === 'title') {
        filters.title = { $containsi: q };
      } else {
        filters.artist = { $containsi: q };
      }
    }

    const items = await strapi.documents('api::wishlist-item.wishlist-item').findMany({
      filters,
      populate: ['cover'],
      sort: sort as any,
      start: (page - 1) * pageSize,
      limit: pageSize
    });

    const count = await strapi.documents('api::wishlist-item.wishlist-item').count({ filters });

    return {
      data: items,
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

  // Override findOne to populate cover (Strapi 5 does not populate by default)
  async findOne(ctx) {
    const { id } = ctx.params;

    const item = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
      documentId: id,
      populate: ['cover']
    });

    if (!item) {
      return ctx.notFound('Wishlist item not found');
    }

    return { data: item };
  },

  // Create single wishlist item manually
  async create(ctx) {
    const { artist, title, upc, release_date, url, notes } = ctx.request.body;

    const validationError = validateWishlistInput(
      { artist, title, upc, release_date, url, notes },
      { requireArtist: true }
    );
    if (validationError) {
      return ctx.badRequest(validationError);
    }

    try {
      const item = await strapi.documents('api::wishlist-item.wishlist-item').create({
        data: {
          artist: sanitizeText(artist),
          title: title ? sanitizeText(title) : null,
          upc: upc ? String(upc).trim() : null,
          release_date: release_date || null,
          url: url ? String(url).trim() : null,
          notes: notes ? sanitizeText(notes) : null
        }
      });

      return { data: item };
    } catch (error: any) {
      return ctx.badRequest('Failed to create wishlist item: ' + error.message);
    }
  },

  // Update wishlist item
  async update(ctx) {
    const { id } = ctx.params;
    const { artist, title, upc, release_date, url, notes } = ctx.request.body;

    const validationError = validateWishlistInput(
      { artist, title, upc, release_date, url, notes },
      { requireArtist: false }
    );
    if (validationError) {
      return ctx.badRequest(validationError);
    }

    if (artist !== undefined && (!artist || String(artist).trim() === '')) {
      return ctx.badRequest('Artist is required');
    }

    const item = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
      documentId: id
    });

    if (!item) {
      return ctx.notFound('Wishlist item not found');
    }

    try {
      await strapi.documents('api::wishlist-item.wishlist-item').update({
        documentId: id,
        data: {
          ...(artist !== undefined && { artist: sanitizeText(artist) }),
          ...(title !== undefined && { title: title ? sanitizeText(title) : null }),
          ...(upc !== undefined && { upc: upc ? String(upc).trim() : null }),
          ...(release_date !== undefined && { release_date: release_date || null }),
          ...(url !== undefined && { url: url ? String(url).trim() : null }),
          ...(notes !== undefined && { notes: notes ? sanitizeText(notes) : null })
        }
      });

      // Fetch populated item for response
      const updated = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
        documentId: id,
        populate: ['cover']
      });

      return { data: updated };
    } catch (error: any) {
      return ctx.badRequest('Failed to update wishlist item: ' + error.message);
    }
  },

  // Upload/replace wishlist item cover
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

    const item = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
      documentId: id,
      populate: ['cover']
    }) as any;

    if (!item) {
      return ctx.notFound('Wishlist item not found');
    }

    try {
      const uploadService = strapi.plugin('upload').service('upload');

      // Delete old cover if exists
      if (item.cover && item.cover.documentId) {
        try {
          await strapi.documents('plugin::upload.file').delete({
            documentId: item.cover.documentId
          });
        } catch (e) {
          // Ignore if already deleted
        }
      }

      // Upload new cover
      const uploadData = {
        data: {
          fileInfo: {
            name: `wishlist_cover_${item.documentId}.jpg`,
            alternativeText: `${item.artist} - ${item.title || 'Untitled'} cover`,
            caption: `Cover for ${item.title || 'Untitled'}`
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

      // Update item with new cover
      await strapi.documents('api::wishlist-item.wishlist-item').update({
        documentId: id,
        data: { cover: coverId }
      });

      // Fetch populated item for response
      const updated = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
        documentId: id,
        populate: ['cover']
      });

      return { data: updated };
    } catch (error: any) {
      return ctx.badRequest('Cover upload failed: ' + error.message);
    }
  },

  // Mark as purchased: create an album from the wishlist item and remove it
  async purchase(ctx) {
    const { id } = ctx.params;
    const { upc, artist, title, release_date, mbid, discogs_id } = ctx.request.body;

    const item = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
      documentId: id,
      populate: ['cover']
    }) as any;

    if (!item) {
      return ctx.notFound('Wishlist item not found');
    }

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
          cover: item.cover?.id ?? null,
          metadata_status: 'pending'
        }
      });

      // Remove the wishlist item; the cover file stays (now owned by the album)
      await strapi.documents('api::wishlist-item.wishlist-item').delete({
        documentId: id
      });

      const populated = await strapi.documents('api::album.album').findOne({
        documentId: album.documentId,
        populate: ['tracks', 'cover']
      });

      return { data: populated };
    } catch (error: any) {
      return ctx.badRequest('Failed to mark as purchased: ' + error.message);
    }
  },

  // Delete wishlist item and associated cover
  async delete(ctx) {
    const { id } = ctx.params;

    const item = await strapi.documents('api::wishlist-item.wishlist-item').findOne({
      documentId: id,
      populate: ['cover']
    }) as any;

    if (!item) {
      return ctx.notFound('Wishlist item not found');
    }

    try {
      // Delete cover file if exists
      if (item.cover && item.cover.documentId) {
        try {
          await strapi.documents('plugin::upload.file').delete({
            documentId: item.cover.documentId
          });
        } catch (e) {
          // Ignore if already deleted or error
        }
      }

      // Delete the item
      await strapi.documents('api::wishlist-item.wishlist-item').delete({
        documentId: id
      });

      return { success: true, message: 'Wishlist item deleted successfully' };
    } catch (error: any) {
      return ctx.badRequest('Failed to delete wishlist item: ' + error.message);
    }
  }
}));
