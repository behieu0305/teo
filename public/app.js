const tg = window.Telegram?.WebApp;

const state = {
  menu: [],
  cart: new Map(),
  orderingEnabled: false,
  activeCategory: 'Tất cả',
  search: '',
  config: {
    currencyLabel: 'Rs',
    shopName: 'Saigon Street Food'
  }
};

const nodes = {
  menu: document.querySelector('#menu'),
  menuEmpty: document.querySelector('#menu-empty'),
  menuCount: document.querySelector('#menu-count'),
  featured: document.querySelector('#featured-menu'),
  featuredSection: document.querySelector('#featured-section'),
  categories: document.querySelector('#categories'),
  search: document.querySelector('#menu-search'),
  cart: document.querySelector('#cart'),
  cartEmpty: document.querySelector('#cart-empty'),
  total: document.querySelector('#total'),
  cartBar: document.querySelector('#cart-bar'),
  cartBarCount: document.querySelector('#cart-bar-count'),
  cartBarTotal: document.querySelector('#cart-bar-total'),
  headerCartCount: document.querySelector('#header-cart-count'),
  cartSheet: document.querySelector('#cart-sheet'),
  sheetBackdrop: document.querySelector('#sheet-backdrop'),
  phone: document.querySelector('#phone'),
  address: document.querySelector('#address'),
  note: document.querySelector('#note'),
  phoneError: document.querySelector('#phone-error'),
  addressError: document.querySelector('#address-error'),
  submit: document.querySelector('#submit-order'),
  feedback: document.querySelector('#feedback'),
  orderingNotice: document.querySelector('#ordering-notice'),
  successToast: document.querySelector('#success-toast'),
  successMessage: document.querySelector('#success-message')
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  return `${state.config.currencyLabel} ${Number(value || 0).toLocaleString('en-LK')}`;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function renderTelegramUser() {
  const user = tg?.initDataUnsafe?.user;
  document.querySelector('#telegram-user').textContent = user
    ? `Xin chào ${user.first_name || user.username || 'bạn'}${user.username ? ` • @${user.username}` : ''}`
    : 'Mở trong Telegram để đặt món và nhận cập nhật đơn hàng.';
}

function categories() {
  return ['Tất cả', ...new Set(state.menu.map((item) => item.category))];
}

function filteredMenu() {
  const query = normalize(state.search);
  return state.menu.filter((item) => {
    const categoryMatch = state.activeCategory === 'Tất cả' || item.category === state.activeCategory;
    const searchMatch = !query || normalize(`${item.name} ${item.description} ${item.category}`).includes(query);
    return categoryMatch && searchMatch;
  });
}

function cartQuantity(id) {
  return state.cart.get(id) || 0;
}

function quantityMarkup(item, compact = false) {
  const quantity = cartQuantity(item.id);
  if (!quantity) {
    return `<button class="add-button" type="button" data-action="add" data-id="${escapeHtml(item.id)}">＋ Thêm món</button>`;
  }
  return `
    <div class="quantity-control${compact ? ' is-compact' : ''}" aria-label="Số lượng ${escapeHtml(item.name)}">
      <button type="button" data-action="decrease" data-id="${escapeHtml(item.id)}" aria-label="Giảm ${escapeHtml(item.name)}">−</button>
      <span>${quantity}</span>
      <button type="button" data-action="increase" data-id="${escapeHtml(item.id)}" aria-label="Tăng ${escapeHtml(item.name)}">+</button>
    </div>`;
}

function featureCard(item) {
  return `
    <article class="feature-card">
      <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" />
      ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ''}
      <div class="feature-content">
        <div class="feature-top"><h4>${escapeHtml(item.name)}</h4><span class="price">${money(item.price)}</span></div>
        <p>${escapeHtml(item.description)}</p>
        ${quantityMarkup(item)}
      </div>
    </article>`;
}

function menuCard(item) {
  return `
    <article class="menu-card">
      <div class="menu-card-image">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ''}
      </div>
      <div class="menu-card-content">
        <span class="menu-category">${escapeHtml(item.category)}</span>
        <div class="menu-card-top"><h4>${escapeHtml(item.name)}</h4><span class="price">${money(item.price)}</span></div>
        <p>${escapeHtml(item.description)}</p>
        ${quantityMarkup(item, true)}
      </div>
    </article>`;
}

function renderCategories() {
  nodes.categories.innerHTML = categories()
    .map((category) => `<button type="button" class="category-button${category === state.activeCategory ? ' is-active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`)
    .join('');
}

function renderMenu() {
  const visible = filteredMenu();
  const featured = state.menu.filter((item) => item.featured).slice(0, 6);

  nodes.menu.innerHTML = visible.map(menuCard).join('');
  nodes.menuEmpty.hidden = visible.length > 0;
  nodes.menuCount.textContent = `${state.menu.length} món trong thực đơn`;

  const showFeatured = state.activeCategory === 'Tất cả' && !state.search && featured.length > 0;
  nodes.featuredSection.hidden = !showFeatured;
  nodes.featured.innerHTML = showFeatured ? featured.map(featureCard).join('') : '';
  renderCategories();
}

function setQuantity(id, delta) {
  const current = cartQuantity(id);
  const next = Math.max(0, Math.min(20, current + delta));
  if (next === 0) state.cart.delete(id);
  else state.cart.set(id, next);
  tg?.HapticFeedback?.impactOccurred(delta > 0 ? 'light' : 'soft');
  renderMenu();
  renderCart();
}

function cartItems() {
  return [...state.cart.entries()]
    .map(([id, quantity]) => {
      const item = state.menu.find((candidate) => candidate.id === id);
      return item ? { ...item, quantity, lineTotal: item.price * quantity } : null;
    })
    .filter(Boolean);
}

function cartTotal() {
  return cartItems().reduce((sum, item) => sum + item.lineTotal, 0);
}

function cartCount() {
  return cartItems().reduce((sum, item) => sum + item.quantity, 0);
}

function renderCart() {
  const items = cartItems();
  const count = cartCount();
  const total = cartTotal();

  nodes.cartEmpty.hidden = items.length > 0;
  nodes.cart.innerHTML = items.map((item) => `
    <div class="cart-row">
      <img src="${escapeHtml(item.imageUrl)}" alt="" />
      <div class="cart-row-info"><strong>${escapeHtml(item.name)}</strong><small>${money(item.price)} × ${item.quantity}</small></div>
      <div class="cart-actions">
        <button type="button" data-action="decrease" data-id="${escapeHtml(item.id)}" aria-label="Giảm ${escapeHtml(item.name)}">−</button>
        <span>${item.quantity}</span>
        <button type="button" data-action="increase" data-id="${escapeHtml(item.id)}" aria-label="Tăng ${escapeHtml(item.name)}">+</button>
      </div>
    </div>`).join('');

  nodes.total.textContent = money(total);
  nodes.cartBar.hidden = count === 0;
  nodes.cartBarCount.textContent = `${count} món`;
  nodes.cartBarTotal.textContent = money(total);
  nodes.headerCartCount.hidden = count === 0;
  nodes.headerCartCount.textContent = count;
  updateSubmitState();
}

function validateForm(showErrors = false) {
  const phone = nodes.phone.value.trim();
  const address = nodes.address.value.trim();
  const digits = phone.replace(/\D/g, '');
  const phoneValid = digits.length >= 8 && digits.length <= 15;
  const addressValid = address.length >= 5;

  if (showErrors || nodes.phone.dataset.touched) {
    nodes.phoneError.textContent = phoneValid ? '' : 'Nhập số điện thoại từ 8 đến 15 chữ số.';
  }
  if (showErrors || nodes.address.dataset.touched) {
    nodes.addressError.textContent = addressValid ? '' : 'Địa chỉ cần có ít nhất 5 ký tự.';
  }

  return phoneValid && addressValid;
}

function updateSubmitState() {
  const hasItems = state.cart.size > 0;
  const valid = validateForm(false);
  nodes.orderingNotice.hidden = state.orderingEnabled;
  nodes.orderingNotice.textContent = state.orderingEnabled
    ? ''
    : 'Quán đang cập nhật menu và chưa mở nhận đơn trực tuyến. Bạn vẫn có thể xem và thử giỏ hàng.';

  nodes.submit.disabled = !state.orderingEnabled || !hasItems || !valid;
  if (!state.orderingEnabled) nodes.submit.textContent = 'Quán chưa mở nhận đơn';
  else if (!hasItems) nodes.submit.textContent = 'Chọn món để tiếp tục';
  else if (!valid) nodes.submit.textContent = 'Điền thông tin nhận hàng';
  else nodes.submit.textContent = `Gửi đơn • ${money(cartTotal())}`;
}

function openCart() {
  nodes.sheetBackdrop.hidden = false;
  nodes.cartSheet.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => nodes.cartSheet.classList.add('is-open'));
  document.body.classList.add('sheet-open');
  tg?.BackButton?.show();
  renderCart();
}

