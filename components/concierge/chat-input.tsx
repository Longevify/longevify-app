"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatInputHandle {
  focus: () => void;
}

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_LINES = 6;

export const ChatInput = forwardRef<ChatInputHandle, Props>(function ChatInput(
  { onSend, disabled, placeholder = "Pergunte sobre seus resultados…" },
  ref,
) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const padding = 20;
    const maxHeight = lineHeight * MAX_LINES + padding;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, [draft]);

  function handleSubmit() {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={cn(
        "flex items-end gap-2 rounded-[20px] border border-border bg-white p-2",
        "shadow-[0_1px_2px_rgba(13,40,24,.04)] focus-within:border-brand-400",
      )}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "min-h-[36px] w-full flex-1 resize-none bg-transparent px-3 py-2",
          "text-[14px] leading-5 text-ink outline-none placeholder:text-muted",
          "disabled:opacity-60",
        )}
      />
      <Button
        type="submit"
        size="icon"
        variant="dark"
        aria-label="Enviar"
        disabled={disabled || draft.trim().length === 0}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </form>
  );
});
