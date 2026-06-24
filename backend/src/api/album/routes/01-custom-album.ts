export default {
  routes: [
    {
      method: 'POST',
      path: '/albums/import',
      handler: 'album.import',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'GET',
      path: '/albums/export/csv',
      handler: 'album.exportCsv',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'GET',
      path: '/albums/export/json',
      handler: 'album.exportJson',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'GET',
      path: '/albums/search',
      handler: 'album.search',
      config: {
        auth: false  // Public: truly disables auth (an object value would still require permissions)
      }
    },
    {
      method: 'GET',
      path: '/albums/issues',
      handler: 'album.issues',
      config: {
        auth: false  // Public: truly disables auth (an object value would still require permissions)
      }
    },
    {
      method: 'POST',
      path: '/albums/:id/enrich',
      handler: 'album.enrich',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'POST',
      path: '/albums',
      handler: 'album.create',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'PUT',
      path: '/albums/:id',
      handler: 'album.update',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'POST',
      path: '/albums/:id/cover',
      handler: 'album.uploadCover',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'DELETE',
      path: '/albums/:id',
      handler: 'album.delete',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'POST',
      path: '/albums/enrich-pending',
      handler: 'album.enrichPending',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'POST',
      path: '/albums/fetch-covers',
      handler: 'album.fetchCovers',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'PUT',
      path: '/albums/:id/tracks',
      handler: 'album.saveTracks',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    }
  ]
};
