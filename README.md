# My Media Manager

A web-based application for enriching music collection databases with metadata from external sources (MusicBrainz, Discogs, Cover Art Archive).

## Architecture

- **Backend**: Strapi (Node.js headless CMS)
- **Frontend**: Angular 17
- **Database**: SQLite

## Features

- **FR-1: Import Collection** - Import albums via CSV (UPC, artist, title)
- **FR-2: Metadata Lookup** - Query MusicBrainz and Discogs APIs
- **FR-3: Fetch Cover Art** - Download album covers (under 1MB limit)
- **FR-4: Fetch Tracklist** - Retrieve complete track listings
- **FR-5: Fetch Release Date** - Get release year/date information
- **FR-6: Search and Browse** - Browse collection with search and filters
- **FR-7: Export Dataset** - Export to CSV/JSON formats

## Prerequisites

- Node.js 18+ and npm
- Modern web browser

## Installation

### Backend (Strapi)

```bash
cd backend
npm install
```

Create `.env` file:
```
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-key-1,your-app-key-2
API_TOKEN_SALT=your-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret
DATABASE_FILENAME=.tmp/data.db
DISCOGS_TOKEN=your-discogs-token  # Optional, for Discogs API
```

Start the backend:
```bash
npm run develop
```

Admin panel: http://localhost:1337/admin
API base URL: http://localhost:1337/api

### Frontend (Angular)

```bash
cd frontend
npm install
```

Start the frontend:
```bash
npm start
```

The app will be available at http://localhost:4200

## Usage

### 1. Import Collection

Go to the Import page and upload a CSV file with columns:
```
upc,artist,title
602527478239,Miles Davis,Kind of Blue
```

The system will automatically fetch metadata in the background.

### 2. Browse Albums

Use the Browse page to:
- Search by artist or album title
- View album details with cover art
- See track listings
- Filter by metadata status

### 3. Export Data

Export your enriched collection to:
- CSV (album summary)
- JSON (complete album + track data)

## API Rate Limits

The system respects API rate limits:
- **MusicBrainz**: 1 request per second (per SRS requirement)
- **Discogs**: Uses authenticated requests (configure token in .env)

## Database Schema

### Albums
- upc (string, unique, required)
- artist (string, required)
- title (string, required)
- release_date (string)
- cover (media)
- mbid (string) - MusicBrainz ID
- discogs_id (string) - Discogs ID
- metadata_status (enum: pending/fetching/completed/failed)

### Tracks
- track_number (integer, required)
- title (string, required)
- length (integer) - in seconds
- album (relation to Album)

## Testing with Sample Data

Create a test CSV:
```csv
upc,artist,title
602527478239,Miles Davis,Kind of Blue
5099751637627,The Beatles,Abbey Road
4988064581250,Pink Floyd,The Dark Side of the Moon
075596058220,Radiohead,OK Computer
602517798652,John Coltrane,A Love Supreme
```

## License

MIT
