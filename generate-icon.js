// 生成星曜 Agent Platform 应用图标
// 使用纯 Node.js 生成 PNG（无外部依赖）

const fs = require('fs');
const path = require('path');

const SIZE = 1024;

// 创建 RGBA 像素数组
const pixels = Buffer.alloc(SIZE * SIZE * 4);

function setPixel(x, y, r, g, b, a = 255) {
  const idx = (y * SIZE + x) * 4;
  pixels[idx] = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

// 绘制渐变背景 (紫色渐变)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const t = (x + y) / (SIZE * 2);
    const r = Math.round(102 + t * (118 - 102));
    const g = Math.round(126 + t * (75 - 126));
    const b = Math.round(234 + t * (162 - 234));
    setPixel(x, y, r, g, b);
  }
}

// 绘制圆角矩形背景（内层）
const margin = 120;
const radius = 80;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let inside = true;
    // 检查是否在圆角矩形内
    if (x < margin + radius && y < margin + radius) {
      const dx = x - (margin + radius);
      const dy = y - (margin + radius);
      if (dx * dx + dy * dy > radius * radius) inside = false;
    } else if (x > SIZE - margin - radius && y < margin + radius) {
      const dx = x - (SIZE - margin - radius);
      const dy = y - (margin + radius);
      if (dx * dx + dy * dy > radius * radius) inside = false;
    } else if (x < margin + radius && y > SIZE - margin - radius) {
      const dx = x - (margin + radius);
      const dy = y - (SIZE - margin - radius);
      if (dx * dx + dy * dy > radius * radius) inside = false;
    } else if (x > SIZE - margin - radius && y > SIZE - margin - radius) {
      const dx = x - (SIZE - margin - radius);
      const dy = y - (SIZE - margin - radius);
      if (dx * dx + dy * dy > radius * radius) inside = false;
    } else if (x < margin || x > SIZE - margin || y < margin || y > SIZE - margin) {
      inside = false;
    }
    
    if (!inside) {
      // 半透明覆盖
      const idx = (y * SIZE + x) * 4;
      pixels[idx] = Math.round(pixels[idx] * 0.3);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * 0.3);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * 0.3);
      pixels[idx + 3] = 255;
    }
  }
}

// 绘制 AI 文字（简化版 - 用像素画风格）
// 绘制一个芯片/电路图案作为图标中心
const cx = SIZE / 2;
const cy = SIZE / 2;

// 中心圆形
function drawCircle(centerX, centerY, r, color) {
  for (let y = Math.floor(centerY - r); y <= Math.ceil(centerY + r); y++) {
    for (let x = Math.floor(centerX - r); x <= Math.ceil(centerX + r); x++) {
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= r * r) {
          const idx = (y * SIZE + x) * 4;
          // 混合颜色
          pixels[idx] = Math.round(pixels[idx] * 0.4 + color[0] * 0.6);
          pixels[idx + 1] = Math.round(pixels[idx + 1] * 0.4 + color[1] * 0.6);
          pixels[idx + 2] = Math.round(pixels[idx + 2] * 0.4 + color[2] * 0.6);
        }
      }
    }
  }
}

// 绘制线条
function drawLine(x1, y1, x2, y2, color, width = 8) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = steps > 0 ? i / steps : 0;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    for (let dy = -width; dy <= width; dy++) {
      for (let dx = -width; dx <= width; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
          const idx = (py * SIZE + px) * 4;
          pixels[idx] = color[0];
          pixels[idx + 1] = color[1];
          pixels[idx + 2] = color[2];
          pixels[idx + 3] = 200;
        }
      }
    }
  }
}

// 绘制节点圆点
function drawNode(x, y, r, color) {
  drawCircle(x, y, r, color);
}

const lineColor = [255, 255, 255];
const nodeColor = [255, 255, 255];
const centerColor = [255, 255, 255];

// 中心大圆
drawCircle(cx, cy, 120, centerColor);

// 连接线（从中心向外辐射）
const nodes = [
  [cx - 280, cy - 200],
  [cx + 280, cy - 200],
  [cx - 280, cy + 200],
  [cx + 280, cy + 200],
  [cx, cy - 320],
  [cx, cy + 320],
  [cx - 350, cy],
  [cx + 350, cy],
];

nodes.forEach(([nx, ny]) => {
  drawLine(cx, cy, nx, ny, lineColor, 6);
  drawNode(nx, ny, 35, nodeColor);
});

