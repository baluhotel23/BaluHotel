const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'src', 'routes');

function getFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
    const res = path.join(dir, ent.name);
    return ent.isDirectory() ? getFiles(res) : res;
  });
}

const files = getFiles(routesDir).filter(f => f.endsWith('.js'));

const problemLines = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const verbsRe = /router\.(post|put|delete)\s*\(/g;
  let match;
  while ((match = verbsRe.exec(content)) !== null) {
    const startIndex = match.index + match[0].length; // point inside the parentheses
    let depth = 1;
    let i = startIndex;
    // find matching closing parenthesis for router call
    for (; i < content.length && depth > 0; i++) {
      const ch = content[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const snippet = content.slice(match.index, i);
    // now check if this snippet contains allowRoles([... 'admin' ...])
    const adminInAllow = /allowRoles\([\s\S]*?['\"]admin['\"][\s\S]*?\)/.test(snippet);
    if (adminInAllow) {
      const linesUntilMatch = content.slice(0, match.index).split('\n');
      const lineNumber = linesUntilMatch.length + 1;
      problemLines.push({ file, line: lineNumber, snippet: snippet.slice(0, 300) });
    }
  }
});

if (problemLines.length > 0) {
  console.error('\n🚫 Admin write permissions detected in route files. Please remove admin from write routes.');
  problemLines.forEach(p => {
    console.error(`- ${p.file}:${p.line} -> ${p.snippet}`);
  });
  process.exit(1);
} else {
  console.log('✅ No admin write permissions detected in routes.');
}
