const fs = require('fs');
const content = fs.readFileSync('client/src/styles/index.css', 'utf-8');
const lines = content.split('\n');

let currentFile = 'index_base.css';
let out = { 'index_base.css': [] };

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('/* ============ SIDEBAR LAYOUT ============ */')) { currentFile = 'Sidebar.css'; }
  else if (line.includes('/* ============ HEADER ============ */')) { currentFile = 'Header.css'; }
  else if (line.includes('/* ============ GLOBAL CLICK RIPPLE ============ */')) { currentFile = 'Buttons.css'; }
  else if (line.includes('/* ============ SEARCH ============ */')) { currentFile = 'Search.css'; }
  else if (line.includes('/* ============ MODAL ============ */')) { currentFile = 'Modal.css'; }
  else if (line.includes('/* ============ TOAST ============ */')) { currentFile = 'Toast.css'; }
  else if (line.includes('/* ============ SCROLLBAR ============ */')) { currentFile = 'Scrollbar.css'; }
  else if (line.includes('/* ============ USER INFO ============ */')) { currentFile = 'Common.css'; }
  else if (line.includes('@import')) { continue; } // Skip existing imports

  if (!out[currentFile]) out[currentFile] = [];
  out[currentFile].push(line);
}

for (const [file, l] of Object.entries(out)) {
  if (file === 'index_base.css') continue;
  fs.writeFileSync('client/src/shared/components/' + file, l.join('\n'));
}

let newIndex = out['index_base.css'].join('\n') + '\n';
newIndex += "@import '../shared/components/Sidebar.css';\n";
newIndex += "@import '../shared/components/Header.css';\n";
newIndex += "@import '../shared/components/Buttons.css';\n";
newIndex += "@import '../shared/components/Search.css';\n";
newIndex += "@import '../shared/components/Modal.css';\n";
newIndex += "@import '../shared/components/Toast.css';\n";
newIndex += "@import '../shared/components/Scrollbar.css';\n";
newIndex += "@import '../shared/components/Common.css';\n";
newIndex += "@import '../shared/components/Responsive.css';\n";
newIndex += "@import '../shared/components/Animations.css';\n";

fs.writeFileSync('client/src/styles/index.css', newIndex);
console.log('Done!');
