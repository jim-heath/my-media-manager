# Deployment Security Checklist

## ✅ Implemented Security Features

### Backend Security
- **Authentication**: JWT-based, all write routes protected with `auth: { enabled: true }`
- **File Upload Validation**: Max 5MB, only JPEG/PNG/WebP allowed
- **Input Validation**: UPC (12-14 digits), date format (YYYY-MM-DD), max 255 chars
- **Input Sanitization**: Removes `<` and `>` to prevent basic XSS
- **CORS**: Configured for specific origins
- **Content Security Policy**: Enabled with secure defaults
- **SQL Injection Protection**: Uses Strapi document service (parameterized queries)

### Frontend Security
- **Route Guards**: `AuthGuard` protects admin routes
- **HTTP Interceptor**: Auto-attaches JWT to requests
- **Authentication State**: Observable-based, secure logout

## 🔴 CRITICAL - Before Production

### 1. Rate Limiting (via nginx)
Add to your nginx config:
```nginx
# Rate limiting zone (in http block)
limit_req_zone $binary_remote_addr zone=api:10m rate=50r/m;

# Apply to protected routes
location /api/albums/import {
    limit_req zone=api burst=10 nodelay;
    proxy_pass http://localhost:1337;
}

location /api/albums/export {
    limit_req zone=api burst=5 nodelay;
    proxy_pass http://localhost:1337;
}
```

### 2. Environment Variables
Ensure these are set in production `.env`:
```bash
# Must be cryptographically strong random strings
APP_KEYS=your-random-key-1,your-random-key-2,your-random-key-3,your-random-key-4
API_TOKEN_SALT=your-random-salt
ADMIN_JWT_SECRET=your-random-secret-min-32-chars
TRANSFER_TOKEN_SALT=your-random-salt
JWT_SECRET=your-random-secret-min-32-chars

# Optional but recommended
DISCOGS_CONSUMER_KEY=your-key
DISCOGS_CONSUMER_SECRET=your-secret
```

**Generate secure random strings:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Migration
**SQLite is NOT for production.** Migrate to PostgreSQL:

```bash
# Install PostgreSQL driver
npm install pg

# Update backend/config/database.ts
export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'localhost'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'password'),
      ssl: env.bool('DATABASE_SSL', false),
    },
  },
});
```

### 4. HTTPS Configuration
Use nginx as reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Update CORS Origins
Edit `backend/config/middlewares.ts`:
```javascript
origin: [
  'http://localhost:4200',  // Remove in production
  'https://yourdomain.com',   // Add your domain
  'https://www.yourdomain.com',
],
```

## 🟡 RECOMMENDED - Post Launch

1. **Enable 2FA** for Strapi admin accounts
2. **Add security headers** via nginx:
   ```nginx
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-XSS-Protection "1; mode=block" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   ```
3. **Set up monitoring** (e.g., Sentry for error tracking)
4. **Configure backups** for database and uploaded files
5. **Rotate JWT secrets** every 90 days
6. **Enable Strapi audit logs** (Enterprise feature)

## 🔒 Security Testing

Before going live, test:
```bash
# Test auth bypass
curl http://yourdomain.com/api/albums/import  # Should return 401

# Test rate limiting (should block after 50 requests)
for i in {1..60}; do curl -s -o /dev/null -w "%{http_code}\n" http://yourdomain.com/api/albums/search; done

# Test file upload restrictions
curl -X POST -F "cover=@large-file.zip" http://yourdomain.com/api/albums/123/cover  # Should reject

# Test XSS prevention
curl -X POST -H "Content-Type: application/json" \
  -d '{"artist":"<script>alert(1)</script>","title":"Test"}' \
  http://yourdomain.com/api/albums  # Should sanitize
```

## 📋 Deployment Commands

```bash
# 1. Set production environment variables
export NODE_ENV=production

# 2. Build frontend
cd frontend && npm run build -- --configuration production

# 3. Build backend
cd backend && npm run build

# 4. Start with process manager
pm2 start npm --name "strapi-backend" -- run start
```

## 🆘 Emergency Contacts

- Strapi Security: security@strapi.io
- Report vulnerabilities before public disclosure
