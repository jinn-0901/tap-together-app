export const CATEGORIES = ["coffee", "latte", "tea", "ade"];

export const MENU = [
  { id: "americano", price: 3000, category: "coffee", icon: "☕" },
  { id: "cafe-latte", price: 3500, category: "latte", icon: "🥛" },
  { id: "strawberry-latte", price: 4500, category: "latte", icon: "🍓" },
  { id: "choco-latte", price: 4500, category: "latte", icon: "🍫" },
  { id: "green-tea", price: 3500, category: "tea", icon: "🍵" },
  { id: "yuja-tea", price: 4000, category: "tea", icon: "🍊" },
  { id: "iced-tea", price: 3500, category: "tea", icon: "🧊" },
  { id: "lemonade", price: 4000, category: "ade", icon: "🍋" },
];

export const WHIP_AVAILABLE_IDS = ["cafe-latte", "strawberry-latte", "choco-latte"];
export const FIXED_ICE_IDS = ["iced-tea", "lemonade"];

export const ADDON_PRICE = { sizeLarge: 500, whip: 500, toppingPearl: 500 };

export const DEFAULT_OPTIONS = { size: "regular", whip: "none", topping: "none", hotIce: "hot" };

export const getQrImageUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(value)}`;

// 쉬운 화면 모드에서 쓸 실제 메뉴 사진 URL (없으면 프론트에서 자동으로 이모지로 대체됨)
export const getMenuImageUrl = (serverUrl, itemId) => `${serverUrl}/menu-images/${itemId}.jpg`;

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
