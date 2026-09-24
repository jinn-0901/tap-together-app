import { useState, useRef, useEffect } from "react";
import { computeUnitPrice } from "../data/menu";

const ORDER_COUNTER_KEY = "kiosk-order-counter";

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

export function useCart({ t, notify, finishAndResetKiosk, broadcastCartSummary }) {
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [orderNumber, setOrderNumber] = useState(null);

  const orderCounterRef = useRef(loadOrderCounter());

  // 장바구니가 바뀔 때마다 리모컨에게 요약을 보내줌
  useEffect(() => {
    if (!broadcastCartSummary || !t) return;
    if (cart.length === 0) {
      broadcastCartSummary("");
      return;
    }
    const summary = cart
      .map((c) => `${t.menu?.[c.id] || c.id} x${c.qty}`)
      .join(", ");
    const total = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
    broadcastCartSummary(`${summary} · ${total.toLocaleString()}원`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, t]);

  const addItemToCart = (item, options) => {
    const cartId = `${item.id}|${options.size}|${options.whip}|${options.topping}|${options.hotIce}`;
    const unitPrice = computeUnitPrice(item, options);

    setCart((prev) => {
      const existing = prev.find((c) => c.cartId === cartId);
      if (existing) return prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { cartId, id: item.id, qty: 1, options, unitPrice }];
    });

    notify(`${t.menu[item.id]} ${t.addToCartBtn}`);
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
      notify(`${t.doneLabel} ${t.orderNumberLabel.replace("{n}", num)}`);

      setTimeout(() => {
        setCart([]);
        setPaymentStatus("idle");
        setOrderNumber(null);
        finishAndResetKiosk();
      }, 3000);
    }, 1500);
  };

  return {
    cart,
    paymentStatus,
    orderNumber,
    addItemToCart,
    changeQty,
    removeItem,
    clearCart,
    totalPrice,
    totalCount,
    handleCheckoutClick,
    startPayment,
  };
}
