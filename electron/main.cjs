const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 5000);
const STARTUP_TIMEOUT_MS = 45_000;

let mainWindow = null;
let backendProcess = null;
let backendStarted = false;
let backendStartupPromise = null;
let isQuitting = false;

function resolveServerEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.cjs');
  }

  return path.join(app.getAppPath(), 'server', 'index.ts');
}

function resolveStaticDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'public');
  }

  return path.join(app.getAppPath(), 'dist', 'public');
}

function resolveIconPath() {
  const iconPath = path.join(app.getAppPath(), 'client', 'public', 'logo.png');
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function waitForPort(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const socket = net.connect({ host: HOST, port }, () => {
        socket.end();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Backend did not start on port ${port} within ${timeoutMs}ms.`));
          return;
        }
        setTimeout(attempt, 250);
      });
    };

    attempt();
  });
}

function waitForHealthcheck(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const request = http.get(
        {
          host: HOST,
          port,
          path: '/api/health',
          timeout: 2_000,
        },
        (response) => {
          response.resume();
          if (response.statusCode === 200) {
            resolve();
            return;
          }

          if (Date.now() - startedAt >= timeoutMs) {
            reject(new Error(`Backend health check failed with status ${response.statusCode ?? 'unknown'}.`));
            return;
          }

          setTimeout(attempt, 250);
        },
      );

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Backend did not become healthy on port ${port} within ${timeoutMs}ms.`));
          return;
        }

        setTimeout(attempt, 250);
      });

      request.on('timeout', () => {
        request.destroy();
      });
    };

    attempt();
  });
}

function ensurePackagedFilesExist(serverEntry, staticDir) {
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Missing packaged server build: ${serverEntry}`);
  }

  if (!fs.existsSync(staticDir)) {
    throw new Error(`Missing packaged client build: ${staticDir}`);
  }
}

function startDevelopmentBackend(serverEntry, env) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['tsx', serverEntry];

  if (!fs.existsSync(path.join(app.getAppPath(), 'node_modules'))) {
    throw new Error('Dependencies are missing. Run npm install before starting Electron.');
  }

  backendProcess = spawn(command, args, {
    cwd: app.getAppPath(),
    env,
    stdio: 'inherit',
    windowsHide: true,
  });

  backendProcess.on('exit', (code) => {
    backendProcess = null;
    if (!isQuitting && code !== 0) {
      dialog.showErrorBox('Backend stopped', `The ERP backend exited unexpectedly with code ${code ?? 'unknown'}.`);
      app.quit();
    }
  });
}

function startPackagedBackend(serverEntry) {
  const loadServer = require(serverEntry);
  backendStarted = true;
  return loadServer;
}

async function ensureBackendStarted() {
  if (backendStartupPromise) {
    return backendStartupPromise;
  }

  backendStartupPromise = (async () => {
    const serverEntry = resolveServerEntry();
    const staticDir = resolveStaticDir();
    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      APP_DATA_DIR: path.join(app.getPath('userData'), 'runtime'),
      APP_STATIC_DIR: staticDir,
    };

    process.env.PORT = env.PORT;
    process.env.NODE_ENV = env.NODE_ENV;
    process.env.APP_DATA_DIR = env.APP_DATA_DIR;
    process.env.APP_STATIC_DIR = env.APP_STATIC_DIR;

    if (app.isPackaged) {
      ensurePackagedFilesExist(serverEntry, staticDir);
      if (!backendStarted) {
        startPackagedBackend(serverEntry);
      }
    } else if (!backendProcess) {
      startDevelopmentBackend(serverEntry, env);
    }

    await waitForPort(PORT, STARTUP_TIMEOUT_MS);
    await waitForHealthcheck(PORT, STARTUP_TIMEOUT_MS);
  })();

  try {
    await backendStartupPromise;
  } catch (error) {
    backendStartupPromise = null;
    throw error;
  }
}

async function createMainWindow() {
  await ensureBackendStarted();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    icon: resolveIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://${HOST}:${PORT}`);
}

async function bootstrap() {
  try {
    await createMainWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Unable to start Jakhira ERP', message);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void bootstrap();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (backendProcess) {
    backendProcess.kill();
  }
});
