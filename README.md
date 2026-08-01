# Telegram Mini App Ordering — Railway Production

Hệ thống đặt món qua Telegram Mini App, chạy trực tiếp trên Railway bằng
Node.js/Railpack. Không cần Docker.

> Hướng dẫn triển khai, checklist và tra lỗi: **[`docs/DEPLOY.md`](docs/DEPLOY.md)**

## Kiến trúc

- **Railway Web Service** — Mini App, Express API và Telegram webhook.
- **Railway MongoDB Service** — lưu đơn hàng qua private network.
- **Telegram Bot** — `/start`, mở Mini App, gửi đơn cho quản lý và cập nhật
  trạng thái bằng nút bấm.

```
public/          Mini App (HTML/CSS/JS thuần, không build step)
src/app.js       Lắp ráp Express: bảo mật, rate limit, route, static
src/server.js    Khởi động HTTP, kết nối MongoDB ở nền, tắt máy êm
src/config/      Đọc và kiểm tra biến môi trường (zod)
src/domain/      Menu, dựng đơn, máy trạng thái đơn hàng
src/repositories/ Lưu trữ đơn (MongoDB, và bản in-memory cho test)
src/routes/      HTTP API
src/services/    Định dạng tin nhắn Telegram
src/telegram/    Bot và cấu hình webhook
src/utils/       Xác thực Telegram initData, logging
```

## Chạy tại máy

```bash
npm ci
cp .env.example .env      # điền giá trị thật
npm run dev
```

Ngoài Telegram sẽ không có `initData` để ký request. Đặt
`ALLOW_DEV_TELEGRAM_BYPASS=true` và `NODE_ENV=development` để thử luồng đặt đơn;
cấu hình này bị chặn cứng ở production.

## Lệnh chính

```bash
npm start           # chạy production
npm run dev         # chạy kèm watch
npm test            # chạy toàn bộ test
npm run test:watch  # test ở chế độ watch
npm run set-webhook # đặt lại webhook thủ công
```

Webhook tự cấu hình khi `AUTO_SET_WEBHOOK=true`.

## API

| Method | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/health` | Liveness. Luôn 200 khi tiến trình còn sống |
| `GET` | `/ready` | Readiness. 200 chỉ khi MongoDB đã kết nối |
| `GET` | `/api/config` | Cấu hình hiển thị cho Mini App |
| `GET` | `/api/menu` | Danh sách món đang bán |
| `POST` | `/api/orders` | Tạo đơn. Hỗ trợ header `Idempotency-Key` |
| `GET` | `/api/orders/:id` | Tra cứu đơn. Khách chỉ xem được đơn của mình |

Cả hai route `/api/orders` đều yêu cầu header `X-Telegram-Init-Data`.

## Bảo mật

- Backend xác minh chữ ký Telegram `initData` bằng HMAC-SHA256 và so sánh
  timing-safe. `initData` chỉ được chấp nhận trong `INIT_DATA_MAX_AGE_SECONDS`
  (mặc định 600 giây) để hạn chế giá trị của một chuỗi bị rò rỉ.
- Giá luôn được tính lại từ menu phía server. Client không thể tự đặt giá.
- Chỉ Telegram ID trong `TELEGRAM_MANAGER_IDS` được đổi trạng thái đơn.
- Webhook Telegram được bảo vệ bằng `TELEGRAM_WEBHOOK_SECRET`.
- `ALLOW_DEV_TELEGRAM_BYPASS` bắt buộc là `false` trên production.
- `Idempotency-Key` chặn đơn trùng khi mạng chập chờn hoặc khách bấm hai lần.
- Không đưa `.env` hoặc Bot Token lên GitHub — `.gitignore` đã chặn sẵn.

## Thực đơn

`src/domain/menu.js` chứa **58 món thật** của quán, tên song ngữ Việt – Trung,
chia thành 9 nhóm để khách không phải cuộn qua một danh sách dài:

| Nhóm | 中文 | Số món |
|---|---|---|
| Phở & Bún | 粉面类 | 7 |
| Cơm | 饭类 | 4 |
| Bánh mì | 越南面包 | 6 |
| Mì xào | 炒面 | 2 |
| Món đặc biệt | 特色菜 | 5 |
| Ăn vặt | 小吃 | 8 |
| Cà phê | 咖啡 | 4 |
| Sinh tố & Nước ép | 奶昔果汁 | 9 |
| Trà & Giải khát | 茶饮 | 13 |

Giá tính bằng LKR, hiển thị với ký hiệu `Rs`. Khách tìm món được bằng cả tiếng
Việt (không cần dấu) lẫn tiếng Trung.

## Trước khi mở bán thật

`ORDERS_ENABLED=false` giữ hệ thống ở chế độ chỉ xem menu. Món và giá đã là dữ
liệu thật, nhưng **ảnh món thì chưa có** — mọi món đang hiển thị placeholder.
Xem `src/domain/menu.js` để biết lý do bộ ảnh cũ bị loại bỏ. Khi có ảnh thật,
đặt file vào `public/images/menu/` rồi điền `imageUrl` cho từng món.

Muốn làm nổi bật vài món ở khu "Món được chọn nhiều", đặt `featured: true` và
`badge: 'Bán chạy'` cho đúng những món quán thật sự bán chạy.
