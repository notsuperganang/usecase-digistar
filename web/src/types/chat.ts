/**
 * Chat Interface Type Definitions
 */

export interface Message {
  id: string;                    // Unique identifier (crypto.randomUUID())
  role: "user" | "assistant";    // Message sender
  content: string;               // Message text content
  timestamp: Date;               // When message was created
  status: "sending" | "sent" | "error";  // Message delivery status
  error?: string;                // Error message if status is "error"
  escalation?: {                 // Auto-escalation metadata
    triggered: boolean;
    urgency: string;
    priority: string;
    reason: 'ml' | 'llm';
  };
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
