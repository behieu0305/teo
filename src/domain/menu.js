// Menu mẫu dành cho giao diện V2. Giữ ORDERS_ENABLED=false cho đến khi thay bằng menu thật.
function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function dishPlaceholder(name, symbol = '🍽️') {
  const safeName = escapeXml(name);
  const safeSymbol = escapeXml(symbol);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6f2f25"/>
        <stop offset="1" stop-color="#45261d"/>
      </linearGradient>
      <radialGradient id="glow" cx="75%" cy="20%" r="70%">
        <stop offset="0" stop-color="#f4ce7d" stop-opacity=".32"/>
        <stop offset="1" stop-color="#f4ce7d" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="720" fill="url(#bg)"/>
    <rect width="960" height="720" fill="url(#glow)"/>
    <circle cx="480" cy="305" r="168" fill="#fffaf2" fill-opacity=".09" stroke="#f4ce7d" stroke-opacity=".55" stroke-width="3"/>
    <text x="480" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="112">${safeSymbol}</text>
    <text x="480" y="545" text-anchor="middle" fill="#fff8eb" font-family="Arial, sans-serif" font-size="44" font-weight="700">${safeName}</text>
    <text x="480" y="594" text-anchor="middle" fill="#f4ce7d" font-family="Arial, sans-serif" font-size="22" font-weight="600" letter-spacing="3">SAIGON STREET FOOD</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const menuCatalog = Object.freeze([
  {
    id: 'bo-kho',
    name: 'Bò kho',
    description: 'Bò hầm đậm vị, dùng kèm bánh mì và rau thơm.',
    category: 'Món chính',
    price: 3000,
    imageUrl: dishPlaceholder('Bò kho', '🥘'),
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
    imageUrl: dishPlaceholder('Cơm gà xối mỡ', '🍗'),
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
    imageUrl: dishPlaceholder('Bánh mì thịt nướng', '🥖'),
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
    imageUrl: dishPlaceholder('Bún thịt nướng', '🍜'),
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
    imageUrl: dishPlaceholder('Mì xào bò', '🍜'),
    available: true,
    featured: false
  },
  {
    id: 'khoai-tay-chien',
    name: 'Khoai tây chiên',
    description: 'Khoai chiên vàng giòn, dùng nóng với sốt.',
    category: 'Ăn vặt',
    price: 1500,
    imageUrl: dishPlaceholder('Khoai tây chiên', '🍟'),
    available: true,
    featured: false
  },
  {
    id: 'tra-tac',
    name: 'Trà tắc',
    description: 'Trà tắc chua dịu, tươi mát và ít ngọt.',
    category: 'Thức uống',
    price: 1000,
    imageUrl: dishPlaceholder('Trà tắc', '🍹'),
    available: true,
    featured: false
  },
  {
    id: 'ca-phe-sua',
    name: 'Cà phê sữa',
    description: 'Cà phê Việt cùng sữa, thơm béo vừa phải.',
    category: 'Thức uống',
    price: 1500,
    imageUrl: dishPlaceholder('Cà phê sữa', '☕'),
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
    imageUrl: dishPlaceholder('Sinh tố xoài', '🥭'),
    available: true,
    featured: false
  }
]);

export function getMenuItem(id) {
  return menuCatalog.find((item) => item.id === id);
}
