# Hướng dẫn chuẩn bị ảnh món

Hiện cả 58 món đều hiện ảnh mặc định. Làm theo 3 bước dưới là có ảnh thật.

---

## Bước 1 — Chụp hoặc chọn ảnh

**Yêu cầu tối thiểu**

| Hạng mục | Mức cần | Vì sao |
|---|---|---|
| Kích thước | tối thiểu **1600 × 900 px** | Công cụ sẽ thu nhỏ về 800×450. Ảnh nhỏ hơn phóng lên sẽ vỡ. |
| Tỉ lệ | ngang, gần **16:9** | Thẻ món cắt theo tỉ lệ này. Ảnh vuông hoặc dọc sẽ bị cắt mất trên dưới. |
| Định dạng | JPG, PNG, HEIC, WebP | Công cụ tự đổi sang WebP. |
| Bố cục | món **nằm giữa khung** | Ảnh bị cắt hai bên khi màn hình hẹp. Để món giữa thì cắt kiểu nào cũng còn nguyên. |

**Nên**

- Chụp từ trên xuống hoặc chếch 45°, ánh sáng tự nhiên gần cửa sổ.
- Nền đơn giản: mặt bàn gỗ, khay, giấy trơn.
- Chụp ngang máy. Ảnh dọc sẽ mất phần trên và dưới.

**Tránh**

- **Không** ghi chữ, giá, hay dấu "BÁN CHẠY" lên ảnh. Giá đã hiển thị riêng, in vào ảnh là sai ngay khi đổi giá.
- **Không** dùng chung một ảnh cho nhiều món. Công cụ sẽ báo lỗi và dừng — đây chính là lỗi đã từng xảy ra: 12 file hoá ra chỉ là 3 tấm gốc cắt lại, 10 món hiện ảnh món khác.
- Không dùng ảnh tải trên mạng nếu chưa có quyền sử dụng.

---

## Bước 2 — Đặt tên file

Tên file phải **đúng bằng mã món**, viết thường, không dấu, nối bằng gạch ngang.

```
pho-bo.jpg          ✓ đúng
Pho Bo.jpg          ✗ sai — có dấu cách và chữ hoa
phở-bò.jpg          ✗ sai — có dấu tiếng Việt
pho_bo.jpg          ✗ sai — gạch dưới
```

Cho tất cả ảnh vào **một thư mục**, ví dụ `anh-mon/`. Không cần đủ 58 món — làm được món nào thì bỏ vào món đó, món chưa có vẫn hiện ảnh mặc định bình thường.

### Bảng tên file cho từng món

**Phở & Bún (粉面类)**

| Tên file cần đặt | Món |
|---|---|
| `bun-bo.jpg` | Bún bò |
| `canh-bun.jpg` | Canh bún |
| `pho-bo.jpg` | Phở bò |
| `pho-ga.jpg` | Phở gà |
| `mien-ga-trung-non.jpg` | Miến gà trứng non |
| `bun-mam-nem.jpg` | Bún mắm nêm |
| `bun-thit-nuong.jpg` | Bún thịt nướng |

**Cơm (饭类)**

| Tên file cần đặt | Món |
|---|---|
| `com-ga.jpg` | Cơm gà xối mỡ |
| `com-chien-duong-chau.jpg` | Cơm chiên dương châu |
| `com-tam-trung.jpg` | Cơm tấm trứng |
| `com-chien-ca-man.jpg` | Cơm chiên cá mặn |

**Bánh mì (越南面包)**

| Tên file cần đặt | Món |
|---|---|
| `banh-mi-cha-ca.jpg` | Bánh mì chả cá |
| `banh-mi-bo-la-lot.jpg` | Bánh mì bò lá lốt |
| `banh-mi-heo-quay.jpg` | Bánh mì heo quay |
| `banh-mi-thit-nuong.jpg` | Bánh mì thịt nướng |
| `banh-mi-ca-hop.jpg` | Bánh mì cá hộp |
| `banh-mi-trung.jpg` | Bánh mì trứng |

**Mì xào (炒面)**

| Tên file cần đặt | Món |
|---|---|
| `mi-xao-ga.jpg` | Mì xào gà |
| `mi-xao-bo.jpg` | Mì xào bò |

**Món đặc biệt (特色菜)**

| Tên file cần đặt | Món |
|---|---|
| `bo-kho.jpg` | Bò kho |
| `pha-lau-long-bo.jpg` | Phá lấu lòng bò |
| `cari-ga.jpg` | Cari gà |
| `banh-bot-loc.jpg` | Bánh bột lọc |
| `bap-xao.jpg` | Bắp xào |

**Ăn vặt (小吃)**

| Tên file cần đặt | Món |
|---|---|
| `banh-bo.jpg` | Bánh bò |
| `banh-tieu.jpg` | Bánh tiêu |
| `khoai-tay-chien.jpg` | Khoai tây chiên lắc phô mai |
| `banh-chuoi-nuong.jpg` | Bánh chuối nướng |
| `banh-chuoi-hap.jpg` | Bánh chuối hấp |
| `khoai-mi-nuong.jpg` | Khoai mì nướng |
| `banh-da-lon.jpg` | Bánh da lợn |
| `khoai-mo-chien.jpg` | Khoai mỡ chiên |

