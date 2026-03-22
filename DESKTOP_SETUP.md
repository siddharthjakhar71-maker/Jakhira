# Desktop packaging setup

## Recommended scalable structure

```text
Jakhira/
├─ client/                 # Existing React frontend
├─ server/                 # Existing Express backend
├─ shared/                 # Shared schema/types
├─ electron/
│  ├─ main.cjs             # Electron main process
│  └─ README.md            # Desktop runtime notes
├─ script/
│  └─ build.ts             # Production build for client + server
├─ dist/                   # Generated production bundle
│  ├─ index.cjs            # Bundled Express server
│  └─ public/              # Built React frontend
├─ release/                # Generated Windows installer output
└─ package.json            # Unified scripts + electron-builder config
```

## Desktop behavior

- `npm run dev` starts the Electron shell and automatically boots the Express backend through `tsx server/index.ts`.
- `npm run build` creates a production-ready bundle that Electron can reuse without a rewrite.
- `npm run package` generates a Windows NSIS installer (`.exe`) in `release/`.
- User data such as SQLite files and backups are redirected into Electron's app data directory.

## Scripts

- `npm run dev` → development desktop app with auto-started backend.
- `npm run build` → production build for React + Express.
- `npm run package` → build + Windows `.exe` installer.
- `npm run package:dir` → unpacked Windows app folder for quick smoke testing.
