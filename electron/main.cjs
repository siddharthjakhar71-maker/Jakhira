process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
const { app, BrowserWindow, dialog } = require('electron');
app.disableHardwareAcceleration();
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 5000);
const STARTUP_TIMEOUT_MS = 45000;

let mainWindow = null;
let backendProcess = null;
let backendStarted = false;
let backendStartupPromise = null;
let isQuitting = false;

function ensureFilePath(filePath, description) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Missing ${description}: ${filePath}`);
  }
  if (!fs.statSync(filePath).isFile()) {
    throw new Error(`Expected ${description} to be a file: ${filePath}`);
  }
  return filePath;
}

function resolveServerEntry() {
  if (app.isPackaged) {
    return ensureFilePath(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.cjs'),
      'packaged backend entry'
    );
  }

  const candidates = [
    path.join(app.getAppPath(), 'server', 'index.ts'),
    path.join(app.getAppPath(), 'dist', 'index.cjs'),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }

  throw new Error(`Backend entry not found`);
}

function resolveStaticDir() {
  const dir = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'public')
    : path.join(app.getAppPath(), 'dist', 'public');

  if (!fs.existsSync(dir)) {
    throw new Error(`Missing static directory: ${dir}`);
  }

  return dir;
}

function resolveIconPath() {
  const icon = path.join(app.getAppPath(), 'client', 'public', 'logo.png');
  return fs.existsSync(icon) ? icon : undefined;
}

function resolveDevelopmentRunner(serverEntry) {
  const isTS = path.extname(serverEntry) === '.ts';

  if (!isTS) {
    return {
      command: process.platform === 'win32' ? 'node.exe' : 'node',
      args: [serverEntry],
    };
  }

  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/c', 'npx', 'tsx', serverEntry],
    };
  }

  return {
    command: 'npx',
    args: ['tsx', serverEntry],
  };
}

function waitForPort(port, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const socket = net.connect({ host: HOST, port }, () => {
        socket.end();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();

        if (Date.now() - start > timeout) {
          reject(new Error(`Backend did not start on port ${port}`));
          return;
        }

        setTimeout(check, 300);
      });
    };

    check();
  });
}

function waitForHealth(port, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const req = http.get(
        { host: HOST, port, path: '/api/health', timeout: 2000 },
        (res) => {
          res.resume();

          if (res.statusCode === 200) {
            resolve();
            return;
          }

          if (Date.now() - start > timeout) {
            reject(new Error(`Backend health check failed`));
            return;
          }

          setTimeout(check, 300);
        }
      );

      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Backend not responding`));
          return;
        }
        setTimeout(check, 300);
      });

      req.on('timeout', () => req.destroy());
    };

    check();
  });
}

function startDevBackend(serverEntry, env) {
  const { command, args } = resolveDevelopmentRunner(serverEntry);

  backendProcess = spawn(command, args, {
    cwd: app.getAppPath(),
    env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });

  backendProcess.on('error', (err) => {
    console.error('Backend failed to start:', err);
    dialog.showErrorBox('Backend Error', err.message);
    app.quit();
  });

  backendProcess.on('exit', (code, signal) => {
    backendProcess = null;

    // 🔥 IMPORTANT: do NOT close app in dev
    if (!isQuitting && code !== 0) {
      if (!app.isPackaged) {
        console.error(`Backend crashed (dev mode) → code=${code}, signal=${signal}`);
        return;
      }

      dialog.showErrorBox(
        'Backend Stopped',
        `Exit code: ${code ?? 'unknown'}\nSignal: ${signal ?? 'none'}`
      );
      app.quit();
    }
  });
} 

function startProdBackend(serverEntry) {
  require(serverEntry);
  backendStarted = true;
}

async function ensureBackend() {
  if (backendStartupPromise) return backendStartupPromise;

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

    if (app.isPackaged) {
      if (!backendStarted) startProdBackend(serverEntry);
    } else if (!backendProcess) {
      startDevBackend(serverEntry, env);
    }

    await waitForPort(PORT, STARTUP_TIMEOUT_MS);
    await waitForHealth(PORT, STARTUP_TIMEOUT_MS);
  })();

  return backendStartupPromise;
}

async function createWindow() {
  await ensureBackend();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    icon: resolveIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://${HOST}:${PORT}`);
}

async function bootstrap() {
  try {
    await createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error('Electron bootstrap failed:', message);
    dialog.showErrorBox('Unable to start Jakhira ERP', message);
    app.quit();
  }
}

app.whenReady().then(() => {
  void bootstrap();
});

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
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});