"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { getProductById } from "@/lib/products";
import {
  CART_STORAGE_KEY,
  CartContext,
  INITIAL_CART_STATE,
  cartReducer,
  type AddItemOptions,
  type CartItem,
} from "./store";

interface PersistedItem {
  productId: string;
  quantity: number;
  recurring?: boolean;
}

function safeReadStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedItem[];
    if (!Array.isArray(parsed)) return [];
    const items: CartItem[] = [];
    for (const p of parsed) {
      const product = getProductById(p.productId);
      if (!product) continue;
      const quantity = Math.max(1, Math.floor(p.quantity || 1));
      items.push({ product, quantity, recurring: Boolean(p.recurring) });
    }
    return items;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_CART_STATE);
  const [isOpen, setIsOpen] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const items = safeReadStorage();
    dispatch({ type: "hydrate", items });
  }, []);

  useEffect(() => {
    if (!state.hydrated || typeof window === "undefined") return;
    const serializable: PersistedItem[] = state.items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      recurring: i.recurring,
    }));
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(serializable),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [state.items, state.hydrated]);

  const addItem = useCallback(
    (productId: string, opts?: AddItemOptions | number) => {
      const product = getProductById(productId);
      if (!product) return;
      const normalized: AddItemOptions =
        typeof opts === "number" ? { quantity: opts } : opts ?? {};
      dispatch({
        type: "add",
        product,
        quantity: normalized.quantity ?? 1,
        recurring: normalized.recurring,
      });
    },
    [],
  );

  const addItems = useCallback(
    (productIds: string[], opts?: AddItemOptions) => {
      const quantity = opts?.quantity ?? 1;
      for (const id of productIds) {
        const product = getProductById(id);
        if (!product) continue;
        dispatch({
          type: "add",
          product,
          quantity,
          recurring: opts?.recurring,
        });
      }
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "remove", productId });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      dispatch({ type: "update", productId, quantity });
    },
    [],
  );

  const setRecurring = useCallback(
    (productId: string, recurring: boolean) => {
      dispatch({ type: "set-recurring", productId, recurring });
    },
    [],
  );

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { totalBRL, totalRecurringBRL, count, recurringCount } = useMemo(() => {
    let total = 0;
    let recurringTotal = 0;
    let count = 0;
    let recurringCount = 0;
    for (const item of state.items) {
      const lineTotal = item.product.priceBRL * item.quantity;
      total += lineTotal;
      count += item.quantity;
      if (item.recurring && item.product.recurrence) {
        const discount = item.product.recurrence.subscriptionDiscountPct / 100;
        recurringTotal += lineTotal * (1 - discount);
        recurringCount += item.quantity;
      } else {
        recurringTotal += lineTotal;
      }
    }
    return {
      totalBRL: total,
      totalRecurringBRL: Math.round(recurringTotal),
      count,
      recurringCount,
    };
  }, [state.items]);

  const value = useMemo(
    () => ({
      items: state.items,
      hydrated: state.hydrated,
      addItem,
      addItems,
      removeItem,
      updateQuantity,
      setRecurring,
      clear,
      totalBRL,
      totalRecurringBRL,
      count,
      recurringCount,
      isOpen,
      openCart,
      closeCart,
    }),
    [
      state.items,
      state.hydrated,
      addItem,
      addItems,
      removeItem,
      updateQuantity,
      setRecurring,
      clear,
      totalBRL,
      totalRecurringBRL,
      count,
      recurringCount,
      isOpen,
      openCart,
      closeCart,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __longevifyCart?: typeof value }).__longevifyCart =
      value;
  }, [value]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
