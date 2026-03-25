# Electron desktop wrapper

## Runtime flow
- `electron/main.cjs` starts the existing Express server automatically.
- The server serves the built React app from `dist/public` in production.
- Electron waits for the backend port and then loads `http://127.0.0.1:5000`.
- The SQLite database and backups are stored under Electron's per-user app data directory.

## Packaging
- `npm run build` creates the production-ready React + Express bundle in `dist/`.
- `npm run package` builds the bundle and generates a Windows NSIS `.exe` installer in `release/`.
