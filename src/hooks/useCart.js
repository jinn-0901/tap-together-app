import { useState, useRef, useEffect } from "react";
import { computeUnitPrice } from "../data/menu";
import { socket } from "./useKioskConnection";

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

export function useCart({ t, notify, finishAndResetKiosk, kioskCodeRef }) {
  const [cart, setCart] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [orderNumber, setOrderNumber] = useState(null);

  const orderCounterRef = useRef(loadOrderCounter());
  const cartRef = useRef([]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // 장바구니가 바뀔 때마다 배열 전체를 리모컨(들)에게 전달
  useEffect(() => {
    if (!kioskCodeRef?.current) return;
    socket.emit("cart-state-updated", { code: kioskCodeRef.current, cart });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

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

  // 리모컨에서 온 수량조절/삭제/비우기 요청을 처리
  useEffect(() => {
    const onQtyRequested = ({ cartId, delta }) => changeQty(cartId, delta);
    const onRemoveRequested = ({ cartId }) => removeItem(cartId);
    const onClearRequested = () => clearCart();
    const onRequestCartStateForNewRemote = () => {
      if (!kioskCodeRef?.current) return;
      socket.emit("cart-state-updated", { code: kioskCodeRef.current, cart: cartRef.current });
    };

    socket.on("cart-change-qty-requested", onQtyRequested);
    socket.on("cart-remove-item-requested", onRemoveRequested);
    socket.on("cart-clear-requested", onClearRequested);
    socket.on("request-cart-state-for-new-remote", onRequestCartStateForNewRemote);

    return () => {
      socket.off("cart-change-qty-requested", onQtyRequested);
      socket.off("cart-remove-item-requested", onRemoveRequested);
      socket.off("cart-clear-requested", onClearRequested);
      socket.off("request-cart-state-for-new-remote", onRequestCartStateForNewRemote);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, t]);

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

  const completeRemotePayment = () => {
    if (cart.length === 0) return;

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
    completeRemotePayment,
  };
}
