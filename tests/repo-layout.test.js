import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.join(import.meta.dirname, '..');

// "Add file → Upload files" on github.com drops everything into whatever folder
// the page was opened at, which is the repository root unless you navigate first.
// One upload put copies of src/app.js, src/domain/menu.js, public/styles.css and
// tests/menu-catalog.test.js there at once. Nothing warned, because each copy
// looked fine on its own — but the test copy broke CI on an import that only
// resolves from tests/, the workflow never ran because Actions reads nothing but
// .github/workflows/, and corrected Chinese dish names sat in a file no code
// imports while the wrong names stayed live. Code belongs in a folder; the root
// holds project metadata and nothing else.
const ALLOWED_ROOT_FILES = new Set([
  '.env.example',
  '.gitignore',
  'HUONG-DAN-ANH-MON.md',
  'README.md',
  'package-lock.json',
  'package.json',
  'railway.json'
]);

describe('repository layout', () => {
  it('keeps source, asset and workflow files out of the repository root', () => {
    const strays = readdirSync(ROOT)
      .filter((entry) => !entry.startsWith('.git') && entry !== 'node_modules')
      .filter((entry) => statSync(path.join(ROOT, entry)).isFile())
      .filter((entry) => !ALLOWED_ROOT_FILES.has(entry));

    expect(
      strays,
      'Files uploaded to the root instead of public/, src/, tests/ or .github/workflows/'
    ).toEqual([]);
  });
});
