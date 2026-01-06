"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Typing Indicator Component
 *
 * Displays animated dots while AI is processing
 * Text: "AI sedang berpikir..." (Indonesian)
 */

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex gap-3">
        {/* AI Avatar */}
        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center p-1 shadow-sm">
          <Image
            src="/icon-telkom.png"
            alt="Telkom"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        {/* Typing bubble */}
        <div className="bg-card border border-border/70 rounded-4xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full bg-muted-foreground",
                    "animate-pulse"
                  )}
                  style={{
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              AI sedang berpikir...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
