#!/usr/bin/env node
// Sinh ảnh cho toàn bộ thực đơn bằng Gemini API, mỗi món một ảnh.
//
//   export GEMINI_API_KEY=...            lấy ở https://aistudio.google.com/apikey
//   npm run menu:generate                sinh cho món chưa có ảnh
//   npm run menu:generate -- pho-bo bun-bo   sinh lại vài món cụ thể
//
// Ảnh ra nằm ở anh-mon-ai/. Xem lại từng tấm rồi mới chạy:
//   npm run menu:photos -- ./anh-mon-ai
//
// Dùng API thay vì app Gemini vì app đóng dấu ✦ nhìn thấy được vào góc ảnh.
// Ảnh qua API chỉ mang SynthID vô hình.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuCatalog } from '../src/domain/menu.js';
import { buildPrompt, DISH_PROMPTS } from './menu-photo-prompts.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'anh-mon-ai');
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODEL = 'gemini-3.1-flash-image';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(
    '\n✖ Thiếu GEMINI_API_KEY.\n' +
      '  Lấy khoá ở https://aistudio.google.com/apikey rồi chạy:\n' +
      '      export GEMINI_API_KEY=khoa_cua_ban\n'
  );
  process.exit(1);
}

const nameById = new Map(menuCatalog.map((i) => [i.id, i.name]));
const requested = process.argv.slice(2);

// Không có món nào chỉ định thì bỏ qua món đã sinh rồi, để chạy lại sau khi
// đứt mạng không phải trả tiền lại cho những tấm đã có.
const targets = (requested.length ? requested : Object.keys(DISH_PROMPTS)).filter((id) => {
  if (!DISH_PROMPTS[id]) {
    console.warn(`⚠ Bỏ qua "${id}": không có mô tả trong menu-photo-prompts.js`);
    return false;
  }
  if (!requested.length && fs.existsSync(path.join(OUT_DIR, `${id}.jpg`))) return false;
  return true;
});

if (targets.length === 0) {
  console.log('Không có món nào cần sinh. Xoá file trong anh-mon-ai/ nếu muốn làm lại.');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log(`Sinh ${targets.length} ảnh bằng ${MODEL} → ${path.relative(ROOT, OUT_DIR)}/\n`);

async function generate(id, attempt = 1) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: 'text', text: buildPrompt(id) }],
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '1:1' }
    })
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    // 429 là hết quota tức thời, 5xx là lỗi phía Google — cả hai đều đáng thử lại.
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const waitMs = 2000 * 2 ** (attempt - 1);
      console.log(`    HTTP ${response.status}, thử lại sau ${waitMs / 1000}s…`);
      await new Promise((r) => setTimeout(r, waitMs));
      return generate(id, attempt + 1);
    }
    throw new Error(`HTTP ${response.status} — ${detail}`);
  }

  const body = await response.json();
  const blocks = (body.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? []);
  const image = blocks.find((block) => block.data && String(block.mime_type ?? '').startsWith('image/'));
  if (!image) throw new Error('Phản hồi không có ảnh nào');

  fs.writeFileSync(path.join(OUT_DIR, `${id}.jpg`), Buffer.from(image.data, 'base64'));
}

let ok = 0;
const failed = [];
for (const [index, id] of targets.entries()) {
  const label = `[${index + 1}/${targets.length}] ${id.padEnd(26)}`;
  try {
    await generate(id);
    const kb = Math.round(fs.statSync(path.join(OUT_DIR, `${id}.jpg`)).size / 1024);
    console.log(`  ✓ ${label} ${String(kb).padStart(4)} KB   ${nameById.get(id) ?? ''}`);
    ok += 1;
  } catch (error) {
    console.log(`  ✖ ${label} ${error.message}`);
    failed.push(id);
  }
}

console.log(`\nXong: ${ok} thành công, ${failed.length} lỗi.`);
if (failed.length) console.log(`Chạy lại riêng:  npm run menu:generate -- ${failed.join(' ')}`);
console.log(
  '\nBƯỚC TIẾP THEO — xem lại từng tấm trước khi dùng.\n' +
    '  AI hay dựng sai món Việt: phở thành ramen, bánh mì thành sandwich kẹp.\n' +
    '  Ảnh sai món tệ hơn không có ảnh. Xoá tấm nào sai rồi chạy lại riêng món đó.\n' +
    '\nƯng rồi thì:  npm run menu:photos -- ./anh-mon-ai\n'
);
