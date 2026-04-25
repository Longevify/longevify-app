"use client";

import { createContext, useContext } from "react";
import type { Product } from "@/lib/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

export type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; product: Product; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "update"; productId: string; quantity: number }
  | { type: "clear" };

export interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

export const INITIAL_CART_STATE: CartState = {
  items: [],
  hydrated: false,
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items, hydrated: true };
    case "add": {
      const existing = state.items.find(
        (i) => i.product.id === action.product.id,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + action.quantity }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { product: action.product, quantity: action.quantity },
        ],
      };
    }
    case "remove":
      return {
        ...state,
        items: state.items.filter((i) => i.product.id !== action.productId),
      };
    case "update": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.product.id !== action.productId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, quantity: action.quantity }
            : i,
        ),
      };
    }
    case "clear":
      return { ...state, items: [] };
    default:
      return state;
  }
}

export interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  totalBRL: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

export const CART_STORAGE_KEY = "longevify.cart";
