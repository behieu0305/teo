import { describe, expect, it } from 'vitest';
import { CATEGORIES, getCategory, getMenuItem, menuCatalog } from '../src/domain/menu.js';

describe('menu catalog', () => {
  it('carries every dish from the shop list', () => {
    expect(menuCatalog).toHaveLength(58);
  });

  it('gives every dish a Vietnamese and a Chinese name', () => {
    // The shop serves Vietnamese and Chinese customers, so a dish missing one
    // of the two names is unreadable for half the room.
    const incomplete = menuCatalog
      .filter((item) => !item.name?.trim() || !item.nameZh?.trim())
      .map((item) => item.id);

    expect(incomplete).toEqual([]);
  });

  it('puts every dish in a declared category', () => {
    const known = new Set(CATEGORIES.map((category) => category.id));
    const stray = menuCatalog.filter((item) => !known.has(item.category)).map((item) => item.id);

    expect(stray).toEqual([]);
  });

  it('leaves no category empty', () => {
    const used = new Set(menuCatalog.map((item) => item.category));
    const empty = CATEGORIES.filter((category) => !used.has(category.id)).map((c) => c.id);

    expect(empty).toEqual([]);
  });

  it('names every category in both languages', () => {
    for (const category of CATEGORIES) {
      expect(category.name?.trim(), `${category.id} needs a Vietnamese name`).toBeTruthy();
      expect(category.nameZh?.trim(), `${category.id} needs a Chinese name`).toBeTruthy();
    }
  });

  it('prices every dish as a positive whole number of LKR', () => {
    // Prices are recalculated server-side from these values, so a stray decimal
    // or zero would silently mis-charge every order for that dish.
    const bad = menuCatalog
      .filter((item) => !Number.isInteger(item.price) || item.price <= 0)
      .map((item) => `${item.id}=${item.price}`);

    expect(bad).toEqual([]);
  });

  it('has unique ids and unique Vietnamese names', () => {
    const ids = menuCatalog.map((item) => item.id);
    const names = menuCatalog.map((item) => item.name);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('spreads the catalog across categories rather than lumping it together', () => {
    // The point of the categories is that no single tab dumps the whole menu on
    // the customer at once.
    for (const category of CATEGORIES) {
      const count = menuCatalog.filter((item) => item.category === category.id).length;
      expect(count, `${category.id} holds too much of the menu`).toBeLessThanOrEqual(15);
    }
  });

  it('looks dishes and categories up by id', () => {
    expect(getMenuItem('pho-bo')).toMatchObject({ name: 'Phở bò', nameZh: '牛肉河粉', price: 3000 });
    expect(getMenuItem('khong-co-mon-nay')).toBeUndefined();
    expect(getCategory('ca-phe')).toMatchObject({ name: 'Cà phê', nameZh: '咖啡' });
    expect(getCategory('khong-co')).toBeUndefined();
  });

  it('marks every dish available', () => {
    for (const item of menuCatalog) {
      expect(item.available).toBe(true);
    }
  });

  it('gives each dish either a real photo path or nothing at all', () => {
    // This used to assert imageUrl is always null, which was only true while no
    // photography existed. Pinning that snapshot would have failed the moment a
    // real photo landed. What must hold forever is the shape: a usable path, or
    // null so the UI falls back to the placeholder — never a half-formed value.
    for (const item of menuCatalog) {
      if (item.imageUrl === null) continue;
      expect(item.imageUrl, `${item.id} has a malformed image path`).toMatch(
        /^\/images\/menu\/[a-z0-9-]+\.(webp|jpg|png)$/
      );
    }
  });
});
