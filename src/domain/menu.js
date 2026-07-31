// Dữ liệu minh họa mới, không lấy từ bất kỳ dự án trước nào.
export const menuCatalog = Object.freeze([
  {
    id: 'pho-bo',
    name: 'Phở bò',
    category: 'Món chính',
    price: 65000,
    available: true,
    emoji: '🍜'
  },
  {
    id: 'com-ga',
    name: 'Cơm gà',
    category: 'Món chính',
    price: 55000,
    available: true,
    emoji: '🍗'
  },
  {
    id: 'goi-cuon',
    name: 'Gỏi cuốn',
    category: 'Khai vị',
    price: 35000,
    available: true,
    emoji: '🥬'
  },
  {
    id: 'tra-tac',
    name: 'Trà tắc',
    category: 'Nước uống',
    price: 20000,
    available: true,
    emoji: '🥤'
  }
]);

export function getMenuItem(id) {
  return menuCatalog.find((item) => item.id === id);
}
