# File Dropbox

A self-hosted file upload app with resumable uploads, built with Nuxt 4.

Features:

- Resumable uploads via the [tus protocol](https://tus.io/)
- Multi-file upload queue with configurable concurrency
- Drag-and-drop or click-to-select file adding
- Pause, resume, cancel, and retry uploads
- Task queue persists across page refreshes (re-drop files to resume interrupted uploads)
- Automatic filename deduplication on disk
- Dark / light / system theme
- Configurable chunk size, retry count, and connection timeout

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and adjust as needed. See [Configuration](#configuration) below.

## Development

```bash
pnpm dev
```

## Production

```bash
pnpm build
node .output/server/index.mjs
```

## Configuration

| Variable                     | Default             | When       | Description                      |
|------------------------------|---------------------|------------|----------------------------------|
| `FILE_DROPBOX_BASE_PATH`     | `/`                 | Build-time | Base URL path (e.g. `/dropbox`)  |
| `FILE_DROPBOX_UPLOAD_DIR`    | `./uploads`         | Runtime    | Directory for uploaded files     |
| `FILE_DROPBOX_MAX_FILE_SIZE` | `10737418240`       | Runtime    | Max upload size in bytes (10 GB) |
| `FILE_DROPBOX_DB_PATH`       | `./data/uploads.db` | Runtime    | SQLite database path             |
| `FILE_DROPBOX_TRUST_PROXY`   | `false`             | Runtime    | Trust `X-Forwarded-*` headers    |

Build-time variables must be set before `pnpm build`. Runtime variables can be changed between restarts without rebuilding.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `pnpm dev`     | Start development server |
| `pnpm build`   | Build for production     |
| `pnpm preview` | Preview production build |
| `pnpm lint`    | Run ESLint               |
| `pnpm format`  | Format with Prettier     |
