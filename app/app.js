// Direct-Order MVP — клиентский фронт (vanilla JS, без сборки/зависимостей).
(() => {
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");

  // Бренд
  document.documentElement.style.setProperty("--primary", C.BRAND.primary);
  document.documentElement.style.setProperty("--accent", C.BRAND.accent);
  $("#brandName").textContent = C.BRAND.name;
  $("#doorAdmin").href =
    `https://t.me/${C.MANAGER_TG}?text=` +
    encodeURIComponent(`Здравствуйте! Хочу оформить заказ в ${C.BRAND.name}.`);

  // Состояние
  const cart = new Map(); // key -> {name, price, qty}
  let menu = { categories: [] };
  let activeCat = "all";
  let search = "";

  // ── API ─────────────────────────────────────────────────────────────────
  async function callEdge(fn, body) {
    const r = await fetch(`${C.EDGE_BASE}/${fn}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: C.ANON_KEY,
        authorization: `Bearer ${C.ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`);
    return data;
  }

  // ── Меню ────────────────────────────────────────────────────────────────
  async function loadMenu() {
    if (window.__MENU__) {
      menu = window.__MENU__; // одностраничная сборка (edge-хостинг)
    } else {
      try {
        const r = await fetch("menu.json", { cache: "no-store" });
        menu = await r.json();
      } catch {
        menu = { categories: [] };
      }
    }
    renderChips();
    renderMenu();
  }

  function renderChips() {
    const cats = menu.categories || [];
    if (!cats.length) return;
    $("#menuTools").hidden = false;
    const chips = $("#catChips");
    chips.innerHTML = "";
    const mk = (id, label) => {
      const b = document.createElement("button");
      b.className = "chip" + (activeCat === id ? " active" : "");
      b.textContent = label;
      b.onclick = () => { activeCat = id; renderChips(); renderMenu(); };
      chips.appendChild(b);
    };
    mk("all", "Все");
    for (const c of cats) mk(c.name, c.name);
  }

  function renderMenu() {
    const el = $("#menu");
    el.innerHTML = "";
    const q = search.trim().toLowerCase();
    let shown = 0;
    for (const cat of menu.categories || []) {
      if (activeCat !== "all" && cat.name !== activeCat) continue;
      const items = (cat.items || []).filter(
        (it) => !q || String(it.name).toLowerCase().includes(q),
      );
      if (!items.length) continue;
      const wrap = document.createElement("div");
      wrap.className = "menu-cat";
      wrap.innerHTML = `<h3>${esc(cat.name)}</h3>`;
      for (const it of items) {
        shown++;
        const row = document.createElement("div");
        row.className = "menu-item";
        const img = it.image
          ? `<img class="menu-thumb" src="${esc(it.image)}" alt="" loading="lazy" onerror="this.remove()" />`
          : "";
        row.innerHTML = `
          <div class="menu-item-main">
            ${img}
            <div>
              <div class="name">${esc(it.name)}</div>
              <div class="price">${fmt(it.price)} сум</div>
            </div>
          </div>
          <button class="add-btn">Добавить</button>`;
        const btn = row.querySelector(".add-btn");
        btn.addEventListener("click", () => {
          addToCart(it.id || it.name, it.name, it.price, 1);
          btn.textContent = "✓ В корзине";
          btn.classList.add("added");
          setTimeout(() => { btn.textContent = "Добавить"; btn.classList.remove("added"); }, 1000);
        });
        wrap.appendChild(row);
      }
      el.appendChild(wrap);
    }
    if (!shown) {
      el.innerHTML = `<div class="empty">${
        (menu.categories || []).length ? "Ничего не найдено" : "Меню скоро появится"
      }</div>`;
    }
  }

  // ── Корзина ───────────────────────────────────────────────────────────────
  function addToCart(key, name, price, delta) {
    const cur = cart.get(key) || { name, price, qty: 0 };
    cur.qty += delta;
    if (cur.qty <= 0) cart.delete(key);
    else cart.set(key, cur);
    renderCart();
  }

  function subtotal() {
    let t = 0;
    for (const it of cart.values()) t += it.qty * it.price;
    return t;
  }
  function itemCount() {
    let n = 0;
    for (const it of cart.values()) n += it.qty;
    return n;
  }

  function currentZone() {
    return (C.DELIVERY_ZONES || []).find((z) => z.id === $("#zoneSelect").value);
  }
  function isDelivery() {
    const el = $('#checkoutForm input[name="fulfillment"]:checked');
    return !el || el.value === "delivery";
  }
  function deliveryFee() {
    if (!isDelivery()) return 0;
    const z = currentZone();
    if (!z) return 0;
    if (z.free && subtotal() >= z.free) return 0;
    return z.fee || 0;
  }

  function renderCart() {
    const count = itemCount();
    $("#cartCount").textContent = count;
    $("#cartBtn").hidden = count === 0;
    const bar = $("#cartBar");
    bar.hidden = count === 0 || !$("#statusView").hidden || !$("#ordersView").hidden;
    $("#cartBarCount").textContent = `${count} ${plural(count, "позиция", "позиции", "позиций")}`;
    $("#cartBarTotal").textContent = `${fmt(subtotal() + deliveryFee())} сум`;

    const box = $("#cartItems");
    if (!cart.size) {
      box.innerHTML = `<div class="empty">Корзина пуста</div>`;
    } else {
      box.innerHTML = "";
      for (const [key, it] of cart) {
        const line = document.createElement("div");
        line.className = "cart-line";
        line.innerHTML = `
          <div>
            <div>${esc(it.name)}</div>
            <div class="qty">
              <button data-a="dec" aria-label="Меньше">−</button>
              <span class="n">${it.qty}</span>
              <button data-a="inc" aria-label="Больше">+</button>
            </div>
          </div>
          <div style="text-align:right">
            <div>${fmt(it.qty * it.price)} сум</div>
            <button class="rm">убрать</button>
          </div>`;
        line.querySelector('[data-a="inc"]').onclick = () => addToCart(key, it.name, it.price, 1);
        line.querySelector('[data-a="dec"]').onclick = () => addToCart(key, it.name, it.price, -1);
        line.querySelector(".rm").onclick = () => { cart.delete(key); renderCart(); };
        box.appendChild(line);
      }
    }
    renderTotals();
    updateSubmitState();
  }

  function renderTotals() {
    const sub = subtotal();
    const fee = deliveryFee();
    const rows = [[`Позиции`, `${fmt(sub)} сум`]];
    if (isDelivery()) {
      rows.push(["Доставка", fee === 0 ? (currentZone() ? "бесплатно" : "—") : `${fmt(fee)} сум`]);
    }
    rows.push([`<b>Итого</b>`, `<b>${fmt(sub + fee)} сум</b>`]);
    $("#totals").innerHTML = rows
      .map(([k, v]) => `<div class="totals-row"><span>${k}</span><span>${v}</span></div>`)
      .join("");
  }

  function updateSubmitState() {
    const min = Number(C.MIN_ORDER) || 0;
    const belowMin = isDelivery() && min > 0 && subtotal() < min && cart.size > 0;
    const warn = $("#minWarn");
    warn.hidden = !belowMin;
    if (belowMin) warn.textContent = `Минимальная сумма доставки — ${fmt(min)} сум. Добавьте ещё на ${fmt(min - subtotal())} сум или выберите самовывоз.`;
    $("#submitBtn").disabled = cart.size === 0 || belowMin;
  }

  function openCart(open) {
    $("#cartSheet").hidden = !open;
    $("#sheetBackdrop").hidden = !open;
  }

  // ── Слоты времени + зоны ────────────────────────────────────────────────────
  function buildTimeSlots() {
    const sel = $("#timeSlot");
    const H = C.HOURS || { open: "10:00", close: "22:00", slotMinutes: 30, leadMinutes: 30 };
    const [oh, om] = H.open.split(":").map(Number);
    const [ch, cm] = H.close.split(":").map(Number);
    const step = H.slotMinutes || 30;
    const opts = [`<option value="Как можно скорее">Как можно скорее</option>`];
    const now = new Date();
    const earliest = new Date(now.getTime() + (H.leadMinutes || 0) * 60000);
    const days = [["Сегодня", 0], ["Завтра", 1]];
    for (const [label, off] of days) {
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off, oh, om);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off, ch, cm);
      for (let t = new Date(base); t <= end; t = new Date(t.getTime() + step * 60000)) {
        if (off === 0 && t < earliest) continue;
        const hh = String(t.getHours()).padStart(2, "0");
        const mm = String(t.getMinutes()).padStart(2, "0");
        const v = `${label} ${hh}:${mm}`;
        opts.push(`<option value="${v}">${v}</option>`);
      }
    }
    sel.innerHTML = opts.join("");
  }

  function buildZones() {
    const sel = $("#zoneSelect");
    sel.innerHTML = (C.DELIVERY_ZONES || [])
      .map((z) => {
        const freeTxt = z.free ? ` · бесплатно от ${fmt(z.free)}` : "";
        return `<option value="${esc(z.id)}">${esc(z.name)} — ${fmt(z.fee)} сум${freeTxt}</option>`;
      })
      .join("");
    sel.onchange = renderCart;
  }

  // ── Переключатель доставка / самовывоз ──────────────────────────────────────
  function applyFulfillment() {
    const pickup = !isDelivery();
    $("#addressField").hidden = pickup;
    $("#zoneSelect").hidden = pickup;
    renderCart();
  }

  // ── Реордер / список заказов ────────────────────────────────────────────────
  const STATUS = {
    new: ["новый", "s-new"], pending: ["ожидает оплаты", "s-pend"],
    paid: ["оплачен", "s-paid"], failed: ["не оплачен", "s-fail"],
    invoice: ["по счёту", "s-inv"],
  };

  function orderCard(o, phone, withStatus) {
    const d = new Date(o.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const names = (o.items || []).map((i) => `${i.qty}×${i.name}`).join(", ");
    const st = STATUS[o.payment_status] || [o.payment_status, "s-new"];
    const el = document.createElement("div");
    el.className = "reorder-order";
    el.innerHTML = `
      <div style="min-width:0">
        <div class="ro-names">${esc(names)}</div>
        <div class="meta">${d} · ${fmt(o.total)} сум${
          withStatus ? ` · <span class="sbadge ${st[1]}">${esc(st[0])}</span>` : ""
        }</div>
      </div>
      <button class="btn">Повторить</button>`;
    el.querySelector("button").onclick = () => {
      cart.clear();
      for (const i of o.items) cart.set(i.name, { name: i.name, price: i.price, qty: i.qty });
      $('input[name="phone"]').value = phone;
      showView("shop");
      renderCart();
      openCart(true);
    };
    return el;
  }

  async function doReorder() {
    const phone = $("#reorderPhone").value.trim();
    const box = $("#reorderResult");
    if (!phone) { box.innerHTML = `<div class="empty">Введите телефон</div>`; return; }
    box.innerHTML = `<div class="empty">Ищем…</div>`;
    try {
      const { orders } = await callEdge("order", { action: "reorder", phone });
      if (!orders || !orders.length) { box.innerHTML = `<div class="empty">Заказов по этому номеру не найдено</div>`; return; }
      box.innerHTML = "";
      orders.slice(0, 3).forEach((o) => box.appendChild(orderCard(o, phone, false)));
    } catch (e) {
      box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }

  async function loadMyOrders() {
    const phone = $("#ordersPhone").value.trim();
    const box = $("#ordersList");
    if (!phone) { box.innerHTML = `<div class="empty">Введите телефон</div>`; return; }
    box.innerHTML = `<div class="empty">Загружаем…</div>`;
    try {
      const { orders } = await callEdge("order", { action: "reorder", phone, limit: 20 });
      if (!orders || !orders.length) { box.innerHTML = `<div class="empty">Заказов не найдено</div>`; return; }
      box.innerHTML = "";
      orders.forEach((o) => box.appendChild(orderCard(o, phone, true)));
    } catch (e) {
      box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }

  // ── Отправка заказа ────────────────────────────────────────────────────────
  async function submitOrder(e) {
    e.preventDefault();
    const msg = $("#formMsg");
    msg.className = "form-msg"; msg.textContent = "";
    if (!cart.size) return;

    const f = e.target;
    const pickup = !isDelivery();
    const items = [...cart.values()].map((i) => ({ name: i.name, qty: i.qty, price: i.price }));
    const zone = currentZone();
    const payload = {
      client_name: f.client_name.value.trim(),
      company: f.company.value.trim(),
      phone: f.phone.value.trim(),
      segment: f.segment.value,
      items,
      fulfillment: pickup ? "pickup" : "delivery",
      delivery_fee: pickup ? 0 : deliveryFee(),
      delivery_zone: pickup ? "" : (zone ? zone.name : ""),
      delivery_time: f.delivery_time.value,
      address: pickup ? "" : f.address.value.trim(),
      note: f.note.value.trim(),
      payment_method: f.payment_method.value,
    };
    if (!payload.client_name || !payload.phone) {
      msg.className = "form-msg err"; msg.textContent = "Заполните имя и телефон"; return;
    }

    $("#submitBtn").disabled = true;
    $("#submitBtn").textContent = "Отправляем…";
    try {
      const res = await callEdge("order", payload);
      saveContact(payload);
      if (res.payUrl) {
        msg.className = "form-msg ok"; msg.textContent = "Переходим к оплате…";
        window.location.href = res.payUrl;
        return;
      }
      cart.clear(); f.reset(); applyFulfillment(); openCart(false);
      showConfirmation(res.shortId, payload.payment_method);
    } catch (err) {
      msg.className = "form-msg err"; msg.textContent = err.message;
    } finally {
      $("#submitBtn").textContent = "Отправить заказ";
      renderCart();
    }
  }

  // ── Экраны статуса / подтверждения / возврата ───────────────────────────────
  function showConfirmation(shortId, method) {
    renderStatusCard({
      emoji: "✅",
      title: `Заказ #${shortId} принят`,
      sub: method === "invoice"
        ? "Менеджер свяжется с вами по счёту / перечислению."
        : "Менеджер свяжется с вами для подтверждения.",
    });
    showView("status");
  }

  async function showReturn(orderId) {
    showView("status");
    renderStatusCard({ emoji: "⏳", title: "Проверяем оплату…", sub: "", spinner: true });
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const s = await callEdge("order", { action: "status", orderId });
        if (s.payment_status === "paid")
          return renderStatusCard({ emoji: "🎉", title: "Оплачено!", sub: "Спасибо! Заказ передан на кухню.", meta: statusMeta(s) });
        if (s.payment_status === "failed")
          return renderStatusCard({ emoji: "⚠️", title: "Оплата не прошла", sub: "Попробуйте ещё раз или свяжитесь с админом.", meta: statusMeta(s) });
        if (tries < 15) {
          renderStatusCard({ emoji: "⏳", title: "Ожидаем подтверждение оплаты…", sub: "Это может занять несколько секунд.", spinner: true, meta: statusMeta(s) });
          setTimeout(poll, 2000);
        } else {
          renderStatusCard({ emoji: "🕓", title: "Оплата обрабатывается", sub: "Если деньги списаны, менеджер подтвердит заказ вручную.", meta: statusMeta(s) });
        }
      } catch (e) {
        renderStatusCard({ emoji: "⚠️", title: "Не удалось получить статус", sub: e.message });
      }
    };
    poll();
  }

  function statusMeta(s) {
    return [["Заказ", `#${s.shortId}`], ["Сумма", `${fmt(s.total)} сум`], ["Статус", (STATUS[s.payment_status] || [s.payment_status])[0]]];
  }
  function renderStatusCard({ emoji, title, sub, spinner, meta }) {
    const metaHtml = meta
      ? `<div class="status-meta">${meta.map(([k, v]) => `<div class="status-row"><span class="k">${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}</div>`
      : "";
    $("#statusCard").innerHTML = `
      <div class="status-emoji">${emoji}</div>
      <div class="status-title">${esc(title)}</div>
      ${sub ? `<div class="status-sub">${esc(sub)}</div>` : ""}
      ${spinner ? `<div class="spinner"></div>` : ""}
      ${metaHtml}`;
  }

  // ── Навигация ────────────────────────────────────────────────────────────────
  function showView(name) {
    $("#shopView").hidden = name !== "shop";
    $("#ordersView").hidden = name !== "orders";
    $("#statusView").hidden = name !== "status";
    if (name === "shop" && location.search) history.replaceState({}, "", location.pathname);
    if (name === "orders") loadMyOrders();
    renderCart();
    window.scrollTo(0, 0);
  }

  // ── Память контакта (localStorage) ─────────────────────────────────────────
  const CONTACT_KEY = "alibaba_contact";
  function loadContact() {
    let c;
    try { c = JSON.parse(localStorage.getItem(CONTACT_KEY) || "null"); } catch { c = null; }
    if (!c) return;
    const f = $("#checkoutForm");
    if (c.client_name) f.client_name.value = c.client_name;
    if (c.company) f.company.value = c.company;
    if (c.phone) { f.phone.value = c.phone; $("#reorderPhone").value = c.phone; $("#ordersPhone").value = c.phone; }
    if (c.address) f.address.value = c.address;
    if (c.segment) { const s = f.querySelector(`input[name="segment"][value="${c.segment}"]`); if (s) s.checked = true; }
    $("#myOrdersBtn").hidden = false;
  }
  function saveContact(p) {
    try {
      localStorage.setItem(CONTACT_KEY, JSON.stringify({
        client_name: p.client_name, company: p.company, phone: p.phone, address: p.address, segment: p.segment,
      }));
      if (p.phone) { $("#reorderPhone").value = p.phone; $("#ordersPhone").value = p.phone; }
      $("#myOrdersBtn").hidden = false;
    } catch { /* приватный режим */ }
  }

  // ── utils ───────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  // ── События ──────────────────────────────────────────────────────────────────
  $("#cartBtn").onclick = () => openCart(true);
  $("#cartBarBtn").onclick = () => openCart(true);
  $("#closeCart").onclick = () => openCart(false);
  $("#sheetBackdrop").onclick = () => openCart(false);
  $("#doorSelf").onclick = () => $("#menu").scrollIntoView({ behavior: "smooth" });
  $("#backToShop").onclick = () => showView("shop");
  $("#ordersBack").onclick = () => showView("shop");
  $("#myOrdersBtn").onclick = () => showView("orders");
  $("#ordersFindBtn").onclick = loadMyOrders;
  $("#reorderBtn").onclick = doReorder;
  $("#reorderPhone").addEventListener("keydown", (e) => { if (e.key === "Enter") doReorder(); });
  $("#ordersPhone").addEventListener("keydown", (e) => { if (e.key === "Enter") loadMyOrders(); });
  $("#menuSearch").addEventListener("input", (e) => { search = e.target.value; renderMenu(); });
  $("#checkoutForm").addEventListener("submit", submitOrder);
  $$('#checkoutForm input[name="fulfillment"]').forEach((r) => r.addEventListener("change", applyFulfillment));

  // ── Старт ────────────────────────────────────────────────────────────────────
  const orderId = new URLSearchParams(location.search).get("order");
  buildZones();
  buildTimeSlots();
  loadMenu();
  loadContact();
  applyFulfillment();
  renderCart();
  if (orderId) showReturn(orderId);
})();
