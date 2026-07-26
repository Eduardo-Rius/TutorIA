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

const FORBIDDEN_TOKENS = [
  'console.log',
  'Date.now',
  'Math.random',
  'fetch',
  'XMLHttpRequest',
  'process.env',
  'localStorage',
  'sessionStorage',
  'window.',
  'document.',
  'navigator.'
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
      if (file !== '__tests__') {
        scanDirectory(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check imports
        if (line.includes('import ') || line.includes('require(')) {
          for (const forbidden of FORBIDDEN_IMPORTS) {
            if (line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}"`) || line.includes(`'${forbidden}/`) || line.includes(`"${forbidden}/`)) {
              console.error(`Architecture Violation in ${fullPath}:${i + 1}`);
              console.error(`Forbidden import found: ${forbidden}`);
              hasErrors = true;
            }
          }
        }

        // Check tokens
        for (const token of FORBIDDEN_TOKENS) {
          if (line.includes(token)) {
            // Check if it's not a comment
            if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
              console.error(`Architecture Violation in ${fullPath}:${i + 1}`);
              console.error(`Forbidden direct environment access found: ${token}`);
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
