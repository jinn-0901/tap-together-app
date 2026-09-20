import { useState, useEffect, useRef } from "react";
import "./App.css";
import { KIOSK_TRANSLATIONS } from "./i18n/translations";
import { io } from "socket.io-client";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";
const socket = io(SERVER_URL);

const CATEGORIES = ["coffee", "latte", "tea", "ade"];

const MENU = [
  { id: "americano", price: 3000, category: "coffee", icon: "☕" },
  { id: "cafe-latte", price: 3500, category: "latte", icon: "🥛" },
  { id: "strawberry-latte", price: 4500, category: "latte", icon: "🍓" },
  { id: "choco-latte", price: 4500, category: "latte", icon: "🍫" },
  { id: "green-tea", price: 3500, category: "tea", icon: "🍵" },
  { id: "yuja-tea", price: 4000, category: "tea", icon: "🍊" },
  { id: "iced-tea", price: 3500, category: "tea", icon: "🧊" },
  { id: "lemonade", price: 4000, category: "ade", icon: "🍋" },
];

const WHIP_AVAILABLE_IDS = ["cafe-latte", "strawberry-latte", "choco-latte"];
const ADDON_PRICE = { sizeLarge: 500, whip: 500, toppingPearl: 500 };

const REMOTE_SITE_URL = process.env.REACT_APP_REMOTE_SITE_URL || "http://localhost:3000";
const ORDER_COUNTER_KEY = "kiosk-order-counter";

const CODE_TTL_MS = 10 * 60 * 1000;

const getQrImageUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(value)}`;

const computeUnitPrice = (item, options) =>
  item.price +
  (options.size === "large" ? ADDON_PRICE.sizeLarge : 0) +
  (options.whip === "add" ? ADDON_PRICE.whip : 0) +
  (options.topping === "pearl" ? ADDON_PRICE.toppingPearl : 0);

const buildOptionSummary = (t, options) => {
  const parts = [];
  if (options.size === "large") parts.push(t.sizeLarge.replace(/\s*\(.*\)/, ""));
  if (options.whip === "add") parts.push(t.whipAdd.replace(/\s*\(.*\)/, ""));
  if (options.topping === "pearl") parts.push(t.toppingPearl.replace(/\s*\(.*\)/, ""));
  return parts.join(" · ");
};

const DEFAULT_OPTIONS = { size: "regular", whip: "none", topping: "none" };

const loadOrderCounter = () => {
  try {
    const saved = localStorage.getItem(ORDER_COUNTER_KEY);
    return saved ? parseInt(saved, 10) : 1;
  } catch (err) {
    return 1;
  }
};

const saveOrderCounter = (value) => {
  try {
    localStorage.setItem(ORDER_COUNTER_KEY, String(value));
  } catch (err) {
    // 조용히 무시
  }
};

const KIOSK_SPEECH_LANG_MAP = {
  ko: "ko-KR",
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  vi: "vi-VN",
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState("coffee");
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [orderNumber, setOrderNumber] = useState(null);

  const [kioskCode, setKioskCode] = useState(null);
  const [codeCreatedAt, setCodeCreatedAt] = useState(Date.now());
  const [remainingSec, setRemainingSec] = useState(CODE_TTL_MS / 1000);

  const [kioskLang, setKioskLang] = useState("ko");
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const [voiceGuideOn, setVoiceGuideOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const [optionsFor, setOptionsFor] = useState(null);
  const [draftOptions, setDraftOptions] = useState(DEFAULT_OPTIONS);

  const orderCounterRef = useRef(loadOrderCounter());
  const kioskCodeRef = useRef(null);
  const kioskLangRef = useRef("ko");
  const voiceGuideRef = useRef(true);
  const remoteConnectedRef = useRef(false);

  const t = KIOSK_TRANSLATIONS[kioskLang] || KIOSK_TRANSLATIONS.ko;

  useEffect(() => {
    kioskLangRef.current = kioskLang;
  }, [kioskLang]);

  useEffect(() => {
    voiceGuideRef.current = voiceGuideOn;
  }, [voiceGuideOn]);

  useEffect(() => {
    remoteConnectedRef.current = remoteConnected;
  }, [remoteConnected]);

  const applyLanguage = (langId) => {
    if (KIOSK_TRANSLATIONS[langId]) setKioskLang(langId);
  };
  const applyLargeText = (isOn) => setLargeText(isOn);
  const applyHighContrast = (isOn) => setHighContrast(isOn);

  const notify = (message) => {
    if (!voiceGuideRef.current) return;

    if (remoteConnectedRef.current) {
      socket.emit("kiosk-activity", {
        code: kioskCodeRef.current,
        message,
        langId: kioskLangRef.current,
      });
      return;
    }

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = KIOSK_SPEECH_LANG_MAP[kioskLangRef.current] || "ko-KR";
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const requestNewCode = () => {
    socket.emit("request-kiosk-code", kioskCodeRef.current);
  };

  useEffect(() => {
    const onCodeAssigned = ({ code }) => {
      kioskCodeRef.current = code;
      setKioskCode(code);
      setCodeCreatedAt(Date.now());
    };

    socket.on("kiosk-code-assigned", onCodeAssigned);
    requestNewCode();

    return () => {
      socket.off("kiosk-code-assigned", onCodeAssigned);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onRemoteJoined = () => setRemoteConnected(true);
    const onRemoteLeft = () => setRemoteConnected(false);
    const onKioskLeft = () => setRemoteConnected(false);

    const onLanguageChanged = ({ lang }) => applyLanguage(lang);
    const onFeatureToggled = ({ featureId, on }) => {
      if (featureId === "large-text") applyLargeText(on);
      if (featureId === "high-contrast") applyHighContrast(on);
      if (featureId === "voice-guide") setVoiceGuideOn(on);
    };

    socket.on("remote-joined", onRemoteJoined);
    socket.on("remote-left", onRemoteLeft);
    socket.on("kiosk-left", onKioskLeft);
    socket.on("language-changed", onLanguageChanged);
    socket.on("feature-toggled", onFeatureToggled);

    return () => {
      socket.off("remote-joined", onRemoteJoined);
      socket.off("remote-left", onRemoteLeft);
      socket.off("kiosk-left", onKioskLeft);
      socket.off("language-changed", onLanguageChanged);
      socket.off("feature-toggled", onFeatureToggled);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - codeCreatedAt;
      const remaining = Math.max(0, Math.floor((CODE_TTL_MS - elapsed) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0) {
        requestNewCode();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeCreatedAt]);

  const handleRegenerateCode = () => {
    requestNewCode();
  };

  const filteredMenu = MENU.filter((item) => item.category === activeCategory);

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    notify(t.categories[cat]);
  };

  const openOptions = (item) => {
    setOptionsFor(item);
    setDraftOptions(DEFAULT_OPTIONS);
  };

  const closeOptions = () => {
    setOptionsFor(null);
  };

  const confirmAddToCart = () => {
    if (!optionsFor) return;
    const item = optionsFor;
    const options = draftOptions;
    const cartId = `${item.id}|${options.size}|${options.whip}|${options.topping}`;
    const unitPrice = computeUnitPrice(item, options);

    setCart((prev) => {
      const existing = prev.find((c) => c.cartId === cartId);
      if (existing) {
        return prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { cartId, id: item.id, qty: 1, options, unitPrice }];
    });

    notify(`${t.menu[item.id]} ${t.addToCartBtn}`);
    closeOptions();
  };

  const changeQty = (cartId, delta) => {
    setCart((prev) =>
      prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0)
    );
  };

  const removeItem = (cartId) => {
    const removed = cart.find((c) => c.cartId === cartId);
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
    if (removed) notify(t.menu[removed.id]);
  };

  const clearCart = () => {
    setCart([]);
    notify(t.clearBtn);
  };

  const totalPrice = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
  const totalCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setPaymentStatus("choosing-dine-type");
    notify(t.dineTypeTitle);
  };

  const startPayment = () => {
    setPaymentStatus("processing");
    notify(t.processingLabel);

    setTimeout(() => {
      const num = orderCounterRef.current;
      orderCounterRef.current += 1;
      saveOrderCounter(orderCounterRef.current);
      setOrderNumber(num);
      setPaymentStatus("done");
      notify(`${t.doneLabel} ${t.orderNumberLabel(num)}`);

      setTimeout(() => {
        setCart([]);
        setPaymentStatus("idle");
        setOrderNumber(null);

        // 결제 끝나면 리모컨 연결 끊고, 키오스크 상태도 전부 기본값으로 리셋
        socket.emit("kiosk-reset", kioskCodeRef.current);
        setKioskLang("ko");
        setLargeText(false);
        setHighContrast(false);
        setVoiceGuideOn(true);
        setRemoteConnected(false);

        handleRegenerateCode();
      }, 3000);
    }, 1500);
  };

  const qrValue = kioskCode ? `${REMOTE_SITE_URL}/${kioskCode}` : "";

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isWhipAvailable = optionsFor ? WHIP_AVAILABLE_IDS.includes(optionsFor.id) : false;

  return (
    <div className={`kiosk ${largeText ? "large" : ""} ${highContrast ? "high-contrast" : ""}`}>
      <div className="kiosk-card wide">
        <h1>{t.kioskTitle}</h1>
        <p className="subtitle">{t.subtitle}</p>

        <div className="code-box">
          <div className="qr-wrap">
            {kioskCode ? (
              <img src={getQrImageUrl(qrValue)} alt="QR" width={90} height={90} />
            ) : (
              <div style={{ width: 90, height: 90 }} />
            )}
          </div>
          <div className="code-info">
            <p className="code-label">{t.codeLabel}</p>
            <p className="code-number">{kioskCode || "------"}</p>
            <p className={`code-timer ${remainingSec <= 30 ? "warning" : ""}`}>
              ⏱️ {formatTime(remainingSec)} {t.expireSuffix}
            </p>
            <button className="refresh-btn" onClick={handleRegenerateCode}>
              {t.refreshBtn}
            </button>
          </div>
        </div>

        <div className="layout">
          <div className="menu-section">
            <div className="tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`tab ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {t.categories[cat]}
                </button>
              ))}
            </div>

            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <button key={item.id} className="menu-item" onClick={() => openOptions(item)}>
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-name">{t.menu[item.id]}</span>
                  <span className="menu-price">{item.price.toLocaleString()}원~</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cart-panel">
            <div className="cart-header">
              <h2>{t.cartTitle} {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}</h2>
              {cart.length > 0 && (
                <button className="clear-btn" onClick={clearCart}>
                  {t.clearBtn}
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="cart-empty">{t.cartEmpty}</p>
            ) : (
              <div className="cart-list">
                {cart.map((c) => {
                  const summary = buildOptionSummary(t, c.options);
                  return (
                    <div key={c.cartId} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-icon">
                          {MENU.find((m) => m.id === c.id)?.icon}
                        </span>
                        <div>
                          <p className="cart-item-name">{t.menu[c.id]}</p>
                          {summary && <p className="cart-item-options">{summary}</p>}
                          <p className="cart-item-price">{c.unitPrice.toLocaleString()}원</p>
                        </div>
                      </div>
                      <div className="cart-item-actions">
                        <div className="qty-controls">
                          <button onClick={() => changeQty(c.cartId, -1)}>-</button>
                          <span>{c.qty}</span>
                          <button onClick={() => changeQty(c.cartId, 1)}>+</button>
                        </div>
                        <button className="remove-btn" onClick={() => removeItem(c.cartId)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cart-footer">
              <div className="total-row">
                <span>{t.totalCountLabel(totalCount)}</span>
                <span className="total-price">{totalPrice.toLocaleString()}원</span>
              </div>
              <button className="checkout-btn" onClick={handleCheckoutClick} disabled={cart.length === 0}>
                {t.checkoutBtn}
              </button>
            </div>
          </div>
        </div>
      </div>

      {optionsFor && (
        <div className="payment-overlay" onClick={closeOptions}>
          <div className="options-box" onClick={(e) => e.stopPropagation()}>
            <button className="options-close-btn" onClick={closeOptions} aria-label={t.closeBtn}>
              ✕
            </button>
            <div className="options-header">
              <span className="options-icon">{optionsFor.icon}</span>
              <h3>{t.menu[optionsFor.id]}</h3>
            </div>

            <div className="options-group">
              <p className="options-group-label">{t.sizeLabel}</p>
              <div className="options-choice-row">
                <button
                  className={`option-choice ${draftOptions.size === "regular" ? "selected" : ""}`}
                  onClick={() => {
                    setDraftOptions((prev) => ({ ...prev, size: "regular" }));
                    notify(t.sizeRegular);
                  }}
                >
                  {t.sizeRegular}
                </button>
                <button
                  className={`option-choice ${draftOptions.size === "large" ? "selected" : ""}`}
                  onClick={() => {
                    setDraftOptions((prev) => ({ ...prev, size: "large" }));
                    notify(t.sizeLarge.replace(/\s*\(.*\)/, ""));
                  }}
                >
                  {t.sizeLarge}
                </button>
              </div>
            </div>

            <div className="options-group">
              <p className="options-group-label">{t.toppingLabel}</p>
              <div className="options-choice-row">
                <button
                  className={`option-choice ${draftOptions.topping === "none" ? "selected" : ""}`}
                  onClick={() => {
                    setDraftOptions((prev) => ({ ...prev, topping: "none" }));
                    notify(t.toppingNone);
                  }}
                >
                  {t.toppingNone}
                </button>
                <button
                  className={`option-choice ${draftOptions.topping === "pearl" ? "selected" : ""}`}
                  onClick={() => {
                    setDraftOptions((prev) => ({ ...prev, topping: "pearl" }));
                    notify(t.toppingPearl.replace(/\s*\(.*\)/, ""));
                  }}
                >
                  {t.toppingPearl}
                </button>
              </div>
            </div>

            {isWhipAvailable && (
              <div className="options-group">
                <p className="options-group-label">{t.whipLabel}</p>
                <div className="options-choice-row">
                  <button
                    className={`option-choice ${draftOptions.whip === "none" ? "selected" : ""}`}
                    onClick={() => {
                      setDraftOptions((prev) => ({ ...prev, whip: "none" }));
                      notify(t.whipNone);
                    }}
                  >
                    {t.whipNone}
                  </button>
                  <button
                    className={`option-choice ${draftOptions.whip === "add" ? "selected" : ""}`}
                    onClick={() => {
                      setDraftOptions((prev) => ({ ...prev, whip: "add" }));
                      notify(t.whipAdd.replace(/\s*\(.*\)/, ""));
                    }}
                  >
                    {t.whipAdd}
                  </button>
                </div>
              </div>
            )}

            <div className="options-price-row">
              <span>{computeUnitPrice(optionsFor, draftOptions).toLocaleString()}원</span>
            </div>

            <button className="checkout-btn" onClick={confirmAddToCart}>
              {t.addToCartBtn}
            </button>
          </div>
        </div>
      )}

      {paymentStatus === "choosing-dine-type" && (
        <div className="payment-overlay">
          <div className="dine-type-box">
            <h3>{t.dineTypeTitle}</h3>
            <div className="dine-type-choices">
              <button
                className="dine-type-btn"
                onClick={() => {
                  notify(t.dineIn);
                  startPayment();
                }}
              >
                🍽️ {t.dineIn}
              </button>
              <button
                className="dine-type-btn"
                onClick={() => {
                  notify(t.takeout);
                  startPayment();
                }}
              >
                🥤 {t.takeout}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === "processing" && (
        <div className="payment-overlay">
          <div className="payment-box">
            <div className="spinner" />
            <p>{t.processingLabel}</p>
          </div>
        </div>
      )}

      {paymentStatus === "done" && (
        <div className="payment-overlay">
          <div className="payment-box success">
            <span className="check-icon">✅</span>
            <p className="success-title">{t.doneLabel}</p>
            <p className="order-number">{t.orderNumberLabel(orderNumber)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
