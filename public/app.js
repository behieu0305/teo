const tg = window.Telegram?.WebApp;

const state = {
  menu: [],
  cart: new Map(),
  categories: [],
  orderingEnabled: false,
  activeCategory: '__all__',
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

function renderShopStatus() {
  const badge = document.querySelector('#status-open');
  const text = document.querySelector('#status-open-text');
  const hours = document.querySelector('#status-hours');
  if (!badge || !text) return;

  const { opensAt, closesAt, timezone, openingHours } = state.config;
  if (openingHours && hours) hours.textContent = openingHours;

  const open = window.ShopHours.isShopOpen({
    opensAt,
    closesAt,
    nowMinutes: timezone ? window.ShopHours.shopMinutesNow(timezone) : null
  });

  // Unknown hours must not claim the shop is open — say nothing instead.
  if (open === null) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  badge.classList.toggle('is-closed', !open);
  text.textContent = open ? 'Đang mở cửa' : 'Ngoài giờ mở cửa';
}

// Both Telegram links now point at the shop's own account, written straight
// into index.html. They used to be built from the bot username fetched via
// /api/config, which meant a failed config request left the customer with no
// way to reach the shop at all — the link stayed hidden. A person's username
// has no API to resolve it anyway, so the href lives in the markup and this
// only adds the in-app behaviour.
function wireTelegramLinks() {
  for (const link of document.querySelectorAll('a[data-telegram-link]')) {
    link.addEventListener('click', (event) => {
      // target="_blank" is a dead end inside the Telegram WebView; the SDK has to
      // hand the link back to the client instead.
      if (tg?.openTelegramLink) {
        event.preventDefault();
        tg.openTelegramLink(link.href);
      }
    });
  }
}

function renderTelegramUser() {
  const user = tg?.initDataUnsafe?.user;
  document.querySelector('#telegram-user').textContent = user
    ? `Xin chào ${user.first_name || user.username || 'bạn'}${user.username ? ` • @${user.username}` : ''}`
    : 'Mở trong Telegram để đặt món và nhận cập nhật đơn hàng.';
}

const ALL = '__all__';

function categoryName(id) {
  return state.categories.find((category) => category.id === id)?.name ?? id;
}

function categoryNameZh(id) {
  return state.categories.find((category) => category.id === id)?.nameZh ?? '';
}

function filteredMenu() {
  const query = normalize(state.search);
  return state.menu.filter((item) => {
    const categoryMatch = state.activeCategory === ALL || item.category === state.activeCategory;
    // Chinese names are matched raw: stripping diacritics does nothing for Han
    // characters, and lowercasing them is a no-op, so a plain substring test is
    // what lets a Chinese-reading customer find a dish.
    const searchMatch =
      !query ||
      normalize(`${item.name} ${categoryName(item.category)}`).includes(query) ||
      `${item.nameZh}${categoryNameZh(item.category)}`.includes(state.search.trim());
    return categoryMatch && searchMatch;
  });
}

// Groups the visible dishes under their category heading. With 58 dishes a flat
// list is a wall of cards, so the headings give the eye somewhere to rest.
function groupByCategory(items) {
  const order = state.categories.map((category) => category.id);
  const buckets = new Map();
  for (const item of items) {
    buckets.set(item.category, [...(buckets.get(item.category) ?? []), item]);
  }
  return order
    .filter((id) => buckets.has(id))
    .map((id) => ({ id, name: categoryName(id), nameZh: categoryNameZh(id), items: buckets.get(id) }));
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

const IMAGE_PLACEHOLDER = '/images/menu-placeholder.svg';

// A dish with no photo renders the placeholder, and a photo that fails to load
// swaps to it too. Showing the wrong dish is worse than showing none, so the
// menu must stay presentable while real photography is still missing.
function dishImage(item, extraClass = '') {
  const src = item.imageUrl ? escapeHtml(item.imageUrl) : IMAGE_PLACEHOLDER;
  const cls = [extraClass, item.imageUrl ? '' : 'is-placeholder'].filter(Boolean).join(' ');
  return `<img src="${src}"${cls ? ` class="${cls}"` : ''} alt="${escapeHtml(item.name)}" loading="lazy"
    onerror="this.onerror=null;this.src='${IMAGE_PLACEHOLDER}';this.classList.add('is-placeholder')" />`;
}

function featureCard(item) {
  return `
    <article class="feature-card">
      ${dishImage(item)}
      ${item.badge ? `<span class="badge">${escapeHtml(item.badge)}</span>` : ''}
      <div class="feature-content">
        <div class="feature-top"><h4>${escapeHtml(item.name)}</h4><span class="price">${money(item.price)}</span></div>
        <p class="name-zh" lang="zh">${escapeHtml(item.nameZh ?? '')}</p>
        ${quantityMarkup(item)}
      </div>
    </article>`;
}

function menuCard(item) {
  return `
    <article class="menu-card">
      <div class="menu-card-image">
        ${dishImage(item)}
      </div>
      <div class="menu-card-content">
        <div class="menu-card-top">
          <h4>${escapeHtml(item.name)}</h4>
          <span class="price">${money(item.price)}</span>
        </div>
        <p class="name-zh" lang="zh">${escapeHtml(item.nameZh ?? '')}</p>
        ${quantityMarkup(item, true)}
      </div>
    </article>`;
}

function renderCategories() {
  const tabs = [{ id: ALL, name: 'Tất cả', nameZh: '全部' }, ...state.categories];
  nodes.categories.innerHTML = tabs
    .map(
      (category) => `<button type="button" class="category-button${
        category.id === state.activeCategory ? ' is-active' : ''
      }" data-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}<small lang="zh">${escapeHtml(
        category.nameZh
      )}</small></button>`
    )
    .join('');
}

function renderMenu() {
  const visible = filteredMenu();
  const featured = state.menu.filter((item) => item.featured).slice(0, 6);

  // One category selected means the heading would just repeat the active tab,
  // so only the mixed views get section headings.
  const grouped = groupByCategory(visible);
  nodes.menu.innerHTML =
    grouped.length > 1
      ? grouped
          .map(
            (group) => `
              <h3 class="menu-group-heading" id="group-${escapeHtml(group.id)}">
                <span>${escapeHtml(group.name)}</span>
                <small lang="zh">${escapeHtml(group.nameZh)}</small>
                <em>${group.items.length} món</em>
              </h3>
              <div class="menu-grid">${group.items.map(menuCard).join('')}</div>`
          )
          .join('')
      : `<div class="menu-grid">${visible.map(menuCard).join('')}</div>`;

  nodes.menuEmpty.hidden = visible.length > 0;
  nodes.menuCount.textContent =
    visible.length === state.menu.length
      ? `${state.menu.length} món trong thực đơn`
      : `${visible.length}/${state.menu.length} món`;

  const showFeatured = state.activeCategory === ALL && !state.search && featured.length > 0;
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
      ${dishImage({ ...item, name: '' })}
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

// Only DELIVERED is a promise we can keep. FAILED means every message to the
// shop bounced and nobody there knows the order exists — telling that customer
// "quán sẽ xác nhận qua Telegram" leaves them waiting for a confirmation that
// is never coming. Anything else (PENDING on a retry sent while the first
// request is still fanning out, or a missing field from an older server) is
// genuinely not known yet, so it must not be dressed up as either one.
const SUCCESS_COPY = {
  DELIVERED: (id) => `Mã đơn ${id}. Quán sẽ xác nhận qua Telegram.`,
  FAILED: (id) =>
    `Mã đơn ${id}. Đơn đã được lưu nhưng chưa gửi được tới quán — vui lòng nhắn Telegram cho quán để xác nhận.`
};

function showSuccess(orderId, managerNotification) {
  const copy =
    SUCCESS_COPY[managerNotification] ??
    ((id) => `Mã đơn ${id}. Đơn đã được ghi nhận, đang gửi tới quán…`);

  nodes.successMessage.textContent = copy(orderId);
  nodes.successToast.hidden = false;
  window.setTimeout(
    () => { nodes.successToast.hidden = true; },
    managerNotification === 'FAILED' ? 12000 : 5200
  );
}

// Kept for the whole lifetime of one order attempt so a retry after a dropped
// response reuses the key and the server returns the original order instead of
// creating a duplicate. Cleared only once an order is actually accepted.
let pendingIdempotencyKey = null;

function idempotencyKey() {
  pendingIdempotencyKey ??= (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .replaceAll('.', '-');
  return pendingIdempotencyKey;
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

  // Outside Telegram there is no initData to sign the request with. The server
  // only honours this when ALLOW_DEV_TELEGRAM_BYPASS is on and it is not
  // production, so in production this simply yields a clear 401.
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
        'idempotency-key': idempotencyKey(),
        ...(tg?.initData ? { 'x-telegram-init-data': tg.initData } : {})
      },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Không thể gửi đơn hàng. Vui lòng thử lại.');

    pendingIdempotencyKey = null;
    state.cart.clear();
    nodes.phone.value = '';
    nodes.address.value = '';
    nodes.note.value = '';
    renderMenu();
    renderCart();
    closeCart();
    showSuccess(result.orderId, result.managerNotification);
    tg?.HapticFeedback?.notificationOccurred(
      result.managerNotification === 'FAILED' ? 'warning' : 'success'
    );
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
    state.activeCategory = ALL;
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
  // Outside the try below on purpose: the contact links must survive a failed
  // /api/config or /api/menu request, which is exactly when a customer needs
  // to message the shop.
  wireTelegramLinks();

  try {
    const [configResponse, menuResponse] = await Promise.all([fetch('/api/config'), fetch('/api/menu')]);
    if (!configResponse.ok) throw new Error('Không tải được cấu hình cửa hàng.');
    if (!menuResponse.ok) throw new Error('Không tải được thực đơn.');

    state.config = { ...state.config, ...(await configResponse.json()) };
    state.orderingEnabled = Boolean(state.config.orderingEnabled);
    renderShopStatus();
    const menu = await menuResponse.json();
    // Older deploys returned a bare array; accept both so a cached
    // Mini App shell does not break against a newer server.
    state.menu = Array.isArray(menu) ? menu : menu.items;
    state.categories = Array.isArray(menu)
      ? [...new Set(state.menu.map((i) => i.category))].map((id) => ({ id, name: id, nameZh: '' }))
      : menu.categories;
    renderMenu();
    renderCart();
  } catch (error) {
    nodes.menu.textContent = error.message;
    nodes.menuCount.textContent = 'Không tải được menu';
  }
}

init();
