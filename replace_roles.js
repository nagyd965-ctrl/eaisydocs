const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, 'src');

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const isHrModule = filePath.includes('\\hr\\') || filePath.includes('/hr/');
    const isDocsModule = filePath.includes('\\dossiers\\') || filePath.includes('/dossiers/') ||
                         filePath.includes('\\inbox\\') || filePath.includes('/inbox/') ||
                         filePath.includes('\\partners\\') || filePath.includes('/partners/');

    // Select the target property name based on the module
    // For root level (page.tsx, settings), we might need to handle manually or assume docs_szerepkor for getPermissions
    const replacement = isHrModule ? 'hr_szerepkor' : 'docs_szerepkor';

    // Replace SQL selections: .select('szerepkor') or .select("szerepkor") or .select('..., szerepkor')
    content = content.replace(/select\(\s*['"]([^'"]*)szerepkor([^'"]*)['"]\s*\)/g, `select('$1${replacement}$2')`);
    
    // Also replace .select("elerheto_modulok, szerepkor")
    content = content.replace(/elerheto_modulok,\s*szerepkor/g, `elerheto_modulok, ${replacement}`);

    // Replace object property access: profile.szerepkor -> profile.hr_szerepkor
    content = content.replace(/\.szerepkor\b/g, `.${replacement}`);

    // Replace destructuring: { szerepkor } = ...
    content = content.replace(/\{([^}]*)\bszerepkor\b([^}]*)\}/g, `{$1${replacement}$2}`);

    // Replace variable declarations: const szerepkor = ...
    content = content.replace(/\bconst szerepkor\b/g, `const ${replacement}`);
    content = content.replace(/\blet szerepkor\b/g, `let ${replacement}`);

    // Replace object keys: { szerepkor: role }
    content = content.replace(/szerepkor:/g, `${replacement}:`);
    
    // Replace standalone usage like `szerepkor === "admin"`
    content = content.replace(/\bszerepkor ===/g, `${replacement} ===`);
    content = content.replace(/\bszerepkor !==/g, `${replacement} !==`);
    content = content.replace(/\bszerepkor \?/g, `${replacement} ?`);
    content = content.replace(/\bszerepkor \|\|/g, `${replacement} ||`);
    content = content.replace(/\bszerepkor\)/g, `${replacement})`);
    content = content.replace(/\(szerepkor/g, `(${replacement}`);
    content = content.replace(/\[szerepkor\]/g, `[${replacement}]`);
    content = content.replace(/\{szerepkor\}/g, `{${replacement}}`);
    content = content.replace(/szerepkor,/g, `${replacement},`);

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
console.log("Done");
