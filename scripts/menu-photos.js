#!/usr/bin/env node
// Chuẩn hoá ảnh món và sinh lại src/domain/menu-images.js.
//
//   npm run menu:photos -- ./anh-goc     xử lý ảnh thô rồi đồng bộ
//   npm run menu:photos                  chỉ đồng bộ lại từ file đã có
//
// Ảnh thô đặt tên theo MÃ MÓN, ví dụ pho-bo.jpg. Xem HUONG-DAN-ANH-MON.md.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuCatalog } from '../src/domain/menu.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MENU_DIR = path.join(ROOT, 'public', 'images', 'menu');
const MANIFEST = path.join(ROOT, 'src', 'domain', 'menu-images.js');

// Khung ảnh thật khi render, đo bằng trình duyệt ở nhiều bề ngang màn hình:
//   lưới món   320–390px:  98×108  (0.91)   430px trở lên: 112×112 → 118×118 (1.0)
//   giỏ hàng             :  64×58  (1.10)
//   thẻ nổi bật          :  16/9   — hiện không món nào featured nên chưa dùng
// Tất cả đều object-fit: cover. Ô gần vuông, nên ảnh vuông là vừa khít; ảnh
// 16:9 nhét vào ô vuông sẽ bị cắt mất gần một nửa bề ngang.
// Ô lớn nhất là 118 CSS px, màn hình 3x cần 354 px thật. 500 px là đủ dư mà
// vẫn nhẹ: ảnh món thật ra ~42 KB, cả 58 món khoảng 2,4 MB. Xuất 900 px chỉ
// nặng gấp đôi (5,7 MB) mà mắt thường không thấy khác.
const WIDTH = 500;
const HEIGHT = 500;
const QUALITY = 80;
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.avif']);

const ids = new Set(menuCatalog.map((i) => i.id));
const nameById = new Map(menuCatalog.map((i) => [i.id, i.name]));

function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    die('Thiếu thư viện sharp. Chạy:  npm install -D sharp');
  }
}

async function convert(inputDir) {
  const sharp = await loadSharp();
  fs.mkdirSync(MENU_DIR, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((f) => SOURCE_EXT.has(path.extname(f).toLowerCase()));
  if (files.length === 0) die(`Không thấy ảnh nào trong ${inputDir}`);

  const unknown = [];
  let done = 0;

  for (const file of files) {
    const id = path.basename(file, path.extname(file)).trim().toLowerCase();
    if (!ids.has(id)) {
      unknown.push(file);
      continue;
    }
    const out = path.join(MENU_DIR, `${id}.webp`);
    await sharp(path.join(inputDir, file))
      .rotate() // tôn trọng hướng EXIF, nếu không ảnh chụp dọc sẽ bị nằm ngang
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
      .webp({ quality: QUALITY })
      .toFile(out);
    const kb = (fs.statSync(out).size / 1024).toFixed(0);
    console.log(`  ✓ ${id.padEnd(28)} ${kb.padStart(4)} KB   ${nameById.get(id)}`);
    done += 1;
  }

  console.log(`\nĐã xử lý ${done} ảnh.`);
  if (unknown.length) {
    console.log(`\n⚠ ${unknown.length} file không khớp mã món nào, đã bỏ qua:`);
    for (const f of unknown) console.log(`    ${f}`);
    console.log('  Đổi tên file theo đúng mã món rồi chạy lại.');
  }
}

function sync() {
  const found = new Map();
  if (fs.existsSync(MENU_DIR)) {
    for (const file of fs.readdirSync(MENU_DIR)) {
      const id = path.basename(file, path.extname(file));
      if (ids.has(id)) found.set(id, `/images/menu/${file}`);
    }
  }

  // Hai món dùng chung một file là lỗi đã từng xảy ra: 12 file hoá ra chỉ là 3
  // tấm gốc cắt lại. Chặn ngay ở đây thay vì để khách phát hiện.
  const byHash = new Map();
  for (const [id, url] of found) {
    const hash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, 'public', url)))
      .digest('hex');
    byHash.set(hash, [...(byHash.get(hash) ?? []), id]);
  }
  const dupes = [...byHash.values()].filter((g) => g.length > 1);
  if (dupes.length) {
    die(
      'Có ảnh trùng nhau y hệt giữa các món:\n' +
        dupes.map((g) => `    ${g.join(' = ')}`).join('\n') +
        '\n  Mỗi món phải có ảnh riêng.'
    );
  }

  const entries = [...found.entries()].sort(([a], [b]) => a.localeCompare(b));
  const body = entries.map(([id, url]) => `  '${id}': '${url}'`).join(',\n');
  fs.writeFileSync(
    MANIFEST,
    `// SINH TỰ ĐỘNG — đừng sửa tay.\n` +
      `// Chạy \`npm run menu:photos\` sau khi thêm hoặc bớt ảnh trong public/images/menu/.\n` +
      `//\n` +
      `// Mỗi khoá là mã món trong menu.js, giá trị là đường dẫn ảnh. Món không có\n` +
      `// trong bảng này sẽ hiện ảnh mặc định menu-placeholder.svg.\n` +
      `export const menuImages = Object.freeze({${entries.length ? `\n${body}\n` : ''}});\n`
  );

  const missing = [...ids].filter((id) => !found.has(id));
  console.log(`\nĐã cập nhật menu-images.js: ${found.size}/${ids.size} món có ảnh.`);
  if (missing.length) {
    console.log(`\nCòn thiếu ảnh ${missing.length} món:`);
    for (const id of missing) console.log(`    ${id.padEnd(28)} ${nameById.get(id)}`);
  } else {
    console.log('Đủ ảnh cho toàn bộ thực đơn.');
  }
}

const inputDir = process.argv[2];
if (inputDir) {
  if (!fs.existsSync(inputDir)) die(`Không tìm thấy thư mục ${inputDir}`);
  console.log(`Đang xử lý ảnh trong ${inputDir} → ${WIDTH}×${HEIGHT} WebP\n`);
  await convert(inputDir);
}
sync();
