import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { menuCatalog } from '../src/domain/menu.js';
import { menuImages } from '../src/domain/menu-images.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MENU_DIR = path.join(ROOT, 'public', 'images', 'menu');

describe('menu image manifest', () => {
  it('only names dishes that actually exist in the catalogue', () => {
    const ids = new Set(menuCatalog.map((item) => item.id));
    const orphans = Object.keys(menuImages).filter((id) => !ids.has(id));

    // A stale key here is silent: the photo would sit on disk forever while the
    // dish it was shot for keeps showing the placeholder.
    expect(orphans).toEqual([]);
  });

  it('points every entry at a file on disk', () => {
    const missing = Object.entries(menuImages)
      .filter(([, url]) => !fs.existsSync(path.join(ROOT, 'public', url)))
      .map(([id, url]) => `${id} -> ${url}`);

    expect(missing).toEqual([]);
  });

  it('is regenerated from disk, so no photo is left unwired', () => {
    const onDisk = fs.existsSync(MENU_DIR)
      ? fs
          .readdirSync(MENU_DIR)
          .map((file) => path.basename(file, path.extname(file)))
          .filter((id) => menuCatalog.some((item) => item.id === id))
      : [];

    // Running `npm run menu:photos` is what keeps these in step. If someone
    // drops a photo in and forgets, this fails instead of shipping a menu that
    // ignores the file.
    expect(new Set(Object.keys(menuImages))).toEqual(new Set(onDisk));
  });

  it('feeds the catalogue: a dish without a photo stays null', () => {
    for (const item of menuCatalog) {
      expect(item.imageUrl).toBe(menuImages[item.id] ?? null);
    }
  });
});
