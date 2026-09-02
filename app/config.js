// Конфиг фронта прямого заказа. Anon-ключ ПУБЛИЧНЫЙ (read-only), безопасен в браузере.
// Запись заказов идёт только через Edge Function с service role — ключа записи здесь нет.
window.CONFIG = {
  EDGE_BASE: "https://jcudeucdlskrrpfkagps.supabase.co/functions/v1",
  ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdWRldWNkbHNrcnJwZmthZ3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjY3NDIsImV4cCI6MjA5ODMwMjc0Mn0.yLktr-1CYkJFARSg_f9IeqOshxQi9Nxc-BG0q6ShRBw",

  // Менеджер, принимающий заказы — контакт с публичной витрины/канала @alibaba_hf.
  MANAGER_TG: "alibaba_hfadmin",

  BRAND: {
    name: "Ali Baba",
    primary: "#c8102e",
    accent: "#f4a300",
  },

  // Реальный график работы кухни (проверено 30.08 в кабинете Uzum: Пн-Сб 11:00-20:00).
  HOURS: { open: "11:00", close: "20:00", slotMinutes: 30, leadMinutes: 40 },

  // Минимальная сумма заказа (сум) для доставки. TODO(CEO): подтвердить порог.
  MIN_ORDER: 50000,

  // Зоны доставки и стоимость (сум). TODO(CEO): подтвердить реальные тарифы курьеров.
  // free: порог бесплатной доставки для зоны (сум), 0 = всегда платно.
  DELIVERY_ZONES: [
    { id: "center", name: "Центр (Мирабад, Юнусабад)", fee: 15000, free: 200000 },
    { id: "mid", name: "Средний пояс (Чиланзар, Яшнабад)", fee: 25000, free: 250000 },
    { id: "far", name: "Дальние районы (Сергели, Бектемир)", fee: 40000, free: 350000 },
  ],
};
