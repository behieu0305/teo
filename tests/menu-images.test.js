import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { menuCatalog } from '../src/domain/menu.js';

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

const withPhotos = menuCatalog.filter((item) => item.imageUrl);

describe('menu image integrity', () => {
  it('references an image file that exists', () => {
    const missing = withPhotos
      .filter((item) => !fs.existsSync(path.join(PUBLIC_DIR, item.imageUrl)))
      .map((item) => `${item.id} -> ${item.imageUrl}`);

    expect(missing).toEqual([]);
  });

  it('never shows the same photo for two different dishes', () => {
    // 12 files turned out to be 3 source photos re-cropped, so ten dishes
    // advertised a picture of something else. Byte-identical reuse is the part
    // a test can catch, and it is what regressed before.
    const byHash = new Map();
    for (const item of withPhotos) {
      const bytes = fs.readFileSync(path.join(PUBLIC_DIR, item.imageUrl));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      byHash.set(hash, [...(byHash.get(hash) ?? []), item.id]);
    }

    const shared = [...byHash.values()].filter((ids) => ids.length > 1);

    expect(shared).toEqual([]);
  });

  it('gives every dish a stable identity the UI can render', () => {
    for (const item of menuCatalog) {
      expect(item.id, 'menu item needs an id').toBeTruthy();
      expect(item.name, `${item.id} needs a name`).toBeTruthy();
      // null is allowed and means "render the placeholder"; undefined or an
      // empty string would slip through and render a broken image instead.
      expect(
        item.imageUrl === null || typeof item.imageUrl === 'string',
        `${item.id}.imageUrl must be a path or null`
      ).toBe(true);
      expect(item.imageUrl).not.toBe('');
    }
  });

  it('keeps the placeholder asset the UI falls back to', () => {
    expect(fs.existsSync(path.join(PUBLIC_DIR, 'images', 'menu-placeholder.svg'))).toBe(true);
  });

  it('has unique menu ids', () => {
    const ids = menuCatalog.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
