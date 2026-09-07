const fs = require('fs');
const path = require('path');
const { createIco } = require('./build_ico.cjs');

const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
const sizes = [16, 32, 48, 64, 128, 256];
const images = [];

for (const sz of sizes) {
  const file = path.join(tempDir, `tabe_ico_${sz}.png`);
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    images.push({ width: sz, height: sz, buffer: buf });
    try { fs.unlinkSync(file); } catch (e) {}
  }
}

if (images.length === 0) {
  // Fallback to public files
  const pwaFiles = [
    { size: 64, file: path.join(__dirname, '../public/pwa-64x64.png') },
    { size: 128, file: path.join(__dirname, '../public/favicon.png') },
    { size: 256, file: path.join(__dirname, '../public/pwa-256x256.png') }
  ];
  for (const item of pwaFiles) {
    if (fs.existsSync(item.file)) {
      images.push({ width: item.size, height: item.size, buffer: fs.readFileSync(item.file) });
    }
  }
}

const icoBuf = createIco(images);
const outPath = path.join(__dirname, '../public/favicon.ico');
fs.writeFileSync(outPath, icoBuf);
console.log('Successfully created favicon.ico (' + icoBuf.length + ' bytes with ' + images.length + ' resolutions)');
