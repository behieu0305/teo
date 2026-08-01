# Báo cáo kiểm tra ảnh menu 58 món

## Kết luận

- Dữ liệu menu được đối chiếu với danh sách 58 món do chủ quán cung cấp.
- Toàn bộ ảnh cũ của menu mẫu đã được thay; không giữ lại ảnh cũ vì có ảnh placeholder, ảnh lặp và ảnh sai món.
- Mỗi món dùng một URL ảnh riêng; không có URL trùng.
- Ảnh được chuẩn hóa WebP 800 × 600 px, tỷ lệ 4:3.
- Frontend dùng `object-fit: cover`, `object-position: center`, lazy loading và ảnh fallback nội bộ.
- Do dự án không có đủ ảnh chụp thật đúng 58 món, bộ ảnh hiện tại là ảnh tạo mới. Các món được đánh dấu **Cần duyệt** phải được chủ quán xác nhận trước khi bật nhận đơn thật.

## Bảng kiểm tra

| # | Tên món | Đường dẫn ảnh | Khớp tên món | Dấu hiệu giống AI | Mobile cắt/méo | Chủ quán xác nhận |
|---:|---|---|---|---|---|---|
| 1 | Bò kho | `/images/menu/01-bo-kho.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 2 | Bún bò | `/images/menu/02-bun-bo.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 3 | Canh bún | `/images/menu/03-canh-bun.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 4 | Phở bò | `/images/menu/04-pho-bo.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 5 | Phở gà | `/images/menu/05-pho-ga.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 6 | Phá lấu lòng bò | `/images/menu/06-pha-lau-long-bo.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 7 | Miến gà trứng non | `/images/menu/07-mien-ga-trung-non.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 8 | Cari gà | `/images/menu/08-cari-ga.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 9 | Cơm gà xối mỡ | `/images/menu/09-com-ga-xoi-mo.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 10 | Cơm chiên dương châu | `/images/menu/10-com-chien-duong-chau.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 11 | Bánh mì chả cá | `/images/menu/11-banh-mi-cha-ca.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 12 | Bánh mì bò lá lốt | `/images/menu/12-banh-mi-bo-la-lot.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 13 | Bánh mì heo quay | `/images/menu/13-banh-mi-heo-quay.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 14 | Bánh mì thịt nướng | `/images/menu/14-banh-mi-thit-nuong.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 15 | Bánh mì cá hộp | `/images/menu/15-banh-mi-ca-hop.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 16 | Bánh mì trứng | `/images/menu/16-banh-mi-trung.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 17 | Mì xào gà | `/images/menu/17-mi-xao-ga.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 18 | Bún mắm nêm | `/images/menu/18-bun-mam-nem.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 19 | Bún thịt nướng | `/images/menu/19-bun-thit-nuong.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 20 | Cơm tấm trứng | `/images/menu/20-com-tam-trung.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 21 | Bánh bột lọc | `/images/menu/21-banh-bot-loc.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 22 | Mì xào bò | `/images/menu/22-mi-xao-bo.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 23 | Cơm chiên cá mặn | `/images/menu/23-com-chien-ca-man.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 24 | Bắp xào | `/images/menu/24-bap-xao.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 25 | Bánh bò | `/images/menu/25-banh-bo.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 26 | Bánh tiêu | `/images/menu/26-banh-tieu.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 27 | Khoai tây chiên lắc phô mai | `/images/menu/27-khoai-tay-chien-lac-pho-mai.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 28 | Bánh chuối nướng | `/images/menu/28-banh-chuoi-nuong.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 29 | Bánh chuối hấp | `/images/menu/29-banh-chuoi-hap.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 30 | Khoai mì nướng | `/images/menu/30-khoai-mi-nuong.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 31 | Bánh da lợn | `/images/menu/31-banh-da-lon.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 32 | Khoai mỡ chiên | `/images/menu/32-khoai-mo-chien.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 33 | Rau má dừa | `/images/menu/33-rau-ma-dua.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 34 | Rau má nguyên chất | `/images/menu/34-rau-ma-nguyen-chat.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 35 | Rau má đậu | `/images/menu/35-rau-ma-dau.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 36 | Sương sâm | `/images/menu/36-suong-sam.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 37 | Sâm dứa | `/images/menu/37-sam-dua.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 38 | Sinh tố chuối việt quất | `/images/menu/38-sinh-to-chuoi-viet-quat.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 39 | Sinh tố mãng cầu | `/images/menu/39-sinh-to-mang-cau.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 40 | Sinh tố bơ | `/images/menu/40-sinh-to-bo.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 41 | Sinh tố xoài | `/images/menu/41-sinh-to-xoai.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 42 | Sinh tố dâu | `/images/menu/42-sinh-to-dau.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 43 | Trà đào | `/images/menu/43-tra-dao.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 44 | Trà tắc | `/images/menu/44-tra-tac.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 45 | Trà nóng | `/images/menu/45-tra-nong.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 46 | Đá me | `/images/menu/46-da-me.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 47 | La hán quả | `/images/menu/47-la-han-qua.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 48 | Đá chanh | `/images/menu/48-da-chanh.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 49 | Chanh dây | `/images/menu/49-chanh-day.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 50 | Chanh muối | `/images/menu/50-chanh-muoi.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 51 | Dưa hấu ép | `/images/menu/51-dua-hau-ep.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 52 | Ổi ép | `/images/menu/52-oi-ep.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 53 | Cam ép | `/images/menu/53-cam-ep.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 54 | Thơm ép | `/images/menu/54-thom-ep.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 55 | Capheden (Cà phê đen) | `/images/menu/55-capheden-ca-phe-den.webp` | Đạt | Trung bình | Không méo; crop giữa 4:3 | Không bắt buộc |
| 56 | Caphesua (Cà phê sữa) | `/images/menu/56-caphesua-ca-phe-sua.webp` | Đạt | Thấp | Không méo; crop giữa 4:3 | Không bắt buộc |
| 57 | Bạc xỉu | `/images/menu/57-bac-xiu.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |
| 58 | Latte | `/images/menu/58-latte.webp` | Cần duyệt | Trung bình | Không méo; crop giữa 4:3 | Có |

## Nhóm cần ưu tiên chụp ảnh thật tại quán

Canh bún; Phá lấu lòng bò; Miến gà trứng non; Cari gà; Bánh mì chả cá; Bánh mì bò lá lốt; Bánh mì heo quay; Bánh mì cá hộp; Bánh mì trứng; Bún mắm nêm; Cơm tấm trứng; Cơm chiên cá mặn; Bánh bò; Bánh tiêu; Bánh chuối hấp; Khoai mì nướng; Khoai mỡ chiên; Rau má dừa; Rau má đậu; Sâm dứa; Trà nóng; La hán quả; Chanh dây; Chanh muối; Ổi ép; Bạc xỉu; Latte.

## Trạng thái vận hành

Giữ `ORDERS_ENABLED=false` cho đến khi chủ quán duyệt nhóm ảnh cần xác nhận và kiểm tra giao diện thật trên Telegram Mini App.
