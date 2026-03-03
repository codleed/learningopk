"use client";

import { defaultKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  placeholder
} from "@codemirror/view";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type CodeMirrorMarkdownEditorHandle = {
  focus: () => void;
  getSelectionRange: () => { start: number; end: number };
  setSelectionRange: (start: number, end?: number) => void;
  insertTextAtSelection: (text: string) => { cursor: number };
  applyWikiLinkSuggestion: (targetTitle: string) => boolean;
};

type CodeMirrorMarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholderText?: string;
  className?: string;
  testId?: string;
  wikiLinkTargets?: string[];
  onWikiLinkQueryChange?: (payload: { query: string; suggestions: string[] }) => void;
};

export const CodeMirrorMarkdownEditor = forwardRef<CodeMirrorMarkdownEditorHandle, CodeMirrorMarkdownEditorProps>(
  function CodeMirrorMarkdownEditor(
    {
      value,
      onChange,
      disabled = false,
      placeholderText = "Write markdown...",
      className,
      testId = "curriculum-summary-editor-cm6",
      wikiLinkTargets = [],
      onWikiLinkQueryChange
    }: CodeMirrorMarkdownEditorProps,
    ref
  ) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const editableCompartmentRef = useRef(new Compartment());
    const placeholderCompartmentRef = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    const wikiTargetsRef = useRef(wikiLinkTargets);
    const onWikiLinkQueryChangeRef = useRef(onWikiLinkQueryChange);
    const wikiQueryRangeRef = useRef<{ from: number; to: number } | null>(null);
    const lastWikiQuerySignatureRef = useRef("");

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      wikiTargetsRef.current = wikiLinkTargets;
    }, [wikiLinkTargets]);

    useEffect(() => {
      onWikiLinkQueryChangeRef.current = onWikiLinkQueryChange;
    }, [onWikiLinkQueryChange]);

    // Keep one EditorView instance and reconfigure it via compartments/effects.
    useEffect(() => {
      if (!editorRef.current) {
        return;
      }
      const hostElement = hostRef.current;

      const updateListener = EditorView.updateListener.of((update) => {
        const emitWikiQueryChange = (query: string, suggestions: string[]) => {
          const signature = `${query}|${suggestions.join("\u0001")}`;
          if (lastWikiQuerySignatureRef.current === signature) {
            return;
          }
          lastWikiQuerySignatureRef.current = signature;
          onWikiLinkQueryChangeRef.current?.({
            query,
            suggestions
          });
        };

        if (!update.docChanged) {
          if (!update.selectionSet) {
            return;
          }
        }
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }

        const selection = update.state.selection.main;
        if (!selection.empty) {
          wikiQueryRangeRef.current = null;
          emitWikiQueryChange("", []);
          return;
        }

        const cursor = selection.from;
        const lookbackStart = Math.max(0, cursor - 120);
        const textBeforeCursor = update.state.doc.sliceString(lookbackStart, cursor);
        const openIndex = textBeforeCursor.lastIndexOf("[[");
        if (openIndex === -1) {
          wikiQueryRangeRef.current = null;
          emitWikiQueryChange("", []);
          return;
        }

        const query = textBeforeCursor.slice(openIndex + 2);
        if (query.includes("]") || query.includes("\n") || query.includes("\r")) {
          wikiQueryRangeRef.current = null;
          emitWikiQueryChange("", []);
          return;
        }

        const from = lookbackStart + openIndex;
        wikiQueryRangeRef.current = {
          from,
          to: cursor
        };
        const normalizedQuery = query.trim().toLowerCase();
        const suggestions =
          normalizedQuery.length === 0
            ? wikiTargetsRef.current.slice(0, 8)
            : wikiTargetsRef.current
                .filter((title) => title.toLowerCase().includes(normalizedQuery))
                .slice(0, 8);
        emitWikiQueryChange(query, suggestions);
      });

      const editorState = EditorState.create({
        doc: value,
        extensions: [
          keymap.of(defaultKeymap),
          markdown(),
          EditorView.lineWrapping,
          editableCompartmentRef.current.of(EditorView.editable.of(!disabled)),
          placeholderCompartmentRef.current.of(placeholder(placeholderText)),
          updateListener,
          EditorView.theme({
            "&": {
              minHeight: "14rem",
              fontSize: "0.875rem"
            },
            ".cm-scroller": {
              minHeight: "14rem",
              overflow: "auto"
            },
            ".cm-content": {
              minHeight: "14rem",
              paddingTop: "0.75rem",
              paddingBottom: "0.75rem",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem"
            },
            "&.cm-focused": {
              outline: "none"
            }
          })
        ]
      });

      const editorView = new EditorView({
        state: editorState,
        parent: editorRef.current
      });

      editorViewRef.current = editorView;
      if (hostElement) {
        (hostElement as HTMLDivElement & { __cmView?: EditorView }).__cmView = editorView;
      }

      return () => {
        if (hostElement) {
          delete (hostElement as HTMLDivElement & { __cmView?: EditorView }).__cmView;
        }
        editorView.destroy();
        if (editorViewRef.current === editorView) {
          editorViewRef.current = null;
        }
      };
      // Dynamic value/disabled/placeholder updates are handled by dedicated effects below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const editorView = editorViewRef.current;
      if (!editorView) {
        return;
      }

      editorView.dispatch({
        effects: editableCompartmentRef.current.reconfigure(EditorView.editable.of(!disabled))
      });
    }, [disabled]);

    useEffect(() => {
      const editorView = editorViewRef.current;
      if (!editorView) {
        return;
      }

      editorView.dispatch({
        effects: placeholderCompartmentRef.current.reconfigure(placeholder(placeholderText))
      });
    }, [placeholderText]);

    useEffect(() => {
      const editorView = editorViewRef.current;
      if (!editorView) {
        return;
      }

      const currentValue = editorView.state.doc.toString();
      if (currentValue === value) {
        return;
      }

      const previousSelection = editorView.state.selection.main;
      const anchor = Math.min(value.length, previousSelection.anchor);
      const head = Math.min(value.length, previousSelection.head);
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: value
        },
        selection: EditorSelection.single(anchor, head)
      });
    }, [value]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        editorViewRef.current?.focus();
      },
      getSelectionRange: () => {
        const editorView = editorViewRef.current;
        if (!editorView) {
          return { start: 0, end: 0 };
        }
        const selection = editorView.state.selection.main;
        return {
          start: selection.from,
          end: selection.to
        };
      },
      setSelectionRange: (start: number, end?: number) => {
        const editorView = editorViewRef.current;
        if (!editorView) {
          return;
        }
        const docLength = editorView.state.doc.length;
        const from = Math.max(0, Math.min(start, docLength));
        const to = Math.max(from, Math.min(end ?? from, docLength));
        editorView.dispatch({
          selection: EditorSelection.single(from, to)
        });
      },
      insertTextAtSelection: (text: string) => {
        const editorView = editorViewRef.current;
        if (!editorView) {
          return { cursor: 0 };
        }
        const selection = editorView.state.selection.main;
        const cursor = selection.from + text.length;
        editorView.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: text
          },
          selection: EditorSelection.single(cursor, cursor)
        });
        return { cursor };
      },
      applyWikiLinkSuggestion: (targetTitle: string) => {
        const editorView = editorViewRef.current;
        const wikiQueryRange = wikiQueryRangeRef.current;
        if (!editorView || !wikiQueryRange) {
          return false;
        }

        const trailingChars = editorView.state.doc.sliceString(wikiQueryRange.to, wikiQueryRange.to + 2);
        const closingBrackets = trailingChars === "]]" ? "" : "]]";
        const insertion = `${targetTitle}${closingBrackets}`;
        const replaceFrom = wikiQueryRange.from + 2;
        const replaceTo = wikiQueryRange.to;
        const cursor = replaceFrom + insertion.length;

        editorView.dispatch({
          changes: {
            from: replaceFrom,
            to: replaceTo,
            insert: insertion
          },
          selection: EditorSelection.single(cursor, cursor)
        });
        wikiQueryRangeRef.current = null;
        lastWikiQuerySignatureRef.current = "";
        onWikiLinkQueryChangeRef.current?.({
          query: "",
          suggestions: []
        });
        return true;
      }
    }));

    return (
      <div
        ref={hostRef}
        data-testid={testId}
        className={[
          "min-h-56 overflow-hidden rounded-md border border-input bg-transparent transition-colors",
          disabled ? "cursor-not-allowed opacity-70" : "",
          className ?? ""
        ].join(" ")}
      >
        <div ref={editorRef} />
      </div>
    );
  }
);
