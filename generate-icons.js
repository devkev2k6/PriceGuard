// Script to generate valid PNG icon files for the Chrome Extension
const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 base PNG or small buffer generator
// Let's create an icon generator using a simple BMP or standard PNG raw buffer
function createMinimalPNG(size) {
  // A minimal valid PNG header with simple color palette (Blue/Shield tone)
  // Let's generate using pure Buffer or canvas if available, or write an RGBA PNG
  const width = size;
  const height = size;

  // Let's create a minimal valid PNG with zlib
  const zlib = require('zlib');

  function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    const fullBuf = Buffer.concat([typeBuf, data]);
    const crc = calcCRC32(fullBuf) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, fullBuf, crcBuf]);
  }

  function calcCRC32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = pngChunk('IHDR', ihdr);

  // Raw image scanlines
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row.writeUInt8(0, 0); // filter: none
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      // Shield gradient from blue to purple (#2563eb to #7c3aed)
      const ratio = (x + y) / (width + height);
      const r = Math.round(37 * (1 - ratio) + 124 * ratio);
      const g = Math.round(99 * (1 - ratio) + 58 * ratio);
      const b = Math.round(235 * (1 - ratio) + 237 * ratio);
      row.writeUInt8(r, idx);
      row.writeUInt8(g, idx + 1);
      row.writeUInt8(b, idx + 2);
      row.writeUInt8(255, idx + 3);
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = pngChunk('IDAT', compressed);
  const iendChunk = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'extension', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = createMinimalPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${png.length} bytes)`);
});
