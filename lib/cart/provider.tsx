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
  type CartItem,
} from "./store";

interface PersistedItem {
  productId: string;
  quantity: number;
}

function safeReadStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => {
        const product = getProductById(p.productId);
        if (!product) return null;
        const quantity = Math.max(1, Math.floor(p.quantity || 1));
        return { product, quantity } satisfies CartItem;
      })
      .filter((x): x is CartItem => x !== null);
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

  const addItem = useCallback((productId: string, quantity: number = 1) => {
    const product = getProductById(productId);
    if (!product) return;
    dispatch({ type: "add", product, quantity });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "remove", productId });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      dispatch({ type: "update", productId, quantity });
    },
    [],
  );

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { totalBRL, count } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const item of state.items) {
      total += item.product.priceBRL * item.quantity;
      count += item.quantity;
    }
    return { totalBRL: total, count };
  }, [state.items]);

  const value = useMemo(
    () => ({
      items: state.items,
      hydrated: state.hydrated,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      totalBRL,
      count,
      isOpen,
      openCart,
      closeCart,
    }),
    [
      state.items,
      state.hydrated,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      totalBRL,
      count,
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
