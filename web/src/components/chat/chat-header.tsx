"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { chatTokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  onClearChat?: () => void;
  messageCount?: number;
}

/**
 * Chat Header Component
 *
 * Features:
 * - TelcoCare branding
 * - Message counter
 * - Clear chat button with confirmation
 */

export function ChatHeader({ onClearChat, messageCount = 0 }: ChatHeaderProps) {
  const handleClearClick = () => {
    if (messageCount === 0) return;

    const confirmed = window.confirm(
      "Hapus riwayat chat?\n\nSemua pesan akan dihapus secara permanen."
    );

    if (confirmed && onClearChat) {
      onClearChat();
    }
  };

  return (
    <div className={chatTokens.layout.header}>
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center p-1 shadow-sm">
            <Image
              src="/icon-telkom.png"
              alt="Telkom"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold">TelcoCare Support</h1>
            <p className={chatTokens.text.label}>
              Asisten Virtual
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Dashboard link */}
          <Link href="/cs-dashboard">
            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>

          {/* Message count badge */}
          {messageCount > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {messageCount} pesan
            </Badge>
          )}

          {/* Clear chat button */}
          {messageCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearClick}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-110"
              aria-label="Hapus riwayat chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
