
export const CATEGORIES = ["coffee", "latte", "tea", "ade"];

// ============================================================
// 메뉴판
// ============================================================
export const MENU = [
  {
    id: "americano",
    category: "coffee",
    price: 3000,
    icon: "☕",
    photo: "americano.jpg",
    names: { ko: "연어초밥", en: "Salmon Sushi", zh: "三文鱼寿司", ja: "サーモン寿司", vi: "Sushi Cá Hồi" },
    whip: false,
    iceOnly: false,
  },
  {
    id: "cafe-latte",
    category: "latte",
    price: 3500,
    icon: "🥛",
    photo: "cafe-latte.jpg",
    names: { ko: "광어초밥", en: "Halibut Sushi", zh: "比目鱼寿司", ja: "ヒラメ寿司", vi: "Sushi Cá Bơn" },
    whip: true,
    iceOnly: false,
  },
  {
    id: "strawberry-latte",
    category: "latte",
    price: 4500,
    icon: "🍓",
    photo: "strawberry-latte.jpg",
    names: { ko: "참치초밥", en: "Tuna Sushi", zh: "金枪鱼寿司", ja: "マグロ寿司", vi: "Sushi Cá Ngừ" },
    whip: true,
    iceOnly: false,
  },
  {
    id: "choco-latte",
    category: "latte",
    price: 4500,
    icon: "🍫",
    photo: "choco-latte.jpg",
    names: { ko: "새우초밥", en: "Shrimp Sushi", zh: "虾寿司", ja: "エビ寿司", vi: "Sushi Tôm" },
    whip: true,
    iceOnly: false,
  },
  {
    id: "green-tea",
    category: "tea",
    price: 3500,
    icon: "🍵",
    photo: "green-tea.jpg",
    names: { ko: "계란초밥", en: "Egg Sushi", zh: "玉子寿司", ja: "玉子寿司", vi: "Sushi Trứng" },
    whip: false,
    iceOnly: false,
  },
  {
    id: "yuja-tea",
    category: "tea",
    price: 4000,
    icon: "🍊",
    photo: "yuja-tea.jpg",
    names: { ko: "유부초밥", en: "Inari Sushi", zh: "豆皮寿司", ja: "いなり寿司", vi: "Sushi Đậu Phụ" },
    whip: false,
    iceOnly: false,
  },
  {
    id: "iced-tea",
    category: "tea",
    price: 3500,
    icon: "🧊",
    photo: "iced-tea.jpg",
    names: { ko: "모둠초밥", en: "Assorted Sushi", zh: "什锦寿司", ja: "盛り合わせ寿司", vi: "Sushi Thập Cẩm" },
    whip: false,
    iceOnly: true,
  },
  {
    id: "lemonade",
    category: "ade",
    price: 4000,
    icon: "🍋",
    photo: "lemonade.jpg",
    names: { ko: "장어초밥", en: "Eel Sushi", zh: "鳗鱼寿司", ja: "うなぎ寿司", vi: "Sushi Lươn" },
    whip: false,
    iceOnly: true,
  },
];

// 아래부터는 위 메뉴판에서 자동으로 만들어져요.
export const MENU_NAMES = Object.fromEntries(MENU.map((item) => [item.id, item.names]));
export const WHIP_AVAILABLE_IDS = MENU.filter((item) => item.whip).map((item) => item.id);
export const FIXED_ICE_IDS = MENU.filter((item) => item.iceOnly).map((item) => item.id);

export const applyMenuNames = (translations) => {
  if (!translations) return translations;
  const result = {};
  Object.keys(translations).forEach((lang) => {
    const menu = { ...(translations[lang].menu || {}) };
    Object.keys(MENU_NAMES).forEach((id) => {
      const name = MENU_NAMES[id][lang] || MENU_NAMES[id].ko;
      if (name) menu[id] = name;
    });
    result[lang] = { ...translations[lang], menu };
  });
  return result;
};

export const ADDON_PRICE = { sizeLarge: 500, whip: 500, toppingPearl: 500 };

export const DEFAULT_OPTIONS = { size: "regular", whip: "none", topping: "none", hotIce: "hot" };

export const getQrImageUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(value)}`;

export const getMenuImageUrl = (item) =>
  `${process.env.PUBLIC_URL || ""}/menu-images/${item.photo || `${item.id}.jpg`}`;

export const computeUnitPrice = (item, options) =>
  item.price +
  (options.size === "large" ? ADDON_PRICE.sizeLarge : 0) +
  (options.whip === "add" ? ADDON_PRICE.whip : 0) +
  (options.topping === "pearl" ? ADDON_PRICE.toppingPearl : 0);

export const buildOptionSummary = (t, options, item) => {
  const parts = [];
  if (!FIXED_ICE_IDS.includes(item.id)) {
    parts.push(options.hotIce === "hot" ? t.hotOption : t.iceOption);
  }
  if (options.size === "large") parts.push(t.sizeLarge.replace(/\s*\(.*\)/, ""));
  if (options.whip === "add") parts.push(t.whipAdd.replace(/\s*\(.*\)/, ""));
  if (options.topping === "pearl") parts.push(t.toppingPearl.replace(/\s*\(.*\)/, ""));
  return parts.join(" · ");
};

export const format = (template, vars) =>
  (template || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
