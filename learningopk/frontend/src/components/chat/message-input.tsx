"use client";

import { useRef, useState, useCallback } from "react";
import { PaperPlaneRight, Paperclip, X, Image as ImageIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageInputProps = {
  onSend: (body: string, media?: { type: "image" | "file"; url: string; fileName?: string }) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((value: string) => {
    setBody(value);

    onTyping?.(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.(false);
    }, 2000);
  }, [onTyping]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!body.trim() && !selectedFile) || isSending) return;

    setIsSending(true);

    try {
      let media: { type: "image" | "file"; url: string; fileName?: string } | undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          media = {
            type: selectedFile.type.startsWith("image/") ? "image" : "file",
            url,
            fileName: selectedFile.name,
          };
        }
      }

      onSend(body.trim(), media);
      setBody("");
      handleRemoveFile();
      onTyping?.(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [body, selectedFile, isSending, onSend, onTyping, handleRemoveFile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col gap-2">
      {selectedFile && (
        <div className="relative inline-block">
          {previewUrl ? (
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-24 w-24 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted p-2">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm truncate max-w-[120px]">{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 rounded hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-h-[44px] max-h-[120px] resize-none pr-10"
            rows={1}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="shrink-0"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          disabled={(!body.trim() && !selectedFile) || disabled || isSending}
          className="shrink-0"
        >
          {isSending ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary-foreground)] border-t-transparent" />
          ) : (
            <PaperPlaneRight className="h-5 w-5" weight="fill" />
          )}
        </Button>
      </div>
    </div>
  );
}
