# Checklist triển khai thật lên Railway

## Phần đã chuẩn bị sẵn trong mã nguồn

- Không có Dockerfile hoặc docker-compose.yml.
- Railway dùng Railpack.
- Start command: `npm start`.
- Healthcheck: `/health`.
- Bind server: `0.0.0.0:$PORT`.
- Tự thử kết nối lại MongoDB khi database khởi động chậm.
- Tự đặt Telegram webhook sau khi Railway có Public Domain.
- Tự khởi động lại tối đa 10 lần khi tiến trình lỗi.
- Nhận đơn bị khóa mặc định bằng `ORDERS_ENABLED=false`.

## Thao tác bắt buộc trên tài khoản của bạn

### 1. GitHub

Tạo repository mới, ví dụ `telegram-ordering-railway`.

Không chọn tạo README hoặc .gitignore nếu bạn tải toàn bộ thư mục này lên.

Tải toàn bộ file trong thư mục dự án lên nhánh `main`.

### 2. Railway Web Service

- New Project.
- Deploy from GitHub repo.
- Chọn repository mới.
- Có thể để lần deploy đầu chạy; webhook sẽ tạm bỏ qua nếu chưa có domain.

### 3. Railway MongoDB

- Project Canvas → `+ New`.
- Database → MongoDB.
- Giữ MongoDB trong cùng Project với Web Service.

### 4. Variables của Web Service

Dùng Raw Editor:

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=TOKEN_BOT_MOI
TELEGRAM_MANAGER_IDS=TELEGRAM_ID_QUAN_LY
TELEGRAM_WEBHOOK_SECRET=CHUOI_NGAU_NHIEN_IT_NHAT_16_KY_TU
MONGODB_URI=${{MongoDB.MONGO_URL}}
ALLOW_DEV_TELEGRAM_BYPASS=false
AUTO_SET_WEBHOOK=true
ORDERS_ENABLED=false
```

Không cần tự đặt `PORT`.

Không đưa `.env` thật lên GitHub.

### 5. Tạo domain

- Mở Web Service.
- Settings → Networking.
- Generate Domain.
- Redeploy Web Service.

Ứng dụng sẽ tự dùng biến Railway `RAILWAY_PUBLIC_DOMAIN` và tự đặt webhook:

```text
https://TEN-DOMAIN/v1/telegram-webhook
```

### 6. Kiểm tra

Mở:

```text
https://TEN-DOMAIN/health
```

Kết quả đúng:

```json
{"ok":true}
```

Trong Deploy Logs cần thấy:

```text
MongoDB connected
Server listening on 0.0.0.0:...
Telegram webhook ready: https://...
```

Nhắn `/start` cho Bot. Nút mở Mini App phải xuất hiện.

### 7. Mở nhận đơn thật

Menu hiện tại chỉ là dữ liệu minh họa.

Thay toàn bộ món và giá trong:

```text
src/domain/menu.js
```

Sau khi kiểm tra đúng menu, đổi Railway Variable:

```env
ORDERS_ENABLED=true
```

Redeploy rồi đặt một đơn kiểm tra có kiểm soát trước khi công bố cho khách.
