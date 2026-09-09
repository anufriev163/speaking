const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function renderPixels(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cornerRadius = size * 0.22;
  const padding = size * 0.04;
  const minX = padding;
  const maxX = size - padding;
  const minY = padding;
  const maxY = size - padding;

  const cy = size / 2;
  const waveHeights = [0.2, 0.45, 0.72, 0.9, 0.65, 0.38, 0.18];
  const numBars = waveHeights.length;
  const barWidth = Math.max(1.5, size * 0.055);
  const spacing = (size * 0.65) / (numBars - 1);
  const startX = size * 0.175;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Squircle check
      let inSquircle = false;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        let cx = x < minX + cornerRadius ? minX + cornerRadius : x > maxX - cornerRadius ? maxX - cornerRadius : x;
        let cyPos = y < minY + cornerRadius ? minY + cornerRadius : y > maxY - cornerRadius ? maxY - cornerRadius : y;
        if (Math.hypot(x - cx, y - cyPos) <= cornerRadius) {
          inSquircle = true;
        }
      }

      if (!inSquircle) {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // Check waveform bars
      let inWaveBar = false;
      for (let b = 0; b < numBars; b++) {
        const bx = startX + b * spacing;
        const bHeight = size * 0.6 * waveHeights[b];
        const halfH = bHeight / 2;
        const barRadius = barWidth / 2;

        if (Math.abs(x - bx) <= barRadius) {
          if (Math.abs(y - cy) <= halfH) {
            inWaveBar = true;
            break;
          } else if (Math.abs(y - cy) <= halfH + barRadius) {
            const capY = y > cy ? cy + halfH : cy - halfH;
            if (Math.hypot(x - bx, y - capY) <= barRadius) {
              inWaveBar = true;
              break;
            }
          }
        }
      }

      if (inWaveBar) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      } else {
        const dist = Math.hypot(x - size / 2, y - size / 2);
        const shade = Math.max(14, Math.round(22 - (dist / size) * 8));
        pixels[idx] = shade;
        pixels[idx + 1] = shade;
        pixels[idx + 2] = shade + 2;
        pixels[idx + 3] = 255;
      }
    }
  }

  return pixels;
}

function makePngFromPixels(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdr = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rawOffset = y * (size * 4 + 1);
    raw[rawOffset] = 0; // Filter: None
    const srcOffset = y * size * 4;
    rgba.copy(raw, rawOffset + 1, srcOffset, srcOffset + size * 4);
  }

  const deflated = zlib.deflateSync(raw);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, deflated])), 0);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(deflated.length, 0);
  const idat = Buffer.concat([idatLen, idatType, deflated, idatCrc]);

  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iend = Buffer.concat([iendLen, iendType, iendCrc]);

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeDibFromPixels(size, rgba) {
  // BITMAPINFOHEADER (40 bytes)
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); // biSize
  header.writeInt32LE(size, 4); // biWidth
  header.writeInt32LE(size * 2, 8); // biHeight (XOR + AND mask)
  header.writeUInt16LE(1, 12); // biPlanes
  header.writeUInt16LE(32, 14); // biBitCount (32-bit BGRA)
  header.writeUInt32LE(0, 16); // biCompression (BI_RGB)
  
  const xorSize = size * size * 4;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;
  header.writeUInt32LE(xorSize + andSize, 20); // biSizeImage

  // XOR mask (BGRA, bottom-to-top)
  const xorMask = Buffer.alloc(xorSize);
  for (let y = 0; y < size; y++) {
    const srcY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const srcIdx = (srcY * size + x) * 4;
      const dstIdx = (y * size + x) * 4;
      xorMask[dstIdx] = rgba[srcIdx + 2];     // B
      xorMask[dstIdx + 1] = rgba[srcIdx + 1]; // G
      xorMask[dstIdx + 2] = rgba[srcIdx];     // R
      xorMask[dstIdx + 3] = rgba[srcIdx + 3]; // A
    }
  }

  // AND mask (1 bit per pixel, bottom-to-top, 1 = transparent, 0 = opaque)
  const andMask = Buffer.alloc(andSize, 0);
  for (let y = 0; y < size; y++) {
    const srcY = size - 1 - y;
    const rowOffset = y * andRowBytes;
    for (let x = 0; x < size; x++) {
      const srcIdx = (srcY * size + x) * 4;
      const a = rgba[srcIdx + 3];
      if (a === 0) {
        const byteIdx = rowOffset + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        andMask[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return Buffer.concat([header, xorMask, andMask]);
}

function createIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4); // count

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (let i = 0; i < count; i++) {
    const { size, data } = entries[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bit depth
    entry.writeUInt32LE(data.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset

    dirEntries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map(e => e.data)]);
}

const sizes = [16, 24, 32, 48, 64, 128, 256];
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const icoEntries = [];

for (const s of sizes) {
  const pixels = renderPixels(s);
  const pngBuf = makePngFromPixels(s, pixels);

  // Save PNG for standard sizes
  if ([16, 32, 48, 256].includes(s)) {
    fs.writeFileSync(path.join(assetsDir, `icon-${s}.png`), pngBuf);
  }
  if (s === 256) {
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuf);
  }

  // For Windows ICO:
  // <= 128 MUST be DIB format for Windows Explorer / Desktop rendering
  // 256 can be PNG (Vista+ standard)
  if (s <= 128) {
    const dibBuf = makeDibFromPixels(s, pixels);
    icoEntries.push({ size: s, data: dibBuf });
  } else {
    icoEntries.push({ size: s, data: pngBuf });
  }
}

const icoBuffer = createIco(icoEntries);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);

console.log('Valid multi-format Windows ICO generated. Total size:', icoBuffer.length, 'bytes');

