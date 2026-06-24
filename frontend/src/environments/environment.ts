// Local development environment (default).
// apiBaseUrl is left empty so requests are relative and handled by the dev
// proxy (see proxy.conf.json), which forwards /api and /uploads to the backend.
export const environment = {
  production: false,
  // Base origin of the backend, e.g. 'http://localhost:1337'.
  // Empty string => same-origin relative requests (uses the dev proxy).
  apiBaseUrl: ''
};
