// Generate Xingyao Agent Platform icons from the source SVG.
// Requires the Tauri CLI available through `npx.cmd tauri`.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const sourceIcon = path.join(root, 'frontend', 'src', 'assets', 'logo-mark.svg');
const iconDir = path.join(root, 'src-tauri', 'icons');

if (!fs.existsSync(sourceIcon)) {
  throw new Error(`Source icon not found: ${sourceIcon}`);
}

execFileSync(
  process.env.ComSpec || 'cmd.exe',
  ['/d', '/c', 'npx.cmd', 'tauri', 'icon', sourceIcon, '-o', iconDir],
  { cwd: root, stdio: 'inherit' },
);

const generated256 = path.join(iconDir, '128x128@2x.png');
const legacyPreview = path.join(iconDir, 'icon-256.png');
if (fs.existsSync(generated256)) {
  fs.copyFileSync(generated256, legacyPreview);
}

console.log('Xingyao icons generated successfully.');
