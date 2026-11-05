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

// ============================================================
// 메뉴 이름 (화면·장바구니·음성 주문 인식에 모두 쓰임)
//  - 키(예: "americano")는 위 MENU의 id와 같아야 함. id는 바꾸지 말고 이름만 바꾸기
//  - 새 메뉴를 추가했다면 여기에도 같은 id로 이름을 추가하기 (없는 언어는 ko 이름이 대신 쓰임)
//  - 서버가 주는 기본 이름 위에 덮어쓰는 방식이라, 여기 적은 이름이 항상 우선함
//  - 앱(tap-together-app)과 웹(tap-together-web) 두 레포의 이 파일을 똑같이 고쳐야 함
// ============================================================
export const MENU_NAMES = {
  "americano": { ko: "아메리카노", en: "Americano", zh: "美式咖啡", ja: "アメリカーノ", vi: "Americano" },
  "cafe-latte": { ko: "카페라떼", en: "Cafe Latte", zh: "拿铁", ja: "カフェラテ", vi: "Cafe Latte" },
  "strawberry-latte": { ko: "딸기라떼", en: "Strawberry Latte", zh: "草莓拿铁", ja: "ストロベリーラテ", vi: "Latte Dâu" },
  "choco-latte": { ko: "초코라떼", en: "Choco Latte", zh: "巧克力拿铁", ja: "チョコラテ", vi: "Latte Socola" },
  "green-tea": { ko: "녹차", en: "Green Tea", zh: "绿茶", ja: "緑茶", vi: "Trà Xanh" },
  "yuja-tea": { ko: "유자차", en: "Yuja Tea", zh: "柚子茶", ja: "ゆず茶", vi: "Trà Yuja" },
  "iced-tea": { ko: "아이스티", en: "Iced Tea", zh: "冰茶", ja: "アイスティー", vi: "Trà Đá" },
  "lemonade": { ko: "레모네이드", en: "Lemonade", zh: "柠檬水", ja: "レモネード", vi: "Nước Chanh" },
};

// 서버에서 받은 번역(언어별 menu)에 위 MENU_NAMES를 덮어씀. 앱/웹이 번역을 받자마자 한 번 호출함
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
