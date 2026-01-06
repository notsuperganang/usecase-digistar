"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { sendChatMessage } from "@/lib/api-client";
import { chatTokens } from "@/lib/design-tokens";
import type { Message } from "@/types/chat";

const STORAGE_KEY = "telcocare-chat-history";

/**
 * Chat Container Component
 *
 * Main orchestrator component with:
 * - State management (messages, loading, error)
 * - localStorage persistence
 * - API integration via api-client.ts
 * - Optimistic UI (user message appears immediately)
 * - Error handling with retry
 */

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Rehydrate Date objects
        const rehydrated = parsed.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(rehydrated);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  }, []);

  // Save chat history to localStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save chat history:", error);
      }
    }
  }, [messages]);

  // Send message handler
  const handleSendMessage = useCallback(async (text: string) => {
    // Create user message (optimistic UI)
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
      status: "sending",
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call API
      const response = await sendChatMessage(text);

      // Update user message to "sent"
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: "sent" } : msg
        )
      );

      // Add AI response
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response, // Only customer_response (Indonesian)
        timestamp: new Date(),
        status: "sent",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      // Mark user message as error
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: "error", error: errorMessage }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Retry failed message
  const handleRetry = useCallback((messageId: string) => {
    const failedMessage = messages.find((msg) => msg.id === messageId);
    if (!failedMessage) return;

    // Remove failed message and resend
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    handleSendMessage(failedMessage.content);
  }, [messages, handleSendMessage]);

  // Clear chat history
  const handleClearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <div className={chatTokens.layout.container}>
      {/* Header */}
      <ChatHeader
        messageCount={messages.length}
        onClearChat={handleClearChat}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onRetry={handleRetry}
      />

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
