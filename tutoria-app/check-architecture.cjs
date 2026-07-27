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
  '../presentation',
  '../../infrastructure',
  '../../presentation'
];

const FORBIDDEN_TOKENS_PROD = [
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
  'navigator.',
  ' any ',
  '<any>',
  ': any',
  'as any'
];

const TARGET_DIRS = [
  { path: path.join(__dirname, 'src/shared'), layer: 'shared' },
  { path: path.join(__dirname, 'src/domain'), layer: 'domain' },
  { path: path.join(__dirname, 'src/application'), layer: 'application' }
];

let hasErrors = false;
const excludedFiles = [];

function checkInverseImports(fullPath, line, layer, lineNum) {
  if (layer === 'shared') {
    if (line.includes('/domain/') || line.includes('/application/')) {
      console.error(`Architecture Violation in ${fullPath}:${lineNum}`);
      console.error(`Layer 'shared' cannot import from higher layers.`);
      hasErrors = true;
    }
  } else if (layer === 'domain') {
    if (line.includes('/application/')) {
      console.error(`Architecture Violation in ${fullPath}:${lineNum}`);
      console.error(`Layer 'domain' cannot import from 'application'.`);
      hasErrors = true;
    }
  }
}

function scanDirectory(dir, layer) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (file === '__tests__') {
        excludedFiles.push(fullPath);
      } else {
        scanDirectory(fullPath, layer);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Ignore comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        // Check explicit banned imports
        if (line.includes('import ') || line.includes('require(')) {
          for (const forbidden of FORBIDDEN_IMPORTS) {
            if (line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}"`) || line.includes(`'${forbidden}/`) || line.includes(`"${forbidden}/`)) {
              console.error(`Architecture Violation in ${fullPath}:${i + 1}`);
              console.error(`Forbidden import found: ${forbidden}`);
              hasErrors = true;
            }
          }
          checkInverseImports(fullPath, line, layer, i + 1);
        }

        // Check specific file exemptions
        const isClockFile = fullPath.endsWith('src/shared/kernel/Clock.ts');
        if (isClockFile && line.includes('new Date')) {
          continue; // Allowed here
        }

        if (line.includes('new Date') && !line.includes('getTime()')) {
           console.error(`Architecture Violation in ${fullPath}:${i + 1}`);
           console.error(`Forbidden direct time access: new Date`);
           hasErrors = true;
        }

        // Check tokens for prod code
        for (const token of FORBIDDEN_TOKENS_PROD) {
          if (line.includes(token)) {
            console.error(`Architecture Violation in ${fullPath}:${i + 1}`);
            console.error(`Forbidden token found in production code: ${token}`);
            hasErrors = true;
          }
        }
      }
    }
  }
}

TARGET_DIRS.forEach(target => scanDirectory(target.path, target.layer));

console.log('--- Architecture Check ---');
if (excludedFiles.length > 0) {
  console.log('Excluded directories from strict prod rules (tests):');
  excludedFiles.forEach(f => console.log(`  - ${f}`));
}

if (hasErrors) {
  console.error('\nArchitecture check failed!');
  process.exit(1);
} else {
  console.log('\nArchitecture check passed successfully.');
}
