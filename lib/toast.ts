"use client";

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastPayload {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
}

export type ToastInput = Omit<ToastPayload, "id" | "variant"> & {
  variant?: ToastVariant;
};

const TOAST_EVENT = "longevify:toast";

function emit(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }),
  );
}

function makeId(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function show(variant: ToastVariant, input: ToastInput | string): string {
  const payload: ToastPayload =
    typeof input === "string"
      ? { id: makeId(), title: input, variant }
      : { id: makeId(), variant, ...input };
  emit(payload);
  return payload.id;
}

export const toast = {
  success(input: ToastInput | string) {
    return show("success", input);
  },
  error(input: ToastInput | string) {
    return show("error", input);
  },
  info(input: ToastInput | string) {
    return show("info", input);
  },
};

export const TOAST_EVENT_NAME = TOAST_EVENT;
