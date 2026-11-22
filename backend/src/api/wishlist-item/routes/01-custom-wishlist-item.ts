export default {
  routes: [
    {
      method: 'GET',
      path: '/wishlist-items/search',
      handler: 'wishlist-item.search',
      config: {
        auth: false  // Public: truly disables auth (an object value would still require permissions)
      }
    },
    {
      method: 'POST',
      path: '/wishlist-items',
      handler: 'wishlist-item.create',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'PUT',
      path: '/wishlist-items/:id',
      handler: 'wishlist-item.update',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'POST',
      path: '/wishlist-items/:id/cover',
      handler: 'wishlist-item.uploadCover',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'POST',
      path: '/wishlist-items/:id/purchase',
      handler: 'wishlist-item.purchase',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    },
    {
      method: 'DELETE',
      path: '/wishlist-items/:id',
      handler: 'wishlist-item.delete',
      config: {
        auth: { enabled: true }  // Protected: requires authentication
      }
    }
  ]
};
