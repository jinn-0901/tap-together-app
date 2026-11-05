export const CATEGORIES = ["coffee", "latte", "tea", "ade"];

// ============================================================
// 메뉴판
//  - 메뉴 하나가 { } 한 덩어리예요. 이름, 가격, 이모지, 사진, 옵션이 전부 이 안에 있어요.
//  - 메뉴를 바꾸려면 덩어리 안의 값만 고치세요. 따옴표(")와 쉼표(,)는 지우지 마세요.
//  - 새 메뉴를 만들려면 덩어리 하나를 통째로 복사해서 아래에 붙이고, id를 새 영어 이름으로 바꾸세요.
//  - 이 파일은 키오스크(tap-together-app)와 리모컨(tap-together-web) 두 곳에 똑같이 있어요.
//    한쪽만 고치면 화면이 서로 달라요. 두 곳을 똑같이 고치세요.
// ============================================================
export const MENU = [
  {
    id: "americano",   // 메뉴 이름표(영어). 겹치면 안 돼요. 이미 있는 메뉴는 바꾸지 마세요
    category: "coffee",   // coffee(커피) latte(라떼) tea(차) ade(에이드) 중 하나
    price: 3000,   // 가격(원). 숫자만 쓰세요
    icon: "☕",   // 이모지 하나
    photo: "americano.jpg",   // 사진 파일 이름. public 폴더의 menu-images 폴더에 이 이름으로 올리세요
    names: { ko: "아메리카노", en: "Americano", zh: "美式咖啡", ja: "アメリカーノ", vi: "Americano" },   // 메뉴 이름 (5개 나라 말)
    whip: false,   // true면 휘핑크림을 고를 수 있어요
    iceOnly: false,   // true면 차가운 것만 있어요 (따뜻한 것 선택 없음)
  },
  {
    id: "cafe-latte",
    category: "latte",
    price: 3500,
    icon: "🥛",
    photo: "cafe-latte.jpg",
    names: { ko: "카페라떼", en: "Cafe Latte", zh: "拿铁", ja: "カフェラテ", vi: "Cafe Latte" },
    whip: true,
    iceOnly: false,
  },
  {
    id: "strawberry-latte",
    category: "latte",
    price: 4500,
    icon: "🍓",
    photo: "strawberry-latte.jpg",
    names: { ko: "딸기라떼", en: "Strawberry Latte", zh: "草莓拿铁", ja: "ストロベリーラテ", vi: "Latte Dâu" },
    whip: true,
    iceOnly: false,
  },
  {
    id: "choco-latte",
    category: "latte",
    price: 4500,
    icon: "🍫",
    photo: "choco-latte.jpg",
    names: { ko: "초코라떼", en: "Choco Latte", zh: "巧克力拿铁", ja: "チョコラテ", vi: "Latte Socola" },
    whip: true,
    iceOnly: false,
  },
  {
    id: "green-tea",
    category: "tea",
    price: 3500,
    icon: "🍵",
    photo: "green-tea.jpg",
    names: { ko: "녹차", en: "Green Tea", zh: "绿茶", ja: "緑茶", vi: "Trà Xanh" },
    whip: false,
    iceOnly: false,
  },
  {
    id: "yuja-tea",
    category: "tea",
    price: 4000,
    icon: "🍊",
    photo: "yuja-tea.jpg",
    names: { ko: "유자차", en: "Yuja Tea", zh: "柚子茶", ja: "ゆず茶", vi: "Trà Yuja" },
    whip: false,
    iceOnly: false,
  },
  {
    id: "iced-tea",
    category: "tea",
    price: 3500,
    icon: "🧊",
    photo: "iced-tea.jpg",
    names: { ko: "아이스티", en: "Iced Tea", zh: "冰茶", ja: "アイスティー", vi: "Trà Đá" },
    whip: false,
    iceOnly: true,
  },
  {
    id: "lemonade",
    category: "ade",
    price: 4000,
    icon: "🍋",
    photo: "lemonade.jpg",
    names: { ko: "레모네이드", en: "Lemonade", zh: "柠檬水", ja: "レモネード", vi: "Nước Chanh" },
    whip: false,
    iceOnly: true,
  },
];

// 아래부터는 위 메뉴판에서 자동으로 만들어져요. 고치지 않아도 돼요.
export const MENU_NAMES = Object.fromEntries(MENU.map((item) => [item.id, item.names]));
export const WHIP_AVAILABLE_IDS = MENU.filter((item) => item.whip).map((item) => item.id);
export const FIXED_ICE_IDS = MENU.filter((item) => item.iceOnly).map((item) => item.id);

// 서버가 준 번역 위에 위 메뉴 이름을 덮어써요. 번역을 받자마자 한 번 불러요.
// (없는 나라 말은 한국어 이름이 대신 나와요)
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

// 쉬운 화면 모드에서 보여줄 사진 주소. 사진 파일은 이 사이트의 public/menu-images 폴더에 있어요.
// 사진이 없으면 화면에서 자동으로 이모지가 대신 나와요.
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
