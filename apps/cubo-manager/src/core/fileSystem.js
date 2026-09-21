const fs = require('fs');
const path = require('path');
const { storageBase, inventoryFolder, catalogFolder, syncFolder, dataPath, inventoryFile, settingsFile } = require('./config');

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

function initializeStorage() {
  ensureFolder(storageBase);
  ensureFolder(inventoryFolder);
  ensureFolder(catalogFolder);
  ensureFolder(syncFolder);
  ensureFolder(dataPath);
  ensureFolder(path.dirname(inventoryFile));
}

function listFolder(folderPath) {
  ensureFolder(folderPath);
  return fs.readdirSync(folderPath, { withFileTypes: true }).map(entry => ({
    name: entry.name,
    path: path.join(folderPath, entry.name),
    isDirectory: entry.isDirectory(),
  }));
}

function copyFile(source, destination) {
  ensureFolder(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

function moveFile(source, destination) {
  ensureFolder(path.dirname(destination));
  fs.renameSync(source, destination);
}

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  ensureFolder(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function deletePath(targetPath) {
  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
  }
}

async function optimizeImage(source, destination, options = {}) {
  const { width, quality = 80 } = options;
  try {
    const sharp = require('sharp');
    let pipeline = sharp(source).rotate();
    if (width) pipeline = pipeline.resize(width);
    pipeline = pipeline.jpeg({ quality });
    ensureFolder(path.dirname(destination));
    await pipeline.toFile(destination);
    return { status: 'optimized', path: destination };
  } catch (error) {
    copyFile(source, destination);
    return { status: 'copied', path: destination, warning: error.message };
  }
}

module.exports = {
  ensureFolder,
  initializeStorage,
  listFolder,
  copyFile,
  moveFile,
  readJson,
  writeJson,
  deletePath,
  optimizeImage,
};
