# Telegram Mini App Ordering — Railway Production

> Bản sửa lỗi Railway: `package.json` phải nằm ở gốc repository. Đọc `RAILWAY-ERROR-GUIDE.md` trước khi deploy.


Dự án mới độc lập, chạy trực tiếp trên Railway bằng Node.js/Railpack. Không cần Docker Desktop và không có Dockerfile trong repository.

## Kiến trúc

- Railway Web Service: Mini App, Express API và Telegram webhook.
- Railway MongoDB Service: lưu đơn hàng qua private network.
- Telegram Bot: `/start`, mở Mini App, gửi đơn cho quản lý và cập nhật trạng thái.

## Biến môi trường của Web Service

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=...
TELEGRAM_MANAGER_IDS=123456789
TELEGRAM_WEBHOOK_SECRET=chuoi_ngau_nhien_it_nhat_16_ky_tu
MONGODB_URI=${{MongoDB.MONGO_URL}}
ALLOW_DEV_TELEGRAM_BYPASS=false
AUTO_SET_WEBHOOK=true
ORDERS_ENABLED=false
```

`PUBLIC_BASE_URL` và `MINI_APP_URL` có thể không cần nhập. Khi Railway đã tạo Public Domain, ứng dụng tự dùng `https://$RAILWAY_PUBLIC_DOMAIN`.

## Triển khai trên Railway

1. Tạo repository GitHub mới và tải toàn bộ mã nguồn này lên nhánh `main`.
2. Railway → **New Project** → **Deploy from GitHub repo** → chọn repository mới.
3. Trên Project Canvas, chọn **+ New** → **Database** → **MongoDB**.
4. Mở Web Service → **Variables** → **Raw Editor** và nhập các biến ở trên.
5. Đặt `MONGODB_URI` là reference variable `${{MongoDB.MONGO_URL}}`.
6. Web Service → **Settings** → **Networking** → **Generate Domain**.
7. Sau khi có domain, redeploy Web Service một lần để ứng dụng tự đăng ký Telegram webhook.
8. Thay menu minh họa trong `src/domain/menu.js` bằng menu thật.
9. Chỉ sau khi kiểm tra giá và món, đổi `ORDERS_ENABLED=true` rồi redeploy.
10. Kiểm tra `https://TEN-DOMAIN/health` trả về `{ "ok": true }`.
11. Nhắn `/start` cho Bot và thử mở Mini App.

## Cấu hình Railway đi kèm

`railway.json` ép Railway dùng Railpack, chạy `npm start`, healthcheck `/health`, và tự khởi động lại khi tiến trình lỗi.

## Bảo mật

- Không đưa `.env` hoặc Bot Token lên GitHub.
- `ALLOW_DEV_TELEGRAM_BYPASS` phải là `false` trên production.
- `ORDERS_ENABLED=false` giữ hệ thống ở chế độ xem menu, chưa nhận đơn; chỉ bật sau khi menu thật đã hoàn tất.
- Chỉ Telegram ID trong `TELEGRAM_MANAGER_IDS` được đổi trạng thái đơn.
- Backend xác minh Telegram `initData` và tự tính lại giá từ menu.

## Lệnh chính

```bash
npm start
npm test
npm run set-webhook
```

Webhook được tự cấu hình khi `AUTO_SET_WEBHOOK=true`; lệnh `npm run set-webhook` chỉ dùng khi cần đặt lại thủ công.
