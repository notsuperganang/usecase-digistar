"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chatTokens } from "@/lib/design-tokens";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MAX_LENGTH = 10000;

/**
 * Chat Input Component
 *
 * Features:
 * - Auto-resizing textarea (max 200px height)
 * - Character counter with color-coded warnings
 * - Enter to send, Shift+Enter for newline
 * - Disabled state during loading
 */

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || trimmed.length > MAX_LENGTH) return;

    onSend(trimmed);
    setText("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const isNearLimit = charCount > MAX_LENGTH * 0.9; // 90% threshold

  return (
    <div className={chatTokens.layout.inputContainer}>
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 items-end">
          {/* Textarea */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan Anda..."
              disabled={disabled}
              className={cn(
                "min-h-15 max-h-50 resize-none pr-20",
                isOverLimit && "border-destructive ring-destructive/20"
              )}
              aria-label="Pesan chat"
              aria-invalid={isOverLimit}
            />

            {/* Character counter */}
            {charCount > 0 && (
              <div
                className={cn(
                  "absolute bottom-2 right-2 text-xs tabular-nums",
                  isOverLimit
                    ? "text-destructive font-medium"
                    : isNearLimit
                    ? "text-warning"
                    : "text-muted-foreground"
                )}
              >
                {charCount.toLocaleString("id-ID")} / {MAX_LENGTH.toLocaleString("id-ID")}
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={disabled || !text.trim() || isOverLimit}
            size="icon"
            className="h-15 w-15 shrink-0"
            aria-label="Kirim pesan"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-2">
          Tekan <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> untuk
          mengirim, <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Shift+Enter</kbd> untuk
          baris baru
        </p>
      </div>
    </div>
  );
}