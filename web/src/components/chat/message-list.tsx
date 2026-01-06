"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { chatTokens } from "@/lib/design-tokens";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onRetry?: (messageId: string) => void;
  onTemplateClick?: (message: string) => void;
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

export function MessageList({ messages, isLoading, onRetry, onTemplateClick }: MessageListProps) {
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
    const templateMessages = [
      {
        title: "Masalah Internet",
        description: "Internet rumah saya mati total sejak pagi ini",
        link: "#internet",
      },
      {
        title: "Informasi Tagihan",
        description: "Bagaimana cara mengecek dan membayar tagihan bulanan?",
        link: "#tagihan",
      },
      {
        title: "Upgrade Paket",
        description: "Saya ingin upgrade paket internet ke kecepatan lebih tinggi",
        link: "#upgrade",
      },
    ];

    const handleCardClick = (description: string) => {
      if (onTemplateClick) {
        onTemplateClick(description);
      }
    };

    return (
      <div className={chatTokens.layout.messageList}>
        <div className="flex flex-col items-center justify-center h-full py-8">
          {/* Logo and Welcome */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-xl p-3 shadow-md">
                <Image
                  src="/icon-telkom.png"
                  alt="Telkom"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Selamat Datang di TelcoCare</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Sampaikan keluhan atau pertanyaan Anda, dan kami akan membantu
              menyelesaikannya dengan cepat.
            </p>
          </div>

          {/* Template Messages with Hover Effect */}
          <div className="w-full max-w-4xl px-4">
            <p className="text-sm font-medium text-center mb-4 text-muted-foreground">
              Contoh pertanyaan:
            </p>
            <HoverEffect 
              items={templateMessages} 
              className="grid-cols-1 md:grid-cols-3"
              onCardClick={handleCardClick}
            />
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