**Cà phê (咖啡)**

| Tên file cần đặt | Món |
|---|---|
| `ca-phe-den.jpg` | Cà phê đen |
| `ca-phe-sua.jpg` | Cà phê sữa |
| `bac-xiu.jpg` | Bạc xỉu |
| `latte.jpg` | Latte |

**Sinh tố & Nước ép (奶昔果汁)**

| Tên file cần đặt | Món |
|---|---|
| `sinh-to-chuoi-viet-quat.jpg` | Sinh tố chuối việt quất |
| `sinh-to-mang-cau.jpg` | Sinh tố mãng cầu |
| `sinh-to-bo.jpg` | Sinh tố bơ |
| `sinh-to-xoai.jpg` | Sinh tố xoài |
| `sinh-to-dau.jpg` | Sinh tố dâu |
| `dua-hau-ep.jpg` | Dưa hấu ép |
| `oi-ep.jpg` | Ổi ép |
| `cam-ep.jpg` | Cam ép |
| `thom-ep.jpg` | Thơm ép |

**Trà & Giải khát (茶饮)**

| Tên file cần đặt | Món |
|---|---|
| `rau-ma-dua.jpg` | Rau má dừa |
| `rau-ma-nguyen-chat.jpg` | Rau má nguyên chất |
| `rau-ma-dau.jpg` | Rau má đậu |
| `suong-sam.jpg` | Sương sâm |
| `sam-dua.jpg` | Sâm dứa |
| `tra-dao.jpg` | Trà đào |
| `tra-tac.jpg` | Trà tắc |
| `tra-nong.jpg` | Trà nóng |
| `da-me.jpg` | Đá me |
| `la-han-qua.jpg` | La hán quả |
| `da-chanh.jpg` | Đá chanh |
| `chanh-day.jpg` | Chanh dây |
| `chanh-muoi.jpg` | Chanh muối |

---

## Bước 3 — Chạy lệnh

Mở terminal tại thư mục dự án:

```bash
npm install -D sharp          # chỉ cần chạy một lần
npm run menu:photos -- ./anh-mon
```

Lệnh này sẽ:

1. Xoay ảnh đúng chiều theo dữ liệu EXIF (ảnh chụp bằng điện thoại hay bị nằm ngang nếu bỏ qua bước này).
2. Cắt về 800 × 450, tự chọn vùng có món thay vì cắt giữa một cách máy móc.
3. Đổi sang WebP chất lượng 82 — thường còn 40–70 KB mỗi ảnh.
4. Lưu vào `public/images/menu/`.
5. Sinh lại `src/domain/menu-images.js` để menu biết món nào đã có ảnh.
6. In ra danh sách món còn thiếu.

Kết quả trông như sau:

```
Đang xử lý ảnh trong ./anh-mon → 800×450 WebP

  ✓ bun-bo                         52 KB   Bún bò
  ✓ pho-bo                         48 KB   Phở bò

Đã xử lý 2 ảnh.

Đã cập nhật menu-images.js: 2/58 món có ảnh.

Còn thiếu ảnh 56 món:
    canh-bun                     Canh bún
    ...
```

Nếu đặt tên sai, công cụ báo và bỏ qua file đó chứ không làm hỏng gì:

```
⚠ 1 file không khớp mã món nào, đã bỏ qua:
    IMG_2841.jpg
  Đổi tên file theo đúng mã món rồi chạy lại.
```

---

## Bước 4 — Kiểm tra và đưa lên

```bash
npm test                      # phải ra toàn bộ pass
npm run dev                   # mở http://localhost:3000 xem thử
```

Ưng rồi thì:

```bash
git add public/images/menu src/domain/menu-images.js
git commit -m "Thêm ảnh thật cho menu"
git push
```

Railway tự deploy trong 1–2 phút.

---

## Câu hỏi hay gặp

**Chỉ có ảnh vài món thì có sao không?**
Không sao. Món có ảnh hiện ảnh, món chưa có hiện ảnh mặc định. Cứ bổ sung dần.

**Muốn thay ảnh một món đã có?**
Bỏ ảnh mới vào thư mục với đúng tên đó rồi chạy lại lệnh. File cũ bị ghi đè.

**Muốn gỡ ảnh một món?**
Xoá file trong `public/images/menu/` rồi chạy `npm run menu:photos` (không kèm thư mục). Món đó quay về ảnh mặc định.

**Ảnh nặng quá thì sao?**
Không cần lo. Bạn đưa vào ảnh gốc bao nhiêu MB cũng được, công cụ tự nén xuống.

**Vì sao không khai báo đường dẫn ảnh thẳng trong `menu.js`?**
Vì làm tay thì dễ trỏ tới file không tồn tại. Danh sách ảnh được sinh ra từ chính các file có thật trên đĩa, nên không bao giờ lệch.

---

## Ảnh cũ đã bị gỡ

12 file trong `public/images/menu/` trước đây đã bị xoá khỏi repo. Kiểm tra cho thấy 12 file đó thực chất chỉ là **11 ảnh gốc**, trong đó `banh-mi-thit-nuong.webp` và `goi-cuon.webp` giống hệt nhau từng byte. Giữ lại thì công cụ sẽ tự gắn chúng vào menu và khách lại thấy ảnh sai món.
