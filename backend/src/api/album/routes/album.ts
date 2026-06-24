import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::album.album', {
  prefix: '',
  // Only expose public read routes here. Write operations (create/update/delete)
  // are defined in 01-custom-album.ts with authentication required.
  only: ['find', 'findOne'],
  except: [],
  config: {
    find: {
      auth: false
    },
    findOne: {
      auth: false
    }
  }
});
