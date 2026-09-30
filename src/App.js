import { useState, useEffect } from "react";
import "./App.css";
import { CATEGORIES, MENU, WHIP_AVAILABLE_IDS, FIXED_ICE_IDS, DEFAULT_OPTIONS, getQrImageUrl, getMenuImageUrl, computeUnitPrice, buildOptionSummary, format } from "./data/menu";
import { useKioskConnection, socket, SERVER_URL } from "./hooks/useKioskConnection";
import { useCart } from "./hooks/useCart";

const REMOTE_SITE_URL = process.env.REACT_APP_REMOTE_SITE_URL || "http://localhost:3000";
const FALLBACK_LOADING_TEXT = "Loading...";

export default function App() {
  const {
    t,
    largeText,
    highContrast,
    easyMode,
    kioskCode,
    kioskCodeRef,
    remainingSec,
    liveMessage,
    notify,
    handleRegenerateCode,
    finishAndResetKiosk,
  } = useKioskConnection();

  const {
    cart,
    paymentStatus,
    orderNumber,
    pendingRemoteDineType,
    addItemToCart,
    changeQty,
    removeItem,
    clearCart,
    totalPrice,
    totalCount,
    handleCheckoutClick,
    startPayment,
    requestRemoteCheckout,
    approveRemoteCheckout,
    declineRemoteCheckout,
  } = useCart({ t, notify, finishAndResetKiosk, kioskCodeRef });

  const [activeCategory, setActiveCategory] = useState("coffee");
  const [optionsFor, setOptionsFor] = useState(null);
  const [draftOptions, setDraftOptions] = useState(DEFAULT_OPTIONS);

  useEffect(() => {
    const onVoiceOrderReceived = ({ itemId, options, wantsToBuy }) => {
      const item = MENU.find((m) => m.id === itemId);
      if (!item || !t) return;

      // options가 없거나 이상한 값으로 오는 경우(위조/구버전 클라이언트 등)에도
      // computeUnitPrice에서 options.size 등을 읽다가 죽지 않도록 항상 객체로 보정
      const safeOptions = options && typeof options === "object" ? options : {};
      const finalOptions = FIXED_ICE_IDS.includes(item.id) ? { ...safeOptions, hotIce: "hot" } : { ...DEFAULT_OPTIONS, ...safeOptions };
      setActiveCategory(item.category);

      if (wantsToBuy) {
        addItemToCart(item, finalOptions);
      } else {
        setOptionsFor(item);
        setDraftOptions(finalOptions);
        notify(t.menu[item.id]);
      }
    };

    socket.on("voice-order-received", onVoiceOrderReceived);
    return () => socket.off("voice-order-received", onVoiceOrderReceived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    const onCheckoutRequested = ({ dineType }) => {
      requestRemoteCheckout(dineType);
    };
    socket.on("checkout-requested-by-remote", onCheckoutRequested);
    return () => socket.off("checkout-requested-by-remote", onCheckoutRequested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const filteredMenu = MENU.filter((item) => item.category === activeCategory);

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    notify(t.categories[cat]);
  };

  const openOptions = (item) => {
    setOptionsFor(item);
    setDraftOptions(DEFAULT_OPTIONS);
    notify(t.menu[item.id]);
  };

  const closeOptions = () => setOptionsFor(null);

  // 옵션 창이 열려있을 때 Esc로도 닫을 수 있게 (키보드/스크린리더 사용자를 위한 표준 동작)
  useEffect(() => {
    if (!optionsFor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeOptions();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [optionsFor]);

  const confirmAddToCart = () => {
    if (!optionsFor) return;
    addItemToCart(optionsFor, draftOptions);
    closeOptions();
  };

  const qrValue = kioskCode ? `${REMOTE_SITE_URL}/${kioskCode}` : "";

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!t) {
    return (
      <div className="kiosk">
        <div className="kiosk-card">
          <p className="subtitle">{FALLBACK_LOADING_TEXT}</p>
        </div>
      </div>
    );
  }

  const isWhipAvailable = optionsFor ? WHIP_AVAILABLE_IDS.includes(optionsFor.id) : false;
  const isHotIceAvailable = optionsFor ? !FIXED_ICE_IDS.includes(optionsFor.id) : false;

  return (
    <div className={`kiosk ${largeText ? "large" : ""} ${highContrast ? "high-contrast" : ""}`}>
      <div className="kiosk-card wide">
        <h1>{t.kioskTitle}</h1>
        <p className="subtitle">{t.subtitle}</p>

        <div className="code-box">
          <div className="qr-wrap">
            {kioskCode ? (
              <img src={getQrImageUrl(qrValue)} alt={t.codeLabel} width={90} height={90} />
            ) : (
              <div style={{ width: 90, height: 90 }} />
            )}
          </div>
          <div className="code-info">
            <p className="code-label">{t.codeLabel}</p>
            <p className="code-number">{kioskCode || "------"}</p>
            <p className={`code-timer ${remainingSec <= 30 ? "warning" : ""}`}>
              <span aria-hidden="true">⏱️</span> {formatTime(remainingSec)} {t.expireSuffix}
            </p>
            <button className="refresh-btn" onClick={handleRegenerateCode}>{t.refreshBtn}</button>
          </div>
        </div>

        <div className="layout">
          <div className="menu-section">
            <div className="tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`tab ${activeCategory === cat ? "active" : ""}`}
                  aria-pressed={activeCategory === cat}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {t.categories[cat]}
                </button>
              ))}
            </div>

            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <button key={item.id} className={`menu-item ${easyMode ? "easy" : ""}`} onClick={() => openOptions(item)}>
                  {easyMode ? (
                    <span className="menu-photo-wrap">
                      <img
                        className="menu-photo"
                        src={getMenuImageUrl(SERVER_URL, item.id)}
                        alt={t.menu[item.id]}
                        onError={(e) => {
                          e.target.parentElement.style.display = "none";
                          e.target.parentElement.nextSibling.style.display = "block";
                        }}
                      />
                    </span>
                  ) : null}
                  <span className="menu-icon" style={easyMode ? { display: "none" } : undefined}>
                    {item.icon}
                  </span>
                  <span className="menu-name">{t.menu[item.id]}</span>
                  <span className="menu-price">{item.price.toLocaleString()}원~</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cart-panel">
            <div className="cart-header">
              <h2>{t.cartTitle} {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}</h2>
              {cart.length > 0 && <button className="clear-btn" onClick={clearCart}>{t.clearBtn}</button>}
            </div>

            {cart.length === 0 ? (
              <p className="cart-empty">{t.cartEmpty}</p>
            ) : (
              <div className="cart-list">
                {cart.map((c) => {
                  const menuItem = MENU.find((m) => m.id === c.id);
                  const summary = buildOptionSummary(t, c.options, menuItem);
                  return (
                    <div key={c.cartId} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-icon">{menuItem?.icon}</span>
                        <div>
                          <p className="cart-item-name">{t.menu[c.id]}</p>
                          {summary && <p className="cart-item-options">{summary}</p>}
                          <p className="cart-item-price">{c.unitPrice.toLocaleString()}원</p>
                        </div>
                      </div>
                      <div className="cart-item-actions">
                        <div className="qty-controls">
                          <button aria-label={t.qtyDecreaseLabel} onClick={() => changeQty(c.cartId, -1)}>-</button>
                          <span>{c.qty}</span>
                          <button aria-label={t.qtyIncreaseLabel} onClick={() => changeQty(c.cartId, 1)}>+</button>
                        </div>
                        <button className="remove-btn" aria-label={t.removeItemLabel} onClick={() => removeItem(c.cartId)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="cart-footer">
              <div className="total-row">
                <span>{format(t.totalCountLabel, { n: totalCount })}</span>
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
          <div
            className="options-box"
            role="dialog"
            aria-modal="true"
            aria-label={t.menu[optionsFor.id]}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="options-close-btn" onClick={closeOptions} aria-label={t.closeBtn}>✕</button>
            <div className="options-header">
              <span className="options-icon">{optionsFor.icon}</span>
              <h3>{t.menu[optionsFor.id]}</h3>
            </div>

            {isHotIceAvailable && (
              <div className="options-group">
                <p className="options-group-label">{t.hotIceLabel}</p>
                <div className="options-choice-row">
                  <button
                    className={`option-choice ${draftOptions.hotIce === "hot" ? "selected" : ""}`}
                    onClick={() => { setDraftOptions((prev) => ({ ...prev, hotIce: "hot" })); notify(t.hotOption); }}
                  >
                    {t.hotOption}
                  </button>
                  <button
                    className={`option-choice ${draftOptions.hotIce === "ice" ? "selected" : ""}`}
                    onClick={() => { setDraftOptions((prev) => ({ ...prev, hotIce: "ice" })); notify(t.iceOption); }}
                  >
                    {t.iceOption}
                  </button>
                </div>
              </div>
            )}

            <div className="options-group">
              <p className="options-group-label">{t.sizeLabel}</p>
              <div className="options-choice-row">
                <button
                  className={`option-choice ${draftOptions.size === "regular" ? "selected" : ""}`}
                  onClick={() => { setDraftOptions((prev) => ({ ...prev, size: "regular" })); notify(t.sizeRegular); }}
                >
                  {t.sizeRegular}
                </button>
                <button
                  className={`option-choice ${draftOptions.size === "large" ? "selected" : ""}`}
                  onClick={() => { setDraftOptions((prev) => ({ ...prev, size: "large" })); notify(t.sizeLarge.replace(/\s*\(.*\)/, "")); }}
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
                  onClick={() => { setDraftOptions((prev) => ({ ...prev, topping: "none" })); notify(t.toppingNone); }}
                >
                  {t.toppingNone}
                </button>
                <button
                  className={`option-choice ${draftOptions.topping === "pearl" ? "selected" : ""}`}
                  onClick={() => { setDraftOptions((prev) => ({ ...prev, topping: "pearl" })); notify(t.toppingPearl.replace(/\s*\(.*\)/, "")); }}
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
                    onClick={() => { setDraftOptions((prev) => ({ ...prev, whip: "none" })); notify(t.whipNone); }}
                  >
                    {t.whipNone}
                  </button>
                  <button
                    className={`option-choice ${draftOptions.whip === "add" ? "selected" : ""}`}
                    onClick={() => { setDraftOptions((prev) => ({ ...prev, whip: "add" })); notify(t.whipAdd.replace(/\s*\(.*\)/, "")); }}
                  >
                    {t.whipAdd}
                  </button>
                </div>
              </div>
            )}

            <div className="options-price-row">
              <span>{computeUnitPrice(optionsFor, draftOptions).toLocaleString()}원</span>
            </div>

            <button className="checkout-btn" onClick={confirmAddToCart}>{t.addToCartBtn}</button>
          </div>
        </div>
      )}

      {paymentStatus === "choosing-dine-type" && (
        <div className="payment-overlay">
          <div className="dine-type-box" role="dialog" aria-modal="true" aria-label={t.dineTypeTitle}>
            <h3>{t.dineTypeTitle}</h3>
            <div className="dine-type-choices">
              <button className="dine-type-btn" onClick={() => { notify(t.dineIn); startPayment(); }}>🍽️ {t.dineIn}</button>
              <button className="dine-type-btn" onClick={() => { notify(t.takeout); startPayment(); }}>🥤 {t.takeout}</button>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === "confirm-remote" && (
        <div className="payment-overlay">
          <div
            className="dine-type-box"
            role="dialog"
            aria-modal="true"
            aria-label={t.remoteCheckoutConfirmTitle}
          >
            <h3>{t.remoteCheckoutConfirmTitle}</h3>
            <p>{t.remoteCheckoutConfirmDesc}</p>
            {pendingRemoteDineType && (
              <p className="subtitle">
                {pendingRemoteDineType === "dine-in" ? `🍽️ ${t.dineIn}` : `🥤 ${t.takeout}`}
              </p>
            )}
            <div className="dine-type-choices">
              <button className="checkout-btn" onClick={approveRemoteCheckout}>{t.confirmBtn}</button>
              <button className="refresh-btn" onClick={declineRemoteCheckout}>{t.cancelBtn}</button>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === "processing" && (
        <div className="payment-overlay">
          <div className="payment-box" role="alert" aria-live="assertive">
            <div className="spinner" aria-hidden="true" />
            <p>{t.processingLabel}</p>
          </div>
        </div>
      )}

      {paymentStatus === "done" && (
        <div className="payment-overlay">
          <div className="payment-box success" role="alert" aria-live="assertive">
            <span className="check-icon" aria-hidden="true">✅</span>
            <p className="success-title">{t.doneLabel}</p>
            <p className="order-number">{format(t.orderNumberLabel, { n: orderNumber })}</p>
          </div>
        </div>
      )}

      {/* 화면엔 안 보이지만 스크린리더에게 방금 일어난 일(메뉴 선택, 옵션 변경 등)을 알려줌 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>
    </div>
  );
}
