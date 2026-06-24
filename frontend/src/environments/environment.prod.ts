// Production environment.
// Set apiBaseUrl to the backend origin of your production deployment.
// If the frontend and backend are served from the same origin (e.g. behind a
// reverse proxy), leave this empty so requests stay relative.
export const environment = {
  production: true,
  // Empty => same-origin relative requests. The frontend and backend are both
  // served from https://mmm.restlessmindsstudio.com via the nginx reverse proxy.
  apiBaseUrl: ''
};
