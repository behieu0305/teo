const tg = window.Telegram?.WebApp;
const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const state = {
  menu: [],
  cart: new Map(),
  orderingEnabled: false
};

const menuNode = document.querySelector('#menu');
const cartNode = document.querySelector('#cart');
const cartEmptyNode = document.querySelector('#cart-empty');
const totalNode = document.querySelector('#total');
const feedbackNode = document.querySelector('#feedback');
const submitButton = document.querySelector('#submit-order');

function renderTelegramUser() {
  const user = tg?.initDataUnsafe?.user;
  const text = user
    ? `Khách: ${user.first_name ?? ''}${user.username ? ` (@${user.username})` : ''}`
    : 'Chế độ trình duyệt phát triển';
  document.querySelector('#telegram-user').textContent = text;
}

function renderMenu() {
  menuNode.innerHTML = '';
  for (const item of state.menu) {
    const card = document.createElement('article');
    card.className = 'menu-card';
    card.innerHTML = `
      <div class="menu-emoji" aria-hidden="true">${item.emoji}</div>
      <div>
        <div class="menu-name"></div>
        <div class="menu-category"></div>
      </div>
      <div class="menu-footer">
        <strong>${money.format(item.price)}</strong>
        <button type="button">Thêm</button>
      </div>
    `;
    card.querySelector('.menu-name').textContent = item.name;
    card.querySelector('.menu-category').textContent = item.category;
    card.querySelector('button').addEventListener('click', () => addItem(item.id));
    menuNode.append(card);
  }
}

function addItem(id) {
  state.cart.set(id, (state.cart.get(id) ?? 0) + 1);
  renderCart();
  tg?.HapticFeedback?.impactOccurred('light');
}

function updateQuantity(id, delta) {
  const next = (state.cart.get(id) ?? 0) + delta;
  if (next <= 0) state.cart.delete(id);
  else state.cart.set(id, Math.min(next, 20));
  renderCart();
}

function cartTotal() {
  return [...state.cart.entries()].reduce((sum, [id, quantity]) => {
    const item = state.menu.find((candidate) => candidate.id === id);
    return sum + (item?.price ?? 0) * quantity;
  }, 0);
}

function renderCart() {
  cartNode.innerHTML = '';
  cartEmptyNode.hidden = state.cart.size > 0;

  for (const [id, quantity] of state.cart.entries()) {
    const item = state.menu.find((candidate) => candidate.id === id);
    if (!item) continue;

    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div>
        <strong></strong>
        <div class="muted">${money.format(item.price)} × ${quantity}</div>
      </div>
      <div class="cart-actions">
        <button type="button" aria-label="Giảm số lượng">−</button>
        <span>${quantity}</span>
        <button type="button" aria-label="Tăng số lượng">+</button>
      </div>
    `;
    row.querySelector('strong').textContent = item.name;
    const [minusButton, plusButton] = row.querySelectorAll('button');
    minusButton.addEventListener('click', () => updateQuantity(id, -1));
    plusButton.addEventListener('click', () => updateQuantity(id, 1));
    cartNode.append(row);
  }

  totalNode.textContent = money.format(cartTotal());
}

async function submitOrder() {
  feedbackNode.textContent = '';
  if (state.cart.size === 0) {
    feedbackNode.textContent = 'Vui lòng chọn ít nhất một món.';
    return;
  }

  const phone = document.querySelector('#phone').value.trim();
  const address = document.querySelector('#address').value.trim();
  const note = document.querySelector('#note').value.trim();

  if (phone.length < 8 || address.length < 5) {
    feedbackNode.textContent = 'Vui lòng nhập số điện thoại và địa chỉ hợp lệ.';
    return;
  }

  const body = {
    items: [...state.cart.entries()].map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity
    })),
    customer: { phone, address, note }
  };

  if (!tg?.initData) {
    body.devTelegramUser = {
      id: 999001,
      username: 'dev_customer',
      first_name: 'Khách thử nghiệm'
    };
  }

  submitButton.disabled = true;
  feedbackNode.textContent = 'Đang gửi đơn…';

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(tg?.initData ? { 'x-telegram-init-data': tg.initData } : {})
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không thể gửi đơn hàng');

    state.cart.clear();
    renderCart();
    feedbackNode.textContent = `Đã gửi đơn ${result.orderId}. Quán sẽ xác nhận qua Telegram.`;
    tg?.HapticFeedback?.notificationOccurred('success');
  } catch (error) {
    feedbackNode.textContent = error.message;
    tg?.HapticFeedback?.notificationOccurred('error');
  } finally {
    submitButton.disabled = !state.orderingEnabled;
  }
}

async function init() {
  tg?.ready();
  tg?.expand();
  renderTelegramUser();
  submitButton.addEventListener('click', submitOrder);

  try {
    const [configResponse, menuResponse] = await Promise.all([
      fetch('/api/config'),
      fetch('/api/menu')
    ]);
    if (!configResponse.ok) throw new Error('Không tải được cấu hình');
    if (!menuResponse.ok) throw new Error('Không tải được menu');

    const appConfig = await configResponse.json();
    state.orderingEnabled = Boolean(appConfig.orderingEnabled);
    state.menu = await menuResponse.json();
    submitButton.disabled = !state.orderingEnabled;
    if (!state.orderingEnabled) {
      feedbackNode.textContent = 'Quán đang cập nhật menu và chưa mở nhận đơn trực tuyến.';
    }
    renderMenu();
    renderCart();
  } catch (error) {
    menuNode.textContent = error.message;
  }
}

init();
