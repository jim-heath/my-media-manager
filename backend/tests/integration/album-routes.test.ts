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

describe('Album route authentication', () => {
  describe('public read access', () => {
    it('GET /api/albums is publicly accessible', async () => {
      const res = await http().get('/api/albums');
      expect(res.status).toBe(200);
    });
  });

  describe('protected write access (no token)', () => {
    it('rejects POST /api/albums', async () => {
      const res = await http()
        .post('/api/albums')
        .send({ artist: 'Test', title: 'Test' });
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects PUT /api/albums/:id', async () => {
      const res = await http()
        .put('/api/albums/some-document-id')
        .send({ title: 'Changed' });
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects DELETE /api/albums/:id', async () => {
      const res = await http().delete('/api/albums/some-document-id');
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects POST /api/albums/import', async () => {
      const res = await http().post('/api/albums/import');
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects GET /api/albums/export/csv', async () => {
      const res = await http().get('/api/albums/export/csv');
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects POST /api/albums/fetch-covers', async () => {
      const res = await http().post('/api/albums/fetch-covers');
      expect(isUnauthorized(res.status)).toBe(true);
    });

    it('rejects PUT /api/albums/:id/tracks', async () => {
      const res = await http()
        .put('/api/albums/some-document-id/tracks')
        .send({ tracks: [] });
      expect(isUnauthorized(res.status)).toBe(true);
    });
  });

  describe('public search/issues endpoints', () => {
    it('GET /api/albums/search is publicly accessible', async () => {
      const res = await http().get('/api/albums/search');
      expect(res.status).toBe(200);
    });

    it('GET /api/albums/issues is publicly accessible', async () => {
      const res = await http().get('/api/albums/issues');
      expect(res.status).toBe(200);
    });
  });
});
