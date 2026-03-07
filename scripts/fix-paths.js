const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const indexPath = path.join(outDir, 'index.html');

console.log('Fixing static paths in index.html...');
console.log('Looking for index.html at:', indexPath);

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  html = html.replace(/href="\/_next\//g, 'href="./_next/');
  html = html.replace(/src="\/_next\//g, 'src="./_next/');
  html = html.replace(/href="\/favicon\.ico/g, 'href="./favicon.ico');
  html = html.replace(/href="\/robots\.txt/g, 'href="./robots.txt');
  
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('✓ Fixed static paths in index.html');
} else {
  console.error('✗ index.html not found');
  console.error('Current directory:', __dirname);
  console.error('Expected path:', indexPath);
  process.exit(1);
}