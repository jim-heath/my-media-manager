export default ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      headers: '*',
      // Comma-separated list in CORS_ORIGINS, e.g.
      // CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
      origin: env.array('CORS_ORIGINS', [
        'http://localhost:4200',  // Angular dev server
        'http://localhost:1337',  // Strapi dev
      ]),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      credentials: true,
    },
  },
  {
    name: 'strapi::poweredBy',
    config: {
      poweredBy: 'My Media Manager',
    },
  },
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
