const fs = require('fs');
const path = require('path');

const FORBIDDEN_IMPORTS = [
  'firebase',
  'react',
  'react-dom',
  'vite',
  'tailwind',
  'openai',
  'axios',
  'src/infrastructure',
  'src/presentation',
  '../infrastructure',
  '../presentation'
];

const TARGET_DIRS = [
  path.join(__dirname, 'src/domain'),
  path.join(__dirname, 'src/shared'),
  path.join(__dirname, 'src/application')
];

let hasErrors = false;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('import ') || line.includes('require(')) {
          for (const forbidden of FORBIDDEN_IMPORTS) {
            // Very naive check, but enough for this gate
            if (line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}"`) || line.includes(`'${forbidden}/`) || line.includes(`"${forbidden}/`)) {
              console.error(`Architecture Violation in ${fullPath}:${i + 1}`);
              console.error(`Forbidden import found: ${forbidden}`);
              hasErrors = true;
            }
          }
        }
      }
    }
  }
}

TARGET_DIRS.forEach(scanDirectory);

if (hasErrors) {
  console.error('Architecture check failed!');
  process.exit(1);
} else {
  console.log('Architecture check passed successfully.');
}
