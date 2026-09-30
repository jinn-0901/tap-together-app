import { useState, useRef, useEffect } from "react";
import { computeUnitPrice, format } from "../data/menu";
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
  const [pendingRemoteDineType, setPendingRemoteDineType] = useState(null);

  const orderCounterRef = useRef(loadOrderCounter());
  const cartRef = useRef([]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const broadcastCart = (nextCart) => {
    if (!kioskCodeRef?.current) return;
    socket.emit("cart-state-updated", { code: kioskCodeRef.current, cart: nextCart });
  };

  useEffect(() => {
    broadcastCart(cart);
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
    const existing = cart.find((c) => c.cartId === cartId);

    setCart((prev) =>
      prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0)
    );

    if (existing && t) {
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        notify(format(t.removedFromCartToast, { name: t.menu[existing.id] }));
      } else {
        notify(format(t.qtyChangedToast, { name: t.menu[existing.id], n: newQty }));
      }
    }
  };

  const removeItem = (cartId) => {
    const removed = cart.find((c) => c.cartId === cartId);
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
    if (removed && t) {
      notify(format(t.removedFromCartToast, { name: t.menu[removed.id] }));
    }
  };

  const clearCart = () => {
    setCart([]);
    notify(t.clearBtn);
  };

  useEffect(() => {
    const onQtyRequested = ({ cartId, delta }) => changeQty(cartId, delta);
    const onRemoveRequested = ({ cartId }) => removeItem(cartId);
    const onClearRequested = () => clearCart();
    const onRequestCartStateForNewRemote = () => {
      broadcastCart(cartRef.current);
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

  // 원격(가족)이 결제를 요청해도 바로 완료 처리하지 않음 — 최종 결제 확정은 반드시
  // 매장 키오스크 앞에서 사람이 직접 눌러 확인해야 하는 대기 상태로만 전환함
  // (원격/공유 참가자가 결제까지 마음대로 끝낼 수 있었던 이전 구조를 분리)
  const requestRemoteCheckout = (dineType) => {
    if (cart.length === 0) return;
    setPendingRemoteDineType(dineType);
    setPaymentStatus("confirm-remote");
    notify(t.remoteCheckoutConfirmPrompt);
  };

  const approveRemoteCheckout = () => {
    setPaymentStatus("processing");
    notify(t.processingLabel);

    setTimeout(() => {
      const num = orderCounterRef.current;
      orderCounterRef.current += 1;
      saveOrderCounter(orderCounterRef.current);
      setOrderNumber(num);
      setPaymentStatus("done");
      setPendingRemoteDineType(null);
      notify(`${t.doneLabel} ${t.orderNumberLabel.replace("{n}", num)}`);

      setTimeout(() => {
        setCart([]);
        setPaymentStatus("idle");
        setOrderNumber(null);
        finishAndResetKiosk();
      }, 3000);
    }, 1500);
  };

  const declineRemoteCheckout = () => {
    setPaymentStatus("idle");
    setPendingRemoteDineType(null);
    notify(t.remoteCheckoutDeclinedLocal);
    if (kioskCodeRef?.current) {
      socket.emit("remote-checkout-declined", kioskCodeRef.current);
    }
  };

  return {
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
  };
}
