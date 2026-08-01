// Thực đơn thật của quán, 58 món. Tên song ngữ Việt – Trung để phục vụ cả
// khách Việt và khách Trung.
//
// Giá tính bằng LKR (Rupee Sri Lanka), hiển thị với ký hiệu "Rs". File nguồn
// ghi nhóm thức uống bằng "Rp" nhưng phần đầu file khẳng định toàn bộ đơn vị là
// LKR và quán ở Colombo, nên "Rp" được hiểu là cách viết tắt của "Rs".
//
// Ảnh món: chưa có ảnh dùng được. Bộ ảnh cũ trong public/images/menu/ chỉ là ba
// tấm gốc cắt lại nên phần lớn hiển thị sai món, lại bị in cứng chữ "BÁN CHẠY"
// vào pixel. Toàn bộ imageUrl để null và giao diện hiện placeholder cho tới khi
// có ảnh thật. Khi có ảnh, đặt file vào public/images/menu/ rồi điền đường dẫn.

export const CATEGORIES = Object.freeze([
  { id: 'pho-bun', name: 'Phở & Bún', nameZh: '粉面类' },
  { id: 'com', name: 'Cơm', nameZh: '饭类' },
  { id: 'banh-mi', name: 'Bánh mì', nameZh: '越南面包' },
  { id: 'mi-xao', name: 'Mì xào', nameZh: '炒面' },
  { id: 'mon-dac-biet', name: 'Món đặc biệt', nameZh: '特色菜' },
  { id: 'an-vat', name: 'Ăn vặt', nameZh: '小吃' },
  { id: 'ca-phe', name: 'Cà phê', nameZh: '咖啡' },
  { id: 'sinh-to-nuoc-ep', name: 'Sinh tố & Nước ép', nameZh: '奶昔果汁' },
  { id: 'tra-giai-khat', name: 'Trà & Giải khát', nameZh: '茶饮' }
]);

const item = (id, name, nameZh, price, category) =>
  Object.freeze({
    id,
    name,
    nameZh,
    price,
    category,
    imageUrl: null,
    available: true,
    featured: false
  });

