"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { chatTokens } from "@/lib/design-tokens";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onRetry?: (messageId: string) => void;
}

/**
 * Message List Component
 *
 * Features:
 * - Scrollable message area (ScrollArea)
 * - Auto-scroll to bottom on new messages
 * - Welcome message when empty
 * - Stagger animation for initial load
 * - Typing indicator during loading
 */

export function MessageList({ messages, isLoading, onRetry }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={chatTokens.layout.messageList}>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Selamat Datang di TelcoCare</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Sampaikan keluhan atau pertanyaan Anda, dan kami akan membantu
            menyelesaikannya dengan cepat.
          </p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">Contoh pertanyaan:</p>
            <ul className="space-y-1">
              <li>• &quot;Internet rumah saya mati total&quot;</li>
              <li>• &quot;Bagaimana cara mengecek tagihan?&quot;</li>
              <li>• &quot;Saya ingin upgrade paket&quot;</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className={chatTokens.layout.messageList} ref={scrollRef}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={onRetry ? () => onRetry(message.id) : undefined}
          />
        ))}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
