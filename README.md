# Thả ảnh món vào đây

Kéo thả ảnh vào thư mục này là xong. Không cần cài gì, không cần chạy lệnh.

## Cách làm

1. Chụp ảnh món (điện thoại là đủ, chụp từ trên xuống, ánh sáng tự nhiên).
2. Đổi tên file theo **mã món** — tra bảng trong `HUONG-DAN-ANH-MON.md`.
   Ví dụ: `pho-bo.jpg`, `bun-bo.png`, `banh-mi-thit-nuong.jpeg`
3. Vào GitHub → thư mục `anh-mon-goc/` → **Add file** → **Upload files** → kéo thả → Commit.
4. Chờ khoảng 1–2 phút. GitHub Actions sẽ tự:
   - xoay ảnh đúng chiều (theo EXIF)
   - cắt vuông, nén xuống 500×500 WebP (~40 KB/ảnh)
   - ghi vào `public/images/menu/`
   - sinh lại `src/domain/menu-images.js`
   - commit ngược vào nhánh
5. Railway tự deploy. Ảnh hiện trên web.

## Quy tắc

- **Tên file phải đúng mã món.** Sai tên thì workflow bỏ qua và ghi cảnh báo
  trong tab Actions — không làm hỏng gì, chỉ là ảnh đó không được dùng.
- **Mỗi món một ảnh riêng.** Dùng chung một tấm cho hai món thì workflow sẽ
  **dừng và báo lỗi** — đây là lỗi đã từng xảy ra thật (12 file hoá ra chỉ là
  3 tấm gốc cắt lại, khách nhìn thấy sai món).
- Định dạng nhận: `.jpg` `.jpeg` `.png` `.webp`
- Không cần lo dung lượng hay kích thước ảnh gốc — workflow lo hết.

## Mẹo cho ảnh đẹp

- Chụp từ trên xuống (top-down) hoặc chếch 45°, đừng chụp ngang tầm mắt
- Ánh sáng ban ngày cạnh cửa sổ, tránh đèn vàng và đèn flash
- Nền đơn giản: bàn gỗ, khăn trắng, mặt bàn tối màu
- Món chiếm khoảng 80% khung hình
- **Chụp cùng một kiểu cho cả một nhóm món** (ví dụ cả 6 món bánh mì) — trong
  thực đơn chúng nằm cạnh nhau, ảnh lệch phong cách nhìn ra ngay
