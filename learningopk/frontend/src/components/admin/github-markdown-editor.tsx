"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  Code,
  Heading,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Eye,
  Quote,
  ChevronDown,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { ContentRenderer } from "@/components/common/content-renderer";

/* ─────────────────────────── Types ─────────────────────────── */

type ImageUploadResult = {
  url: string;
  markdown: string;
};

type GithubMarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<ImageUploadResult>;
  onImageUploadError?: (error: unknown) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: number;
};

type TabMode = "write" | "preview";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/* ─────────────────────── Toolbar Config ─────────────────────── */

type ToolbarAction = {
  id: string;
  label: string;
  icon: ReactNode;
  shortcutLabel?: string;
  action: "bold" | "italic" | "code" | "link" | "ordered-list" | "unordered-list" | "quote" | "heading" | "attach" | "horizontal-rule";
};

const ICON_SIZE = 16;

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: "heading",
    label: "Heading",
    icon: <Heading size={ICON_SIZE} />,
    action: "heading",
  },
  {
    id: "bold",
    label: "Bold",
    icon: <Bold size={ICON_SIZE} />,
    shortcutLabel: "Ctrl+B",
    action: "bold",
  },
  {
    id: "italic",
    label: "Italic",
    icon: <Italic size={ICON_SIZE} />,
    shortcutLabel: "Ctrl+I",
    action: "italic",
  },
  {
    id: "code",
    label: "Code",
    icon: <Code size={ICON_SIZE} />,
    shortcutLabel: "Ctrl+E",
    action: "code",
  },
  {
    id: "link",
    label: "Link",
    icon: <Link size={ICON_SIZE} />,
    shortcutLabel: "Ctrl+K",
    action: "link",
  },
  {
    id: "separator-1",
    label: "",
    icon: null,
    action: "bold", // unused; separator is rendered differently
  },
  {
    id: "ordered-list",
    label: "Ordered list",
    icon: <ListOrdered size={ICON_SIZE} />,
    action: "ordered-list",
  },
  {
    id: "unordered-list",
    label: "Unordered list",
    icon: <List size={ICON_SIZE} />,
    action: "unordered-list",
  },
  {
    id: "quote",
    label: "Quote",
    icon: <Quote size={ICON_SIZE} />,
    action: "quote",
  },
  {
    id: "separator-2",
    label: "",
    icon: null,
    action: "bold", // unused
  },
  {
    id: "horizontal-rule",
    label: "Horizontal rule",
    icon: <Minus size={ICON_SIZE} />,
    action: "horizontal-rule",
  },
  {
    id: "attach",
    label: "Attach file",
    icon: <Paperclip size={ICON_SIZE} />,
    action: "attach",
  },
];

/* ───────────────────── Heading Dropdown ──────────────────────── */

type HeadingDropdownProps = {
  onSelect: (level: HeadingLevel) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  disabled?: boolean;
};

const HEADING_LEVELS: { level: HeadingLevel; label: string }[] = [
  { level: 1, label: "Heading 1" },
  { level: 2, label: "Heading 2" },
  { level: 3, label: "Heading 3" },
  { level: 4, label: "Heading 4" },
  { level: 5, label: "Heading 5" },
  { level: 6, label: "Heading 6" },
];

