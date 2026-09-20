(import { useState, useEffect } from "react";
import "./App.css";
import { KIOSK_TRANSLATIONS } from "./i18n/translations";

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

const REMOTE_SITE_URL = process.env.REACT_APP_REMOTE_SITE_URL || "http://localhost:3000";

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateOrderNumber = () => Math.floor(100 + Math.random() * 900);
const CODE_TTL_MS = 10 * 60 * 1000;

const getQrImageUrl = (value) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(value)}`;

export default function App() {
  const [activeCategory, setActiveCategory] = useState("coffee");
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [orderNumber, setOrderNumber] = useState(null);

  const [kioskCode, setKioskCode] = useState(generateCode());
  const [codeCreatedAt, setCodeCreatedAt] = useState(Date.now());
  const [remainingSec, setRemainingSec] = useState(CODE_TTL_MS / 1000);

  // 기본값: 한국어 + 보통 글자 크기
  const [kioskLang, setKioskLang] = useState("ko");
  const [largeText, setLargeText] = useState(false);

  const t = KIOSK_TRANSLATIONS[kioskLang] || KIOSK_TRANSLATIONS.ko;

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - codeCreatedAt;
      const remaining = Math.max(0, Math.floor((CODE_TTL_MS - elapsed) / 1000));
      setRemainingSec(remaining);
      if (remaining <= 0) {
        setKioskCode(generateCode());
        setCodeCreatedAt(Date.now());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [codeCreatedAt]);

  // ── 나중에 서버(socket)에서 신호가 오면 이 두 함수만 호출하면 됨 ──
  // eslint-disable-next-line no-unused-vars
  const applyLanguage = (langId) => {
    if (KIOSK_TRANSLATIONS[langId]) setKioskLang(langId);
  };
  // eslint-disable-next-line no-unused-vars
  const applyLargeText = (isOn) => {
    setLargeText(isOn);
  };

  // useEffect(() => {
  //   socket.on("language-changed", ({ lang }) => applyLanguage(lang));
  //   socket.on("feature-toggled", ({ featureId, on }) => {
  //     if (featureId === "large-text") applyLargeText(on);
  //   });
  // }, []);

  const handleRegenerateCode = () => {
    setKioskCode(generateCode());
    setCodeCreatedAt(Date.now());
  };

  const filteredMenu = MENU.filter((item) => item.category === activeCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0)
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const clearCart = () => setCart([]);

  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const totalCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setPaymentStatus("processing");

    setTimeout(() => {
      setOrderNumber(generateOrderNumber());
      setPaymentStatus("done");

      setTimeout(() => {
        setCart([]);
        setPaymentStatus("idle");
        setOrderNumber(null);
        handleRegenerateCode();
      }, 3000);
    }, 1500);
  };

  const qrValue = `${REMOTE_SITE_URL}/${kioskCode}`;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`kiosk ${largeText ? "large" : ""}`}>
      <div className="kiosk-card wide">
        <h1>{t.kioskTitle}</h1>
        <p className="subtitle">{t.subtitle}</p>

        <div className="code-box">
          <div className="qr-wrap">
            <img src={getQrImageUrl(qrValue)} alt="QR" width={90} height={90} />
          </div>
          <div className="code-info">
            <p className="code-label">{t.codeLabel}</p>
            <p className="code-number">{kioskCode}</p>
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
                  onClick={() => setActiveCategory(cat)}
                >
                  {t.categories[cat]}
                </button>
              ))}
            </div>

            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <button key={item.id} className="menu-item" onClick={() => addToCart(item)}>
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-name">{t.menu[item.id]}</span>
                  <span className="menu-price">{item.price.toLocaleString()}원</span>
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
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-icon">{item.icon}</span>
                      <div>
                        <p className="cart-item-name">{t.menu[item.id]}</p>
                        <p className="cart-item-price">{item.price.toLocaleString()}원</p>
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <div className="qty-controls">
                        <button onClick={() => changeQty(item.id, -1)}>-</button>
                        <span>{item.qty}</span>
                        <button onClick={() => changeQty(item.id, 1)}>+</button>
                      </div>
                      <button className="remove-btn" onClick={() => removeItem(item.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="cart-footer">
              <div className="total-row">
                <span>{t.totalCountLabel(totalCount)}</span>
                <span className="total-price">{totalPrice.toLocaleString()}원</span>
              </div>
              <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>
                {t.checkoutBtn}
              </button>
            </div>
          </div>
        </div>
      </div>

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