function closeCart() {
  nodes.cartSheet.classList.remove('is-open');
  nodes.cartSheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-open');
  tg?.BackButton?.hide();
  window.setTimeout(() => { nodes.sheetBackdrop.hidden = true; }, 280);
}

function handleAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'add' || button.dataset.action === 'increase') setQuantity(id, 1);
  if (button.dataset.action === 'decrease') setQuantity(id, -1);
}

function showSuccess(orderId) {
  nodes.successMessage.textContent = `Mã đơn ${orderId}. Quán sẽ xác nhận qua Telegram.`;
  nodes.successToast.hidden = false;
  window.setTimeout(() => { nodes.successToast.hidden = true; }, 5200);
}

async function submitOrder() {
  nodes.feedback.textContent = '';
  if (!validateForm(true) || state.cart.size === 0 || !state.orderingEnabled) {
    updateSubmitState();
    return;
  }

  const body = {
    items: cartItems().map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
    customer: {
      phone: nodes.phone.value.trim(),
      address: nodes.address.value.trim(),
      note: nodes.note.value.trim()
    }
  };

  if (!tg?.initData) {
    body.devTelegramUser = { id: 999001, username: 'dev_customer', first_name: 'Khách thử nghiệm' };
  }

  nodes.submit.disabled = true;
  nodes.submit.textContent = 'Đang gửi đơn…';

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
    nodes.phone.value = '';
    nodes.address.value = '';
    nodes.note.value = '';
    renderMenu();
    renderCart();
    closeCart();
    showSuccess(result.orderId);
    tg?.HapticFeedback?.notificationOccurred('success');
  } catch (error) {
    nodes.feedback.textContent = error.message;
    tg?.HapticFeedback?.notificationOccurred('error');
  } finally {
    updateSubmitState();
  }
}

