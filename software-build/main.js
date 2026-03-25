const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let serverPort = 5000;

function getAppDir() {
  if (app.isPackaged) {
    return path.dirname(app.getPath("exe"));
  }
  return __dirname;
}

function getResourcesDir() {
  if (app.isPackaged) {
    const exeDir = path.dirname(app.getPath("exe"));
    const resourcesApp = path.join(exeDir, "resources", "app");
    if (fs.existsSync(resourcesApp)) return resourcesApp;
    const resourcesAppAsar = path.join(exeDir, "resources", "app.asar");
    if (fs.existsSync(resourcesAppAsar)) return resourcesAppAsar;
    return exeDir;
  }
  return __dirname;
}

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

function waitForServer(port, retries) {
  return new Promise((resolve, reject) => {
    if (retries <= 0) return reject(new Error("Server did not respond on port " + port + " after multiple attempts. Check if another application is using this port."));
    const client = net.createConnection({ port, host: "127.0.0.1" }, () => {
      client.end();
      resolve();
    });
    client.on("error", () => {
      setTimeout(() => waitForServer(port, retries - 1).then(resolve).catch(reject), 1000);
    });
  });
}

async function startServer() {
  serverPort = await findFreePort(5000);

  const appDir = getAppDir();
  const resDir = getResourcesDir();

  let publicDir = path.join(resDir, "public");
  if (!fs.existsSync(publicDir)) {
    publicDir = path.join(appDir, "public");
  }
  if (!fs.existsSync(publicDir)) {
    publicDir = path.join(__dirname, "public");
  }

  const dataDir = path.join(appDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  process.env.NODE_ENV = "production";
  process.env.PORT = String(serverPort);
  process.env.APP_DATA_DIR = appDir;
  process.env.APP_STATIC_DIR = publicDir;

  try {
    require("./server.cjs");
  } catch (loadErr) {
    throw new Error("Failed to load server module:\n" + loadErr.message + "\n\nPublic dir: " + publicDir + "\nData dir: " + dataDir);
  }

  await waitForServer(serverPort, 30);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Billionaire Homes LLP - Purchase Department",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadURL("http://127.0.0.1:" + serverPort);

  mainWindow.webContents.setWindowOpenHandler(function (details) {
    var url = details.url;
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    dialog.showErrorBox(
      "Startup Error",
      "Failed to start the application server:\n\n" + err.message + "\n\nPlease try restarting the application."
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
