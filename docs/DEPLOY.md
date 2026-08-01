# Triển khai trên Railway

Tài liệu này gộp toàn bộ hướng dẫn deploy, checklist và tra lỗi. Đọc hết một
lần trước khi deploy lần đầu.

## 1. Cấu trúc repository bắt buộc

Các file sau phải nằm ngay ở gốc repository:

```text
package.json
package-lock.json
railway.json
src/
public/
```

Nếu đã lỡ tải cả thư mục cha lên GitHub, chọn một trong hai cách:

1. Di chuyển toàn bộ file ra gốc repository (đơn giản và ít lỗi hơn); hoặc
2. Railway → Web Service → Settings → Source → Root Directory → nhập đường dẫn
   thư mục con.

## 2. Thứ tự cấu hình

1. Tạo Railway Project.
2. Thêm MongoDB service (**+ New** → **Database** → **MongoDB**).
3. Kết nối GitHub repository vào Web Service.
4. Web Service → **Variables** → **Raw Editor** → nhập các biến ở mục 3.
5. Với `MONGODB_URI`, dùng **Add Reference** trỏ tới `MONGO_URL` của đúng
   MongoDB service. An toàn hơn tự gõ `${{MongoDB.MONGO_URL}}` vì tên service
   phải khớp chính xác.
6. Deploy.
7. Settings → **Networking** → **Generate Domain**.
8. Redeploy một lần để ứng dụng tự đăng ký Telegram webhook.
9. Kiểm tra `https://TEN-DOMAIN/health` trả về `{"ok": true}`.
10. Nhắn `/start` cho Bot và thử mở Mini App.

## 3. Biến môi trường

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=TOKEN_THAT
TELEGRAM_MANAGER_IDS=TELEGRAM_ID_DANG_SO
TELEGRAM_WEBHOOK_SECRET=CHUOI_NGAU_NHIEN_IT_NHAT_16_KY_TU
MONGODB_URI=${{MongoDB.MONGO_URL}}
ALLOW_DEV_TELEGRAM_BYPASS=false
AUTO_SET_WEBHOOK=true
ORDERS_ENABLED=false
```

Xem `.env.example` để biết đầy đủ, gồm cả các biến tùy chọn
(`INIT_DATA_MAX_AGE_SECONDS`, `LOG_LEVEL`).

`PUBLIC_BASE_URL` và `MINI_APP_URL` có thể bỏ trống — khi Railway đã tạo Public
Domain, ứng dụng tự dùng `https://$RAILWAY_PUBLIC_DOMAIN`.

## 4. Trước khi mở bán thật

`ORDERS_ENABLED=false` giữ hệ thống ở chế độ chỉ xem menu. Chỉ đổi thành `true`
sau khi đã:

- Thay menu mẫu trong `src/domain/menu.js` bằng món, giá và ảnh thật.
- Kiểm tra lại toàn bộ giá (menu mẫu đang để nhiều món cùng một mức giá).
- Thử đặt một đơn và xác nhận quản lý nhận được tin nhắn Telegram.

## 5. Hành vi khi khởi động

- HTTP server mở ngay trên `0.0.0.0:$PORT`, không chờ MongoDB.
- `/health` luôn trả 200 khi tiến trình còn sống (Railway dùng cho healthcheck).
- `/ready` chỉ trả 200 khi MongoDB đã kết nối.
- `POST /api/orders` trả 503 nếu database chưa sẵn sàng.
- MongoDB được thử kết nối lại ở nền. Sau 5 lần thất bại liên tiếp, log ghi
  `mongodb_unreachable` ở mức `error` kèm gợi ý xử lý.

## 6. Tra lỗi theo nội dung log

| Log / triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `No start command could be found`, `package.json not found` | Railway đứng sai thư mục | Đưa `package.json` ra gốc hoặc đặt Root Directory đúng |
| `Invalid environment configuration: ...` | Thiếu hoặc sai biến môi trường | Đọc phần sau dấu hai chấm trong log |
| `TELEGRAM_BOT_TOKEN: Too small` | Token là placeholder hoặc nhập sai | Lấy token thật từ BotFather |
| `TELEGRAM_MANAGER_IDS must contain at least one numeric Telegram ID` | Nhập `@username` thay vì ID số | Nhập ID dạng số |
| `TELEGRAM_WEBHOOK_SECRET` | Secret dưới 16 ký tự hoặc có ký tự lạ | Chỉ dùng chữ, số, `_`, `-`, tối thiểu 16 ký tự |
| `mongodb_connect_failed` | URI sai, database chưa chạy, hoặc khác project/environment | Kiểm tra reference tới `MONGO_URL` |
| `mongodb_unreachable` | Đã thất bại 5 lần liên tiếp | Đơn hàng sẽ trả 503 cho tới khi sửa xong |
| `Healthcheck failed` | Tiến trình chưa mở được cổng | Xem các dòng log ngay trước đó |
| `401 Unauthorized` từ Telegram | Token sai hoặc đã bị thu hồi | Tạo lại token trong BotFather |
| `webhook_setup_skipped` | Chưa có Public Domain | Generate Domain rồi Redeploy. Không phải lỗi |
| `start_without_public_domain` | Bot nhận `/start` khi chưa có domain | Generate Domain rồi Redeploy |
| Mini App trắng trang trên Telegram Web | CSP `frame-ancestors` chặn iframe | Đã xử lý trong `src/app.js`; nếu tái diễn, kiểm tra proxy có ghi đè header không |

## 7. Cấu hình đi kèm

`railway.json` ép Railway dùng Railpack, chạy `node src/server.js`, healthcheck
`/health`, và tự khởi động lại khi tiến trình lỗi.

Start command gọi thẳng `node` thay vì `npm start` để tín hiệu `SIGTERM` của
Railway đến trực tiếp tiến trình Node — cần cho việc tắt máy êm (graceful
shutdown). `drainingSeconds` là 15 và server ép thoát sau 20 giây, nên request
đang chạy luôn được drain xong trước.
