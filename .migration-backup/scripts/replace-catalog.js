const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', '.local', 'artifacts/mess-tracker/node_modules'].includes(path.relative(process.cwd(), p))) continue;
      walk(p);
    } else if (name === 'package.json') {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const json = JSON.parse(raw);
        let changed = false;
        ['dependencies','devDependencies','peerDependencies','optionalDependencies'].forEach((k) => {
          if (json[k]) {
            Object.keys(json[k]).forEach(dep => {
              if (json[k][dep] === 'catalog:' ) {
                json[k][dep] = '*';
                changed = true;
              }
            })
          }
        })
        if (changed) {
          fs.writeFileSync(p, JSON.stringify(json, null, 2)+"\n");
          console.log('Patched', p);
        }
      } catch (e) {
        console.error('Skipping', p, e.message);
      }
    }
  }
}

walk(process.cwd());
console.log('Done');
