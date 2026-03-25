"use client";

import { Check, Checks, File, Download } from "@phosphor-icons/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/friends-api";

type ChatBubbleProps = {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderName?: string;
  senderImage?: string | null;
  onDelete?: (messageId: string) => void;
};

export function ChatBubble({
  message,
  isOwn,
  showAvatar = true,
  senderName,
  senderImage,
  onDelete,
}: ChatBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderMedia = () => {
    if (message.mediaType === "image" && message.mediaUrl) {
      return (
        <div className="mt-2 relative group">
          <Image
            src={message.mediaUrl}
            alt="Shared image"
            width={240}
            height={180}
            className="rounded-lg max-w-[240px] h-auto object-cover"
          />
        </div>
      );
    }

    if (message.mediaType === "file" && message.mediaUrl) {
      return (
        <div className="mt-2">
          <a
            href={message.mediaUrl}
            download={message.mediaFileName || "file"}
            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <File className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.mediaFileName || "File"}</p>
              <p className="text-xs text-muted-foreground">Click to download</p>
            </div>
            <Download className="h-5 w-5 text-muted-foreground" />
          </a>
        </div>
      );
    }

    return null;
  };

  const renderStatus = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case "sent":
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
      case "delivered":
        return <Checks className="h-3.5 w-3.5 text-muted-foreground" />;
      case "read":
        return <Checks className="h-3.5 w-3.5 text-[var(--primary)]" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "flex gap-2",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {!isOwn && (
        <div className="shrink-0 w-8">
          {showAvatar ? (
            senderImage ? (
              <Image
                src={senderImage}
                alt={senderName || "User"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                <span className="text-xs font-medium text-[var(--primary)]">
                  {senderName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )
          ) : null}
        </div>
      )}

      <div className={cn(
        "max-w-[75%] flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        {message.body && (
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm",
              isOwn
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] rounded-tr-md"
                : "bg-muted text-foreground rounded-tl-md"
            )}
            onContextMenu={(e) => {
              e.preventDefault();
              onDelete?.(message.id);
            }}
          >
            {message.body}
          </div>
        )}

        {renderMedia()}

        <div className={cn(
          "flex items-center gap-1 mt-1 px-1",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}
