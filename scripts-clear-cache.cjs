const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cacheDir = path.join(os.homedir(), "AppData", "Local", "electron-builder", "Cache");
try {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log("Cleared electron-builder cache:", cacheDir);
} catch (err) {
  console.error("Could not clear cache:", err.message);
  process.exitCode = 1;
}