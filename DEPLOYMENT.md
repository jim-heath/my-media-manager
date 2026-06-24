# Deployment Guide

How to deploy My Media Manager (Angular frontend + Strapi backend) to a single
server behind nginx with a local MySQL database.

Replace the placeholders below with your own values:

| Placeholder            | Meaning                                   | Example                          |
| ---------------------- | ----------------------------------------- | -------------------------------- |
| `your-domain.com`      | Public domain for the app                 | `mmm.example.com`                |
| `/path/to/app`         | Server checkout of this repo              | `/var/www/myapp`                 |
| `/path/to/webroot`     | Directory nginx serves the frontend from  | `/var/www/myapp-static`          |
| `<DB_NAME>`            | MySQL database name                       | `media_manager`                  |
| `<DB_USER>`            | MySQL user                                | `media_manager`                  |
| `<DB_PASSWORD>`        | MySQL password                            | (strong secret)                  |
| `<BACKEND_PORT>`       | Local port Strapi listens on              | `1337`                           |

## Architecture

Single-origin deployment: nginx serves the Angular static build at `/` and
reverse-proxies `/api`, `/uploads`, and `/admin` to the Strapi backend running
locally on `127.0.0.1:<BACKEND_PORT>`. Because everything is same-origin, the
frontend uses relative API requests and no CORS configuration is required.

- **App checkout** `/path/to/app` — full repo; the backend is built and run here.
- **Web root** `/path/to/webroot` — only the Angular static build is copied here.

## Prerequisites

On the server: Node.js 18–20, npm, git, nginx, MySQL, and a process manager
(`pm2` recommended: `npm i -g pm2`).

## 1. Clone the repository

```bash
git clone <YOUR_REPO_URL> /path/to/app
```

## 2. Create the MySQL database and user

```sql
CREATE DATABASE `<DB_NAME>` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '<DB_USER>'@'localhost' IDENTIFIED BY '<DB_PASSWORD>';
GRANT ALL PRIVILEGES ON `<DB_NAME>`.* TO '<DB_USER>'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Configure the backend environment

Create `/path/to/app/backend/.env` (never commit this file). See
`backend/.env.example` for the full list of options.

```bash
HOST=127.0.0.1
PORT=<BACKEND_PORT>
NODE_ENV=production

# Generate each value with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=

CORS_ORIGINS=https://your-domain.com

DATABASE_CLIENT=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=<DB_NAME>
DATABASE_USERNAME=<DB_USER>
DATABASE_PASSWORD=<DB_PASSWORD>
DATABASE_SSL=false

# MusicBrainz requires a real contact or it rate-limits/blocks requests
APP_USER_AGENT=MyMediaManager/1.0 (you@your-domain.com)

# Optional API keys
DISCOGS_TOKEN=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

> Use fresh, unique secrets in production — do not reuse development values.

## 4. Configure DNS

Point an `A` record for `your-domain.com` at the server's public IP.

## 5. Configure nginx

Create `/etc/nginx/sites-available/your-domain.com`:

```nginx
limit_req_zone $binary_remote_addr zone=app_api:10m rate=50r/m;

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name your-domain.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10M;

    root /path/to/webroot;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ ^/(api|uploads|admin|content-manager|content-type-builder|users-permissions|i18n) {
        proxy_pass http://127.0.0.1:<BACKEND_PORT>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location ~ ^/api/albums/(import|export) {
        limit_req zone=app_api burst=10 nodelay;
        proxy_pass http://127.0.0.1:<BACKEND_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Notes:
- `http2 on;` requires nginx 1.25.1+. On older nginx use `listen 443 ssl http2;` instead.
- Obtain a TLS certificate however you prefer (e.g. `certbot --nginx -d your-domain.com`).

Create the web root and enable the site:

```bash
sudo mkdir -p /path/to/webroot
sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
```

## 6. Build and run the backend

```bash
npm --prefix /path/to/app/backend ci
npm --prefix /path/to/app/backend run build
pm2 start npm --name app-backend --cwd /path/to/app/backend -- run start
pm2 save
```

Strapi auto-creates its tables on first boot. Visit
`https://your-domain.com/admin` to create the first admin account.

## 7. (Optional) Migrate existing data and uploads

To move content and uploaded images from another instance (e.g. a development
SQLite database), use Strapi's data transfer feature. The export bundles both
the data and the upload assets, and migrates cleanly across database engines.

On the source instance (server stopped):

```bash
npx strapi export --no-encrypt --file data-export
```

Copy `data-export.tar.gz` to the server, then on the target (server stopped):

```bash
npx strapi import --file data-export.tar.gz
```

Import replaces the target database, so only run it on a fresh deployment.
Both instances must run the same Strapi version.

## 8. Build and publish the frontend

`frontend/src/environments/environment.prod.ts` uses an empty `apiBaseUrl` so
requests stay same-origin behind the proxy.

```bash
npm --prefix /path/to/app/frontend ci
npm --prefix /path/to/app/frontend run build
sudo rm -rf /path/to/webroot/*
sudo cp -r /path/to/app/frontend/dist/my-media-manager/* /path/to/webroot/
```

## 9. Reload nginx and verify

```bash
sudo nginx -t
sudo systemctl reload nginx

curl -I https://your-domain.com
curl -o /dev/null -s -w "%{http_code}\n" https://your-domain.com/api/albums
```

The site should return `200`; protected write endpoints (e.g.
`/api/albums/import`) should return `401` without authentication.
</CodeContent>
<parameter name="EmptyFile">false
