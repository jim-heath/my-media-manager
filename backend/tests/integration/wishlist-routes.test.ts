import request from 'supertest';
import { setupStrapi, cleanupStrapi } from '../helpers/strapi';

let strapiInstance: any;

beforeAll(async () => {
  strapiInstance = await setupStrapi();
});

afterAll(async () => {
  await cleanupStrapi();
});

const http = () => request(strapiInstance.server.httpServer);

// A request is considered "blocked" when it is rejected for lack of auth.
const isUnauthorized = (status: number) => [401, 403].includes(status);

describe('Wishlist route authentication', () => {
  describe('public read access', () => {
    it('GET /api/wishlist-items is publicly accessible', async () => {
      const res = await http().get('/api/wishlist-items');
      expect(res.status).toBe(200);
    });

    it('GET /api/wishlist-items/search is publicly accessible', async () => {
      const res = await http().get('/api/wishlist-items/search');
      expect(res.status).toBe(200);
    });
  });

  describe('protected write access (no token)', () => {
    it('rejects POST /api/wishlist-items', async () => {
      const res = await http()
        .post('/api/wishlist-items')
        .send({ artist: 'Test' });
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects PUT /api/wishlist-items/:id', async () => {
      const res = await http()
        .put('/api/wishlist-items/some-document-id')
        .send({ title: 'Changed' });
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects DELETE /api/wishlist-items/:id', async () => {
      const res = await http().delete('/api/wishlist-items/some-document-id');
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects POST /api/wishlist-items/:id/cover', async () => {
      const res = await http().post('/api/wishlist-items/some-document-id/cover');
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects POST /api/wishlist-items/:id/purchase', async () => {
      const res = await http()
        .post('/api/wishlist-items/some-document-id/purchase')
        .send({ artist: 'Test', title: 'Test' });
      expect(isUnauthorized(res.status)).toBe(true);
    });
  });
});