// 绘制 "AI" 文字在中心
// 简化的 A 字母
function drawTextA(startX, startY, size, color) {
  const w = size * 0.7;
  const h = size;
  const thickness = size * 0.15;
  
  // 左斜线
  for (let i = 0; i <= h; i++) {
    const t = i / h;
    const x = startX + w * 0.1 + (w * 0.4) * t;
    const y = startY + h - i;
    for (let dy = -thickness; dy <= thickness; dy++) {
      for (let dx = -thickness/2; dx <= thickness/2; dx++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
          const idx = (py * SIZE + px) * 4;
          pixels[idx] = color[0];
          pixels[idx + 1] = color[1];
          pixels[idx + 2] = color[2];
          pixels[idx + 3] = 255;
        }
      }
    }
  }
  // 右斜线
  for (let i = 0; i <= h; i++) {
    const t = i / h;
    const x = startX + w * 0.9 - (w * 0.4) * t;
    const y = startY + h - i;
    for (let dy = -thickness; dy <= thickness; dy++) {
      for (let dx = -thickness/2; dx <= thickness/2; dx++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
          const idx = (py * SIZE + px) * 4;
          pixels[idx] = color[0];
          pixels[idx + 1] = color[1];
          pixels[idx + 2] = color[2];
          pixels[idx + 3] = 255;
        }
      }
    }
  }
  // 横线
  const midY = startY + h * 0.45;
  for (let x = startX + w * 0.25; x <= startX + w * 0.75; x++) {
    for (let dy = -thickness/2; dy <= thickness/2; dy++) {
      const px = Math.round(x);
      const py = Math.round(midY + dy);
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        const idx = (py * SIZE + px) * 4;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = 255;
      }
    }
  }
}

// 绘制 I 字母
function drawTextI(startX, startY, size, color) {
  const w = size * 0.5;
  const h = size;
  const thickness = size * 0.15;
  const centerX = startX + w / 2;
  
  // 竖线
  for (let y = startY; y <= startY + h; y++) {
    for (let dx = -thickness; dx <= thickness; dx++) {
      const px = Math.round(centerX + dx);
      const py = Math.round(y);
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        const idx = (py * SIZE + px) * 4;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = 255;
      }
    }
  }
  // 顶横线
  for (let x = startX; x <= startX + w; x++) {
    for (let dy = -thickness/2; dy <= thickness/2; dy++) {
      const px = Math.round(x);
      const py = Math.round(startY + dy);
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        const idx = (py * SIZE + px) * 4;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = 255;
      }
    }
  }
  // 底横线
  for (let x = startX; x <= startX + w; x++) {
    for (let dy = -thickness/2; dy <= thickness/2; dy++) {
      const px = Math.round(x);
      const py = Math.round(startY + h + dy);
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        const idx = (py * SIZE + px) * 4;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = 255;
      }
    }
  }
}

// 绘制 "AI" 文字
const textColor = [255, 255, 255];
const textSize = 200;
const textStartX = cx - 160;
const textStartY = cy - 100;

drawTextA(textStartX, textStartY, textSize, textColor);
drawTextI(textStartX + textSize * 0.85, textStartY, textSize, textColor);

// 简单的 PNG 编码（无压缩，使用存储模式）
function createPNG(width, height, pixelData) {
  // PNG 签名
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8; // bit depth
  ihdr[17] = 6; // color type (RGBA)
  ihdr[18] = 0; // compression
  ihdr[19] = 0; // filter
  ihdr[20] = 0; // interlace
  // CRC (simplified - using 0 for now, most viewers accept it)
  ihdr.writeUInt32BE(crc32(ihdr.slice(4, 21)), 21);
  
  // IDAT chunk - raw pixel data with filter bytes
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter: none
    pixelData.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  // Simple zlib compression (stored blocks)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  idat.writeUInt32BE(crc32(idat.slice(4, 8 + compressed.length)), 8 + compressed.length);
  
  // IEND chunk
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  iend.writeUInt32BE(crc32(iend.slice(4, 8)), 8);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 计算
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 生成 PNG
const png = createPNG(SIZE, SIZE, pixels);
const iconDir = path.join(__dirname, 'src-tauri', 'icons');
fs.writeFileSync(path.join(iconDir, 'icon.png'), png);
console.log(`Generated icon.png: ${png.length} bytes`);

// 同时生成一个较小的 256x256 版本用于预览
const smallSize = 256;
const smallPixels = Buffer.alloc(smallSize * smallSize * 4);
for (let y = 0; y < smallSize; y++) {
  for (let x = 0; x < smallSize; x++) {
    const srcX = Math.floor(x * SIZE / smallSize);
    const srcY = Math.floor(y * SIZE / smallSize);
    const srcIdx = (srcY * SIZE + srcX) * 4;
    const dstIdx = (y * smallSize + x) * 4;
    smallPixels[dstIdx] = pixels[srcIdx];
    smallPixels[dstIdx + 1] = pixels[srcIdx + 1];
    smallPixels[dstIdx + 2] = pixels[srcIdx + 2];
    smallPixels[dstIdx + 3] = pixels[srcIdx + 3];
  }
}
const smallPng = createPNG(smallSize, smallSize, smallPixels);
fs.writeFileSync(path.join(iconDir, 'icon-256.png'), smallPng);
console.log(`Generated icon-256.png: ${smallPng.length} bytes`);

console.log('Icons generated successfully!');
