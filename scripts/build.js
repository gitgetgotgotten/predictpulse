import fs from 'fs';
import {sync as globSync} from 'glob';

function generateAssetHashes() {
  const jsFiles = globSync('dist/assets/index-*.js');
  const cssFiles = globSync('dist/assets/index-*.css');

  if (!jsFiles.length || !cssFiles.length) {
    console.error('Error: No JS or CSS files found in dist/assets');
    process.exit(1);
  }

  // Select primary entry file (e.g., first file or based on naming convention)
  const jsFile = jsFiles[0]; // Consider logic to identify main entry if multiple
  const cssFile = cssFiles[0];
  const jsHash = jsFile.match(/index-(.+)\.js/)[1];
  const cssHash = cssFile.match(/index-(.+)\.css/)[1];
  const hashes = {js: jsHash, css: cssHash};

  // Log additional chunks if present
  if (jsFiles.length > 1 || cssFiles.length > 1) {
    console.warn('Multiple JS/CSS files detected:', {jsFiles, cssFiles});
  }

  fs.writeFileSync('public/asset_hashes.json', JSON.stringify(hashes, null, 2));
  fs.copyFileSync('public/asset_hashes.json', 'dist/asset_hashes.json');
  console.log('Asset hashes updated:', hashes);
}

generateAssetHashes();