export const menuCatalog = Object.freeze([
  // --- Phở & Bún ---
  item('bun-bo', 'Bún bò', '牛肉米粉', 3000, 'pho-bun'),
  item('canh-bun', 'Canh bún', '蟹汤米粉', 3000, 'pho-bun'),
  item('pho-bo', 'Phở bò', '牛肉河粉', 3000, 'pho-bun'),
  item('pho-ga', 'Phở gà', '鸡肉河粉', 2800, 'pho-bun'),
  item('mien-ga-trung-non', 'Miến gà trứng non', '鸡肉米线', 3000, 'pho-bun'),
  item('bun-mam-nem', 'Bún mắm nêm', '五花肉干拌粉', 3000, 'pho-bun'),
  item('bun-thit-nuong', 'Bún thịt nướng', '烤肉春卷拌粉', 3000, 'pho-bun'),

  // --- Cơm ---
  item('com-ga', 'Cơm gà xối mỡ', '脆皮鸡饭', 3000, 'com'),
  item('com-chien-duong-chau', 'Cơm chiên dương châu', '扬州炒饭', 2500, 'com'),
  item('com-tam-trung', 'Cơm tấm trứng', '烤肉米饭+鸡蛋', 3000, 'com'),
  item('com-chien-ca-man', 'Cơm chiên cá mặn', '咸鱼炒饭', 2500, 'com'),

  // --- Bánh mì ---
  item('banh-mi-cha-ca', 'Bánh mì chả cá', '鱼糕越南面包', 2000, 'banh-mi'),
  item('banh-mi-bo-la-lot', 'Bánh mì bò lá lốt', '烤牛肉越南面包', 2000, 'banh-mi'),
  item('banh-mi-heo-quay', 'Bánh mì heo quay', '五花越南', 2000, 'banh-mi'),
  item('banh-mi-thit-nuong', 'Bánh mì thịt nướng', '肉末叉烧越南面包', 2000, 'banh-mi'),
  item('banh-mi-ca-hop', 'Bánh mì cá hộp', '鱼肉越南面包', 2000, 'banh-mi'),
  item('banh-mi-trung', 'Bánh mì trứng', '鸡蛋越南面包', 1500, 'banh-mi'),

  // --- Mì xào ---
  item('mi-xao-ga', 'Mì xào gà', '鸡肉炒面', 2800, 'mi-xao'),
  item('mi-xao-bo', 'Mì xào bò', '牛肉炒面', 2800, 'mi-xao'),

  // --- Món đặc biệt ---
  item('bo-kho', 'Bò kho', '越南牛肉', 3000, 'mon-dac-biet'),
  item('pha-lau-long-bo', 'Phá lấu lòng bò', '肉牛', 3000, 'mon-dac-biet'),
  item('cari-ga', 'Cari gà', '咖喱鸡', 2800, 'mon-dac-biet'),
  item('banh-bot-loc', 'Bánh bột lọc', '越式水晶饺', 2500, 'mon-dac-biet'),
  item('bap-xao', 'Bắp xào', '炒玉米粒', 1500, 'mon-dac-biet'),

  // --- Ăn vặt ---
  item('banh-bo', 'Bánh bò', '蒸米糕', 1000, 'an-vat'),
  item('banh-tieu', 'Bánh tiêu', '越南空心饼', 500, 'an-vat'),
  item('khoai-tay-chien', 'Khoai tây chiên lắc phô mai', '芝士薯条', 1500, 'an-vat'),
  item('banh-chuoi-nuong', 'Bánh chuối nướng', '烤香蕉糕', 1000, 'an-vat'),
  item('banh-chuoi-hap', 'Bánh chuối hấp', '蒸香蕉糕', 1000, 'an-vat'),
  item('khoai-mi-nuong', 'Khoai mì nướng', '烤木薯糕', 1000, 'an-vat'),
  item('banh-da-lon', 'Bánh da lợn', '越南千层糕', 1000, 'an-vat'),
  item('khoai-mo-chien', 'Khoai mỡ chiên', '炸香芋糕', 1000, 'an-vat'),

  // --- Cà phê ---
  item('ca-phe-den', 'Cà phê đen', '黑咖啡', 1000, 'ca-phe'),
  item('ca-phe-sua', 'Cà phê sữa', '奶咖啡', 1500, 'ca-phe'),
  item('bac-xiu', 'Bạc xỉu', '白咖啡', 1500, 'ca-phe'),
  item('latte', 'Latte', '拿铁咖啡', 1500, 'ca-phe'),

  // --- Sinh tố & Nước ép ---
  item('sinh-to-chuoi-viet-quat', 'Sinh tố chuối việt quất', '香蕉蓝莓奶昔', 2200, 'sinh-to-nuoc-ep'),
  item('sinh-to-mang-cau', 'Sinh tố mãng cầu', '番石榴奶昔', 1800, 'sinh-to-nuoc-ep'),
  item('sinh-to-bo', 'Sinh tố bơ', '牛油果奶昔', 1800, 'sinh-to-nuoc-ep'),
  item('sinh-to-xoai', 'Sinh tố xoài', '芒果奶昔', 1800, 'sinh-to-nuoc-ep'),
  item('sinh-to-dau', 'Sinh tố dâu', '草莓奶昔', 1800, 'sinh-to-nuoc-ep'),
  item('dua-hau-ep', 'Dưa hấu ép', '西瓜汁', 1500, 'sinh-to-nuoc-ep'),
  item('oi-ep', 'Ổi ép', '金桔汁', 1500, 'sinh-to-nuoc-ep'),
  item('cam-ep', 'Cam ép', '鲜橙汁', 1500, 'sinh-to-nuoc-ep'),
  item('thom-ep', 'Thơm ép', '鲜菠萝汁', 1500, 'sinh-to-nuoc-ep'),

  // --- Trà & Giải khát ---
  item('rau-ma-dua', 'Rau má dừa', '椰奶金钱草汁', 1200, 'tra-giai-khat'),
  item('rau-ma-nguyen-chat', 'Rau má nguyên chất', '原味金钱草汁', 1000, 'tra-giai-khat'),
  item('rau-ma-dau', 'Rau má đậu', '金钱草绿豆汁', 1200, 'tra-giai-khat'),
  item('suong-sam', 'Sương sâm', '仙草冻饮', 1600, 'tra-giai-khat'),
  item('sam-dua', 'Sâm dứa', '菠萝人参汁', 1200, 'tra-giai-khat'),
  item('tra-dao', 'Trà đào', '桃子茶', 800, 'tra-giai-khat'),
  item('tra-tac', 'Trà tắc', '金桔茶', 1000, 'tra-giai-khat'),
  item('tra-nong', 'Trà nóng', '红茶', 800, 'tra-giai-khat'),
  item('da-me', 'Đá me', '塔马林果汁', 1500, 'tra-giai-khat'),
  item('la-han-qua', 'La hán quả', '罗汉果汁', 1500, 'tra-giai-khat'),
  item('da-chanh', 'Đá chanh', '柠檬茶', 1200, 'tra-giai-khat'),
  item('chanh-day', 'Chanh dây', '百香果汁', 1200, 'tra-giai-khat'),
  item('chanh-muoi', 'Chanh muối', '咸柠檬茶', 1500, 'tra-giai-khat')
]);

export function getMenuItem(id) {
  return menuCatalog.find((menuItem) => menuItem.id === id);
}

export function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id);
}
