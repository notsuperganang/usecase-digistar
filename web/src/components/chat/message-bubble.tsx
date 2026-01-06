"use client";

import { motion } from "framer-motion";
import { AlertCircle, RotateCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chatTokens } from "@/lib/design-tokens";
import { messageFadeIn } from "@/lib/chat-animations";
import type { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
}

/**
 * Message Bubble Component
 *
 * Displays individual chat messages with different styles:
 * - User: Right-aligned, Telkom Red background
 * - AI: Left-aligned, card background with avatar
 * - Error state with retry button
 */

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";

  return (
    <motion.div
      variants={messageFadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar (only for AI) */}
      {!isUser && (
        <Avatar className="h-8 w-8 bg-white shadow-sm">
          <AvatarImage src="/icon-telkom.png" alt="Telkom" className="p-1" />
          <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
            TC
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={cn("flex flex-col", chatTokens.layout.messageMaxWidth)}>
        {/* Message bubble */}
        <div
          className={cn(
            chatTokens.text.message,
            isUser ? chatTokens.bubble.user : chatTokens.bubble.ai,
            isError && "border-destructive/50"
          )}
        >
          <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>

          {/* Timestamp */}
          <div className={cn(
            chatTokens.text.timestamp,
            isUser && "text-primary-foreground/70"
          )}>
            {formatTime(message.timestamp)}
          </div>
        </div>

        {/* Error message with retry */}
        {isError && message.error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-xs">{message.error}</span>
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="ml-2 h-7 gap-1"
                >
                  <RotateCw className="h-3 w-3" />
                  Coba Lagi
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Format timestamp to HH:MM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}