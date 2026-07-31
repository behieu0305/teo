// Menu mẫu dành cho giao diện V2. Giữ ORDERS_ENABLED=false cho đến khi thay bằng menu thật.
export const menuCatalog = Object.freeze([
  {
    id: 'bo-kho',
    name: 'Bò kho',
    description: 'Bò hầm đậm vị, dùng kèm bánh mì và rau thơm.',
    category: 'Món chính',
    price: 3000,
    imageUrl: '/images/menu/bo-kho.webp',
    available: true,
    featured: true,
    badge: 'Bán chạy'
  },
  {
    id: 'bun-bo',
    name: 'Bún bò',
    description: 'Bún nước thơm cay nhẹ, thịt và rau ăn kèm.',
    category: 'Món chính',
    price: 3000,
    imageUrl: '/images/menu/bun-bo.webp',
    available: true,
    featured: true,
    badge: 'Bán chạy'
  },
  {
    id: 'pho-bo',
    name: 'Phở bò',
    description: 'Bánh phở mềm, nước dùng trong và thịt bò.',
    category: 'Món chính',
    price: 3000,
    imageUrl: '/images/menu/pho-bo.webp',
    available: true,
    featured: true,
    badge: 'Bán chạy'
  },
  {
    id: 'com-ga',
    name: 'Cơm gà xối mỡ',
    description: 'Gà giòn da, cơm nóng và đồ chua ăn kèm.',
    category: 'Cơm & Bánh mì',
    price: 3000,
    imageUrl: '/images/menu/com-ga.webp',
    available: true,
    featured: true,
    badge: 'Bán chạy'
  },
  {
    id: 'banh-mi-thit-nuong',
    name: 'Bánh mì thịt nướng',
    description: 'Bánh mì thịt nướng thơm, rau tươi và sốt nhà làm.',
    category: 'Cơm & Bánh mì',
    price: 2000,
    imageUrl: '/images/menu/banh-mi-thit-nuong.webp',
    available: true,
    featured: true,
    badge: 'Bán chạy'
  },
  {
    id: 'bun-thit-nuong',
    name: 'Bún thịt nướng',
    description: 'Bún tươi, thịt nướng, rau và nước mắm đậm vị.',
    category: 'Món chính',
    price: 3000,
    imageUrl: '/images/menu/bun-thit-nuong.webp',
    available: true,
    featured: true,
    badge: 'Bán chạy'
  },
  {
    id: 'goi-cuon',
    name: 'Gỏi cuốn',
    description: 'Cuốn rau tươi và nhân đậm vị, dùng với nước chấm.',
    category: 'Ăn vặt',
    price: 1800,
    imageUrl: '/images/menu/goi-cuon.webp',
    available: true,
    featured: false
  },
  {
    id: 'mi-xao-bo',
    name: 'Mì xào bò',
    description: 'Mì xào nóng cùng thịt bò và rau củ.',
    category: 'Món chính',
    price: 2800,
    imageUrl: '/images/menu/mi-xao-bo.webp',
    available: true,
    featured: false
  },
  {
    id: 'khoai-tay-chien',
    name: 'Khoai tây chiên',
    description: 'Khoai chiên vàng giòn, dùng nóng với sốt.',
    category: 'Ăn vặt',
    price: 1500,
    imageUrl: '/images/menu/khoai-tay-chien.webp',
    available: true,
    featured: false
  },
  {
    id: 'tra-tac',
    name: 'Trà tắc',
    description: 'Trà tắc chua dịu, tươi mát và ít ngọt.',
    category: 'Thức uống',
    price: 1000,
    imageUrl: '/images/menu/tra-tac.webp',
    available: true,
    featured: false
  },
  {
    id: 'ca-phe-sua',
    name: 'Cà phê sữa',
    description: 'Cà phê Việt cùng sữa, thơm béo vừa phải.',
    category: 'Thức uống',
    price: 1500,
    imageUrl: '/images/menu/ca-phe-sua.webp',
    available: true,
    featured: false,
    badge: 'Bán chạy'
  },
  {
    id: 'sinh-to-xoai',
    name: 'Sinh tố xoài',
    description: 'Sinh tố xoài vàng sánh, ngọt thơm.',
    category: 'Thức uống',
    price: 1800,
    imageUrl: '/images/menu/sinh-to-xoai.webp',
    available: true,
    featured: false
  }
]);

export function getMenuItem(id) {
  return menuCatalog.find((item) => item.id === id);
}