function bindEvents() {
  nodes.menu.addEventListener('click', handleAction);
  nodes.featured.addEventListener('click', handleAction);
  nodes.cart.addEventListener('click', handleAction);
  nodes.categories.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.activeCategory = button.dataset.category;
    renderMenu();
    document.querySelector('#menu-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  nodes.search.addEventListener('input', () => { state.search = nodes.search.value; renderMenu(); });
  document.querySelector('#show-all').addEventListener('click', () => {
    state.activeCategory = 'Tất cả';
    state.search = '';
    nodes.search.value = '';
    renderMenu();
    document.querySelector('.menu-divider').scrollIntoView({ behavior: 'smooth' });
  });
  for (const id of ['header-cart', 'hero-cart', 'cart-bar']) document.querySelector(`#${id}`).addEventListener('click', openCart);
  document.querySelector('#close-cart').addEventListener('click', closeCart);
  nodes.sheetBackdrop.addEventListener('click', closeCart);
  tg?.BackButton?.onClick(closeCart);
  nodes.phone.addEventListener('input', updateSubmitState);
  nodes.address.addEventListener('input', updateSubmitState);
  nodes.phone.addEventListener('blur', () => { nodes.phone.dataset.touched = 'true'; validateForm(false); updateSubmitState(); });
  nodes.address.addEventListener('blur', () => { nodes.address.dataset.touched = 'true'; validateForm(false); updateSubmitState(); });
  nodes.submit.addEventListener('click', submitOrder);
}

async function init() {
  tg?.ready();
  tg?.expand();
  tg?.setHeaderColor?.('#f8f1e7');
  tg?.setBackgroundColor?.('#f8f1e7');
  renderTelegramUser();
  bindEvents();

  try {
    const [configResponse, menuResponse] = await Promise.all([fetch('/api/config'), fetch('/api/menu')]);
    if (!configResponse.ok) throw new Error('Không tải được cấu hình cửa hàng.');
    if (!menuResponse.ok) throw new Error('Không tải được thực đơn.');

    state.config = { ...state.config, ...(await configResponse.json()) };
    state.orderingEnabled = Boolean(state.config.orderingEnabled);
    state.menu = await menuResponse.json();
    renderMenu();
    renderCart();
  } catch (error) {
    nodes.menu.textContent = error.message;
    nodes.menuCount.textContent = 'Không tải được menu';
  }
}

init();
