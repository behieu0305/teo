# Sửa lỗi triển khai Railway

## Cấu trúc GitHub bắt buộc

Các file sau phải nằm ngay ở trang gốc của repository:

```text
package.json
railway.json
src/
public/
```

Không được để thành:

```text
saigon-telegram-ordering/package.json
```

Nếu đã tải cả thư mục ngoài lên GitHub, có hai cách:

1. Di chuyển toàn bộ file trong thư mục `saigon-telegram-ordering` ra gốc repository; hoặc
2. Railway → Web Service → Settings → Source → Root Directory → nhập `/saigon-telegram-ordering`.

Cách 1 đơn giản và ít lỗi hơn.

## Thứ tự cấu hình đúng

1. Tạo Railway Project.
2. Thêm MongoDB service.
3. Kết nối GitHub repository vào Web Service.
4. Trong Web Service → Variables, nhập các biến thật.
5. Với `MONGODB_URI`, chọn Add Reference và tham chiếu biến `MONGO_URL` của đúng MongoDB service.
6. Deploy.
7. Generate Domain.
8. Redeploy để tự đăng ký Telegram webhook.

## Biến bắt buộc

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=TOKEN_THAT
TELEGRAM_MANAGER_IDS=TELEGRAM_ID_DANG_SO
TELEGRAM_WEBHOOK_SECRET=CHUOI_NGAU_NHIEN_KHONG_DAU_CACH
MONGODB_URI=${{MongoDB.MONGO_URL}}
ALLOW_DEV_TELEGRAM_BYPASS=false
AUTO_SET_WEBHOOK=true
ORDERS_ENABLED=false
```

Tên `MongoDB` trong `${{MongoDB.MONGO_URL}}` phải khớp chính xác với tên service database trên Railway. An toàn nhất là tạo Reference Variable bằng giao diện thay vì tự gõ.

## Đọc lỗi theo nội dung log

### `No start command could be found` hoặc `package.json not found`

Railway đang đứng sai thư mục. Đưa `package.json` ra gốc GitHub hoặc đặt Root Directory đúng.

### `Invalid environment configuration`

Một hoặc nhiều biến môi trường thiếu hoặc sai. Đọc phần sau dấu hai chấm trong log.

### `TELEGRAM_BOT_TOKEN: Too small`

Token đang là placeholder, bị thiếu hoặc nhập sai.

### `TELEGRAM_MANAGER_IDS must contain at least one numeric Telegram ID`

Phải nhập ID số, không nhập `@username`.

### `TELEGRAM_WEBHOOK_SECRET`

Secret phải dài tối thiểu 16 ký tự và chỉ gồm chữ, số, `_`, `-`.

### `MongoDB connection attempt ... failed`

`MONGODB_URI` chưa tham chiếu đúng `MONGO_URL`, database chưa chạy, hoặc Web Service và MongoDB không nằm cùng Railway project/environment.

### `Healthcheck failed`

Ứng dụng chưa kịp mở cổng vì đang lỗi cấu hình hoặc lỗi MongoDB. Xem các dòng log ngay trước thông báo healthcheck.

### `401 Unauthorized` từ Telegram

Bot token sai hoặc token đã bị thu hồi trong BotFather.

### `Webhook setup skipped`

Không phải lỗi. Hãy Generate Domain rồi Redeploy.