function HeadingDropdown({ onSelect, open, onToggle, onClose, disabled }: HeadingDropdownProps) {
  const handleSelect = useCallback(
    (level: HeadingLevel) => {
      onSelect(level);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <div className="relative">
      <Tooltip content="Heading level" side="bottom">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-0.5 rounded p-1.5",
            "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
            "transition-colors disabled:pointer-events-none disabled:opacity-50",
          )}
          aria-label="Select heading level"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Heading size={ICON_SIZE} />
          <ChevronDown size={12} />
        </button>
      </Tooltip>
      {open && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
          <div
            role="listbox"
            className={cn(
              "absolute left-0 top-full z-50 mt-1 min-w-[160px]",
              "rounded-lg border border-border-default bg-bg-surface shadow-lg",
              "animate-in fade-in-0 zoom-in-95 py-1",
            )}
          >
            {HEADING_LEVELS.map(({ level, label }) => (
              <button
                key={level}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(level)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm",
                  "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                  "transition-colors",
                )}
              >
                <span className="font-mono text-xs text-text-secondary/60">
                  {"#".repeat(level)}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ────────────────── Toolbar Button Component ─────────────────── */

type ToolbarButtonProps = {
  label: string;
  shortcutLabel?: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

function ToolbarButton({ label, shortcutLabel, icon, onClick, disabled }: ToolbarButtonProps) {
  const tooltipContent = shortcutLabel ? `${label} (${shortcutLabel})` : label;

  return (
    <Tooltip content={tooltipContent} side="bottom">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "rounded p-1.5",
          "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
          "transition-colors disabled:pointer-events-none disabled:opacity-50",
        )}
        aria-label={label}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

/* ──────────────────── Upload Placeholder Utils ───────────────── */

const UPLOAD_PLACEHOLDER_PREFIX = "![Uploading ";
const UPLOAD_PLACEHOLDER_SUFFIX = "…]()";

function createUploadPlaceholder(fileName: string): string {
  return `${UPLOAD_PLACEHOLDER_PREFIX}${fileName}${UPLOAD_PLACEHOLDER_SUFFIX}`;
}

/* ──────────────── Markdown Text Manipulation Utils ────────────── */

type TextareaRef = HTMLTextAreaElement;

function getSelection(textarea: TextareaRef): { start: number; end: number; text: string } {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
    text: textarea.value.slice(textarea.selectionStart, textarea.selectionEnd),
  };
}

/**
 * Replaces text in the textarea value at a specific range, then triggers onChange.
 * Returns the updated value and the new cursor position.
 */
function replaceRange(
  currentValue: string,
  start: number,
  end: number,
  replacement: string,
): { value: string; cursorPos: number } {
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  return {
    value: before + replacement + after,
    cursorPos: start + replacement.length,
  };
}

function wrapSelection(
  currentValue: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
  selectedText: string,
  placeholderText: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const text = selectedText || placeholderText;
  const replacement = `${prefix}${text}${suffix}`;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const value = before + replacement + after;

  if (selectedText) {
    return {
      value,
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length + text.length,
    };
  }

  // No selection: place cursor on the placeholder text so user can type
  return {
    value,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + placeholderText.length,
  };
}

function insertAtLineStart(
  currentValue: string,
  start: number,
  prefix: string,
): { value: string; cursorPos: number } {
  // Find the beginning of the current line
  const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
  const before = currentValue.slice(0, lineStart);
  const after = currentValue.slice(lineStart);
  return {
    value: before + prefix + after,
    cursorPos: start + prefix.length,
  };
}

/* ═══════════════════════ Main Component ═══════════════════════ */

export const GithubMarkdownEditor = forwardRef<TextareaRef, GithubMarkdownEditorProps>(
  function GithubMarkdownEditor(
    {
      value,
      onChange,
      onImageUpload,
      onImageUploadError,
      disabled = false,
      placeholder = "Write chapter content in markdown...",
      className,
      minHeight = 400,
    },
    ref,
  ) {
    const [activeTab, setActiveTab] = useState<TabMode>("write");
    const [isDragging, setIsDragging] = useState(false);
    const [headingDropdownOpen, setHeadingDropdownOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dragCounterRef = useRef(0);
    const uniqueId = useId();

    /* ─── Ref forwarding ─── */
    const setTextareaRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        textareaRef.current = el;
        if (typeof ref === "function") {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
      },
      [ref],
    );

    /* ─── Update value ─── */
    const updateValue = useCallback(
      (newValue: string) => {
        onChange(newValue);
      },
      [onChange],
    );

    /* ─── Set cursor / selection in textarea ─── */
    const setTextareaSelection = useCallback((start: number, end: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      // Schedule after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end);
      });
    }, []);

    /* ─── Image upload handler ─── */
    const handleFileUpload = useCallback(
      async (file: File) => {
        if (!onImageUpload) return;
        const textarea = textareaRef.current;
        if (!textarea) return;

        const placeholderText = createUploadPlaceholder(file.name);
        const { start } = getSelection(textarea);
        const { value: newValue } = replaceRange(value, start, start, placeholderText);
        updateValue(newValue);

        try {
          const result = await onImageUpload(file);
          // Replace placeholder with the actual markdown returned by the upload handler
          const currentVal = textareaRef.current?.value ?? newValue;
          const placeholderIndex = currentVal.indexOf(placeholderText);
          if (placeholderIndex !== -1) {
            const updated = currentVal.slice(0, placeholderIndex) + result.markdown + currentVal.slice(placeholderIndex + placeholderText.length);
            updateValue(updated);
          }
        } catch (error) {
          // Remove placeholder on failure and notify consumer
          const currentVal = textareaRef.current?.value ?? newValue;
          const placeholderIndex = currentVal.indexOf(placeholderText);
          if (placeholderIndex !== -1) {
            const updated = currentVal.slice(0, placeholderIndex) + currentVal.slice(placeholderIndex + placeholderText.length);
            updateValue(updated);
          }
          console.error("[GithubMarkdownEditor] Image upload failed:", error);
          onImageUploadError?.(error);
        }
      },
      [onImageUpload, onImageUploadError, value, updateValue],
    );

    const handleFilesFromInput = useCallback(
      (files: FileList | null) => {
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file && file.type.startsWith("image/")) {
            void handleFileUpload(file);
          }
        }
      },
      [handleFileUpload],
    );

    /* ─── Toolbar formatting actions ─── */
    const applyFormatAction = useCallback(
      (action: ToolbarAction["action"], headingLevel?: HeadingLevel) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { start, end, text: selectedText } = getSelection(textarea);

        switch (action) {
          case "bold": {
            const result = wrapSelection(value, start, end, "**", "**", selectedText, "bold text");
            updateValue(result.value);
            setTextareaSelection(result.selectionStart, result.selectionEnd);
            break;
          }
          case "italic": {
            const result = wrapSelection(value, start, end, "*", "*", selectedText, "italic text");
            updateValue(result.value);
            setTextareaSelection(result.selectionStart, result.selectionEnd);
            break;
          }
          case "code": {
            if (selectedText.includes("\n")) {
              // Multi-line selection → fenced code block
              const result = wrapSelection(value, start, end, "```\n", "\n```", selectedText, "code");
              updateValue(result.value);
              setTextareaSelection(result.selectionStart, result.selectionEnd);
            } else {
              const result = wrapSelection(value, start, end, "`", "`", selectedText, "code");
              updateValue(result.value);
              setTextareaSelection(result.selectionStart, result.selectionEnd);
            }
            break;
          }
          case "link": {
            if (selectedText) {
              const replacement = `[${selectedText}](url)`;
              const before = value.slice(0, start);
              const after = value.slice(end);
              const newValue = before + replacement + after;
              updateValue(newValue);
              // Select "url" for easy replacement
              const urlStart = start + selectedText.length + 3; // [text](
              setTextareaSelection(urlStart, urlStart + 3);
            } else {
              const replacement = "[link text](url)";
              const { value: newValue } = replaceRange(value, start, end, replacement);
              updateValue(newValue);
              // Select "link text"
              setTextareaSelection(start + 1, start + 10);
            }
            break;
          }
          case "ordered-list": {
            const result = insertAtLineStart(value, start, "1. ");
            updateValue(result.value);
            setTextareaSelection(result.cursorPos, result.cursorPos);
            break;
          }
          case "unordered-list": {
            const result = insertAtLineStart(value, start, "- ");
            updateValue(result.value);
            setTextareaSelection(result.cursorPos, result.cursorPos);
            break;
          }
          case "quote": {
            const result = insertAtLineStart(value, start, "> ");
            updateValue(result.value);
            setTextareaSelection(result.cursorPos, result.cursorPos);
            break;
          }
          case "heading": {
            const level = headingLevel ?? 2;
            const prefix = "#".repeat(level) + " ";
            const result = insertAtLineStart(value, start, prefix);
            updateValue(result.value);
            setTextareaSelection(result.cursorPos, result.cursorPos);
            break;
          }
          case "horizontal-rule": {
            // Insert a horizontal rule, ensuring it's on its own line
            const before = value.slice(0, start);
            const needsNewlineBefore = before.length > 0 && !before.endsWith("\n");
            const after = value.slice(end);
            const needsNewlineAfter = after.length > 0 && !after.startsWith("\n");
            const rule =
              (needsNewlineBefore ? "\n" : "") +
              "---" +
              (needsNewlineAfter ? "\n" : "");
            const { value: newValue, cursorPos } = replaceRange(value, start, end, rule);
            updateValue(newValue);
            setTextareaSelection(cursorPos, cursorPos);
            break;
          }
          case "attach": {
            fileInputRef.current?.click();
            break;
          }
        }
      },
      [value, updateValue, setTextareaSelection],
    );

    /* ─── Keyboard shortcuts ─── */
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;

        if (isCtrlOrMeta && e.key === "b") {
          e.preventDefault();
          applyFormatAction("bold");
        } else if (isCtrlOrMeta && e.key === "i") {
          e.preventDefault();
          applyFormatAction("italic");
        } else if (isCtrlOrMeta && e.key === "e") {
          e.preventDefault();
          applyFormatAction("code");
        } else if (isCtrlOrMeta && e.key === "k") {
          e.preventDefault();
          applyFormatAction("link");
        }
      },
      [applyFormatAction],
    );

    /* ─── Paste handler (images) ─── */
    const handlePaste = useCallback(
      (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items || !onImageUpload) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item && item.type.startsWith("image/")) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              void handleFileUpload(file);
            }
            return;
          }
        }
      },
      [onImageUpload, handleFileUpload],
    );

    /* ─── Drag and drop handlers ─── */
    const handleDragEnter = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onImageUpload) return;
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) {
          setIsDragging(true);
        }
      },
      [onImageUpload],
    );

    const handleDragLeave = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
          setIsDragging(false);
        }
      },
      [],
    );

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);

        if (!onImageUpload) return;

        const files = e.dataTransfer?.files;
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file && file.type.startsWith("image/")) {
            void handleFileUpload(file);
          }
        }
      },
      [onImageUpload, handleFileUpload],
    );

    /* ─── Textarea change ─── */
    const handleTextareaChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        updateValue(e.target.value);
      },
      [updateValue],
    );

    /* ─── File input change ─── */
    const handleFileInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        handleFilesFromInput(e.target.files);
        // Reset input so same file can be selected again
        e.target.value = "";
      },
      [handleFilesFromInput],
    );

    /* ─── Footer click → trigger file input ─── */
    const handleFooterUploadClick = useCallback(() => {
      if (disabled || !onImageUpload) return;
      fileInputRef.current?.click();
    }, [disabled, onImageUpload]);

    /* ─── Heading dropdown ─── */
    const handleHeadingToggle = useCallback(() => {
      setHeadingDropdownOpen((prev) => !prev);
    }, []);

    const handleHeadingClose = useCallback(() => {
      setHeadingDropdownOpen(false);
    }, []);

    const handleHeadingSelect = useCallback(
      (level: HeadingLevel) => {
        applyFormatAction("heading", level);
      },
      [applyFormatAction],
    );

    /* ─── Render toolbar action ─── */
    const renderToolbarAction = useCallback(
      (action: ToolbarAction) => {
        // Separators
        if (action.id.startsWith("separator")) {
          return (
            <div
              key={action.id}
              className="mx-1 h-4 w-px bg-border-default"
              role="separator"
              aria-orientation="vertical"
            />
          );
        }

        // Heading gets a special dropdown
        if (action.action === "heading") {
          return (
            <HeadingDropdown
              key={action.id}
              onSelect={handleHeadingSelect}
              open={headingDropdownOpen}
              onToggle={handleHeadingToggle}
              onClose={handleHeadingClose}
              disabled={disabled}
            />
          );
        }

        return (
          <ToolbarButton
            key={action.id}
            label={action.label}
            shortcutLabel={action.shortcutLabel}
            icon={action.icon}
            onClick={() => applyFormatAction(action.action)}
            disabled={disabled}
          />
        );
      },
      [
        applyFormatAction,
        disabled,
        handleHeadingSelect,
        headingDropdownOpen,
        handleHeadingToggle,
        handleHeadingClose,
      ],
    );

    /* ─── Render ─── */
    const textareaId = `${uniqueId}-textarea`;
    const isWriteMode = activeTab === "write";

    return (
      <div
        className={cn(
          "border border-border-default rounded-lg overflow-hidden",
          "transition-colors",
          isDragging && "ring-2 ring-accent-primary/40 border-accent-primary/60",
          disabled && "opacity-60 pointer-events-none",
          className,
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* ── Tab Bar ── */}
        <div className="bg-bg-surface border-b border-border-default" role="tablist" aria-label="Editor mode">
          <div className="flex items-center px-3">
            <button
              type="button"
              role="tab"
              id={`${uniqueId}-tab-write`}
              aria-selected={isWriteMode}
              aria-controls={`${uniqueId}-panel-write`}
              onClick={() => {
                setActiveTab("write");
                setHeadingDropdownOpen(false);
              }}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium",
                "transition-colors",
                isWriteMode
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Pencil size={14} />
              <span>Write</span>
              {isWriteMode && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent-primary"
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="button"
              role="tab"
              id={`${uniqueId}-tab-preview`}
              aria-selected={!isWriteMode}
              aria-controls={`${uniqueId}-panel-preview`}
              onClick={() => {
                setActiveTab("preview");
                setHeadingDropdownOpen(false);
              }}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium",
                "transition-colors",
                !isWriteMode
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Eye size={14} />
              <span>Preview</span>
              {!isWriteMode && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent-primary"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* ── Formatting Toolbar (Write mode only) ── */}
        {isWriteMode && (
          <div
            className="bg-bg-surface/50 border-b border-border-default px-3 py-1.5 flex items-center gap-1"
            role="toolbar"
            aria-label="Formatting options"
            aria-controls={textareaId}
          >
            {TOOLBAR_ACTIONS.map(renderToolbarAction)}
          </div>
        )}

        {/* ── Editor / Preview Panel ── */}
        {isWriteMode ? (
          <div
            id={`${uniqueId}-panel-write`}
            role="tabpanel"
            aria-labelledby={`${uniqueId}-tab-write`}
          >
            <textarea
              id={textareaId}
              ref={setTextareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                "w-full resize-y bg-transparent font-mono text-sm p-4",
                "text-text-primary placeholder:text-text-secondary",
                "focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              style={{ minHeight: `${minHeight}px` }}
              aria-label="Markdown editor"
              spellCheck
            />

            {/* ── Drag overlay ── */}
            {isDragging && (
              <div
                className={cn(
                  "absolute inset-0 z-10 flex items-center justify-center",
                  "bg-bg-surface/80 backdrop-blur-sm",
                  "border-2 border-dashed border-accent-primary/40 rounded-lg m-1",
                )}
              >
                <div className="flex flex-col items-center gap-2 text-text-secondary">
                  <ImageIcon size={32} className="text-accent-primary/60" />
                  <span className="text-sm font-medium">Drop image to upload</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            id={`${uniqueId}-panel-preview`}
            role="tabpanel"
            aria-labelledby={`${uniqueId}-tab-preview`}
            className="p-4 overflow-auto"
            style={{ minHeight: `${minHeight}px` }}
          >
            {value.trim() ? (
              <ContentRenderer content={value} variant="default" />
            ) : (
              <p className="text-text-secondary text-sm italic">
                Nothing to preview
              </p>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="bg-bg-surface/30 border-t border-border-default px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15V4.15C16 3.52 15.48 3 14.85 3zM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z" />
            </svg>
            <span>Markdown is supported</span>
          </div>

          {onImageUpload && (
            <button
              type="button"
              onClick={handleFooterUploadClick}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 text-xs text-text-secondary",
                "hover:text-text-primary transition-colors",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <ImageIcon size={14} className="shrink-0" />
              <span>Paste, drop, or click to add files</span>
            </button>
          )}
        </div>

        {/* ── Hidden file input for image uploads ── */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    );
  },
);
