import React, { useRef, useEffect } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { mermaid } from "codemirror-lang-mermaid";
import { tags } from "@lezer/highlight";

// Colors are the theme's CSS variables (see themes/chrome.ts), so a theme change
// restyles the editor without touching it.
const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--fg)",
    fontSize: "13px",
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace',
  },
  ".cm-content": {
    caretColor: "var(--accent)",
    lineHeight: "1.65",
    padding: "12px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--accent)",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 35%, var(--bg)) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--surface) 50%, transparent)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "color-mix(in srgb, var(--muted) 65%, var(--bg))",
    border: "none",
    paddingLeft: "8px",
  },
  ".cm-activeLineGutter": {
    color: "var(--fg)",
    backgroundColor: "transparent",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 12px 0 4px",
    minWidth: "32px",
    fontSize: "12px",
  },
  ".cm-line": {
    padding: "0 16px",
  },
});

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syntax-keyword)", fontWeight: "600" },
  { tag: tags.controlKeyword, color: "var(--syntax-keyword)", fontWeight: "600" },
  { tag: tags.typeName, color: "var(--syntax-type)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.content, color: "var(--syntax-string)" },
  { tag: tags.lineComment, color: "var(--syntax-comment)", fontStyle: "italic" },
  { tag: tags.variableName, color: "var(--fg)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: tags.contentSeparator, color: "var(--syntax-keyword)" },
  { tag: tags.modifier, color: "var(--syntax-number)" },
]);

// CodeMirror's own defaults (search panel, selection matches) still follow light/dark
const darkMode = new Compartment();

interface MermaidEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
}

export function MermaidEditor({ value, onChange, isDark }: MermaidEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track if update came from external prop change
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        highlightSpecialChars(),
        highlightSelectionMatches(),
        drawSelection(),
        rectangularSelection(),
        crosshairCursor(),
        history(),
        mermaid(),
        editorTheme,
        darkMode.of(EditorView.darkTheme.of(isDark)),
        syntaxHighlighting(highlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: darkMode.reconfigure(EditorView.darkTheme.of(isDark)) });
  }, [isDark]);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className="cm-wrapper" />;
}
