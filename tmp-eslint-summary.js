const data = JSON.parse(require('fs').readFileSync(__dirname + '/tmp-eslint.json', 'utf8'));
let errs = 0, warns = 0;
for (const f of data) {
  const errors = f.messages.filter((m) => m.severity === 2);
  const warnings = f.messages.filter((m) => m.severity === 1);
  errs += errors.length;
  warns += warnings.length;
  if (errors.length) {
    const parts = f.filePath.split(/[\\/]/);
    const fi = parts.indexOf('frontend');
    const rel = fi !== -1 ? parts.slice(fi + 1).join('/') : f.filePath;
    console.log(rel);
    for (const e of errors) console.log('  ' + e.line + ':' + e.column + '  ' + e.ruleId);
  }
}
console.log('TOTAL errors:', errs, 'warnings:', warns);
console.log('--- curriculum-builder errors:', data.filter((f) => f.filePath.includes('curriculum-builder')).reduce((a, f) => a + f.messages.filter((m) => m.severity === 2).length, 0));
