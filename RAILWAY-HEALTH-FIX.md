# Railway health-check fix

Bản này sửa lỗi deployment bị dừng ở `Mạng > Kiểm tra sức khỏe` khi MongoDB khởi động chậm hoặc URI chưa kết nối được ngay.

## Thay đổi chính

- HTTP server mở ngay trên `0.0.0.0:$PORT`.
- `/health` luôn trả HTTP 200 khi tiến trình web đang chạy.
- `/ready` trả HTTP 200 chỉ khi MongoDB đã kết nối.
- API tạo đơn trả HTTP 503 nếu database chưa sẵn sàng.
- MongoDB tiếp tục thử kết nối ở nền thay vì chặn toàn bộ web server.

## Biến bắt buộc

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=...
TELEGRAM_MANAGER_IDS=123456789
TELEGRAM_WEBHOOK_SECRET=...
MONGODB_URI=${{MongoDB.MONGO_URL}}
ALLOW_DEV_TELEGRAM_BYPASS=false
AUTO_SET_WEBHOOK=true
ORDERS_ENABLED=false
```

Sau khi upload bản này lên GitHub, chọn Redeploy trên Railway.
