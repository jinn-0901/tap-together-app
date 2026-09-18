import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

const CATEGORIES = [
  { id: "coffee", label: "☕ 커피" },
  { id: "latte", label: "🥛 라떼" },
  { id: "tea", label: "🍵 차" },
  { id: "ade", label: "🍹 에이드" },
];

const MENU = [
  { id: "americano", name: "아메리카노", price: 3000, category: "coffee", icon: "☕" },
  { id: "cafe-latte", name: "카페라떼", price: 3500, category: "latte", icon: "🥛" },
  { id: "strawberry-latte", name: "딸기라떼", price: 4500, category: "latte", icon: "🍓" },
  { id: "choco-latte", name: "초코라떼", price: 4500, category: "latte", icon: "🍫" },
  { id: "green-tea", name: "녹차", price: 3500, category: "tea", icon: "🍵" },
  { id: "yuja-tea", name: "유자차", price: 4000, category: "tea", icon: "🍊" },
  { id: "iced-tea", name: "아이스티", price: 3500, category: "tea", icon: "🧊" },
  { id: "lemonade", name: "레모네이드", price: 4000, category: "ade", icon: "🍋" },
];

// 원격 제어 웹사이트 주소 - 실제 실행 중인 포트로 맞춰주세요
const REMOTE_SITE_URL = "http://localhost:3000";

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateOrderNumber = () => Math.floor(100 + Math.random() * 900);
const CODE_TTL_MS = 10 * 60 * 1000; // 10분

export default function App() {
  const [activeCategory, setActiveCategory] = useState("coffee");
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle | processing | done
  const [orderNumber, setOrderNumber] = useState(null);

  const [kioskCode, setKioskCode] = useState(generateCode());
  const [codeCreatedAt, setCodeCreatedAt] = useState(Date.now());
  const [remainingSec, setRemainingSec] = useState(CODE_TTL_MS / 1000);

  // 1초마다 남은 시간 갱신, 0이 되면 코드 자동 재생성
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
      }, 3000);
    }, 1500);
  };

  // 경로 형식 QR 값 (예: http://localhost:3000/482913)
  const qrValue = `${REMOTE_SITE_URL}/${kioskCode}`;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="kiosk">
      <div className="kiosk-card wide">
        <h1>☕ 우리 카페 키오스크</h1>
        <p className="subtitle">메뉴를 선택해주세요</p>

        <div className="code-box">
          <div className="qr-wrap">
            <QRCodeSVG value={qrValue} size={90} bgColor="#ffffff" fgColor="#2d1b12" />
          </div>
          <div className="code-info">
            <p className="code-label">QR을 스캔해서 원격 제어 연결</p>
            <p className="code-number">{kioskCode}</p>
            <p className={`code-timer ${remainingSec <= 30 ? "warning" : ""}`}>
              ⏱️ {formatTime(remainingSec)} 후 만료
            </p>
            <button className="refresh-btn" onClick={handleRegenerateCode}>
              🔄 코드 새로고침
            </button>
          </div>
        </div>

        <div className="layout">
          <div className="menu-section">
            <div className="tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`tab ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <button key={item.id} className="menu-item" onClick={() => addToCart(item)}>
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-name">{item.name}</span>
                  <span className="menu-price">{item.price.toLocaleString()}원</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cart-panel">
            <div className="cart-header">
              <h2>주문 내역 {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}</h2>
              {cart.length > 0 && (
                <button className="clear-btn" onClick={clearCart}>
                  전체 비우기
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="cart-empty">메뉴를 선택해주세요</p>
            ) : (
              <div className="cart-list">
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-icon">{item.icon}</span>
                      <div>
                        <p className="cart-item-name">{item.name}</p>
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
                <span>총 {totalCount}개</span>
                <span className="total-price">{totalPrice.toLocaleString()}원</span>
              </div>
              <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0}>
                결제하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {paymentStatus === "processing" && (
        <div className="payment-overlay">
          <div className="payment-box">
            <div className="spinner" />
            <p>결제 처리 중...</p>
          </div>
        </div>
      )}

      {paymentStatus === "done" && (
        <div className="payment-overlay">
          <div className="payment-box success">
            <span className="check-icon">✅</span>
            <p className="success-title">결제 완료!</p>
            <p className="order-number">주문번호 {orderNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
}