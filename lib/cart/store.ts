"use client";

import { createContext, useContext } from "react";
import type { Product } from "@/lib/products";

export interface CartItem {
  product: Product;
  quantity: number;
  /** quando `true`, o item é tratado como assinatura recorrente */
  recurring?: boolean;
  /** Override do intervalo (em dias). Quando ausente, usa product.recurrence
   *  ou a recomendação derivada de `recommendInterval(product)`. */
  recurringIntervalDays?: number;
}

export type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | {
      type: "add";
      product: Product;
      quantity: number;
      recurring?: boolean;
      recurringIntervalDays?: number;
    }
  | { type: "remove"; productId: string }
  | { type: "update"; productId: string; quantity: number }
  | { type: "set-recurring"; productId: string; recurring: boolean }
  | {
      type: "set-recurring-interval";
      productId: string;
      recurringIntervalDays: number;
    }
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
              ? {
                  ...i,
                  quantity: i.quantity + action.quantity,
                  recurring: action.recurring ?? i.recurring,
                  recurringIntervalDays:
                    action.recurringIntervalDays ?? i.recurringIntervalDays,
                }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            product: action.product,
            quantity: action.quantity,
            recurring: action.recurring ?? false,
            recurringIntervalDays: action.recurringIntervalDays,
          },
        ],
      };
    }
    case "set-recurring":
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, recurring: action.recurring }
            : i,
        ),
      };
    case "set-recurring-interval":
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? {
                ...i,
                recurring: true,
                recurringIntervalDays: action.recurringIntervalDays,
              }
            : i,
        ),
      };
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

export interface AddItemOptions {
  quantity?: number;
  recurring?: boolean;
  recurringIntervalDays?: number;
}

export interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  addItem: (productId: string, opts?: AddItemOptions | number) => void;
  /** add em batch — útil pro botão "Adicionar todos recomendados" */
  addItems: (productIds: string[], opts?: AddItemOptions) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setRecurring: (productId: string, recurring: boolean) => void;
  setRecurringInterval: (productId: string, intervalDays: number) => void;
  clear: () => void;
  totalBRL: number;
  /** total considerando descontos de assinatura */
  totalRecurringBRL: number;
  count: number;
  recurringCount: number;
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
