const fs = require('fs').promises;
const path = require('path');

const srcDir = path.join(__dirname, '../entry');
const destDir = path.join(__dirname, '../export');

async function copyFiles(src, dest) {
  try {
    await fs.rm(dest, { recursive: true, force: true });
  } catch (err) {
    console.error(`Error clearing destination directory: ${err.message}`);
  }
  await fs.mkdir(dest, { recursive: true });

  const items = await fs.readdir(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory()) {
      await copyFiles(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

copyFiles(srcDir, destDir)
  .then(() => console.log('Files copied successfully.'))
  .catch(err => console.error('Error copying files:', err));
