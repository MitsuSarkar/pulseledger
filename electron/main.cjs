const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("node:path");
const { startServer } = require("../server/app.cjs");

let mainWindow = null;
let serverRef = null;
const PORT = 4000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#07111f",
    title: "PulseLedger",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url) => {
    dialog.showErrorBox("PulseLedger load failed", `Code: ${code}\n${desc}\n${url}`);
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`).catch((err) => {
    dialog.showErrorBox("PulseLedger startup failed", String(err));
  });
}

app.whenReady().then(async () => {
  try {
    serverRef = await startServer(PORT);
    createWindow();
  } catch (err) {
    dialog.showErrorBox("PulseLedger failed to start", String(err));
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverRef && serverRef.close) serverRef.close();
  if (process.platform !== "darwin") app.quit();
});