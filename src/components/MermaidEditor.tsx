import React, { useRef, useEffect } from "react";
import { EditorState } from "@codemirror/state";
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

// GitHub Dark theme for CodeMirror
const githubDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#e6edf3",
      fontSize: "13px",
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace',
    },
    ".cm-content": {
      caretColor: "#79c0ff",
      lineHeight: "1.65",
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#79c0ff",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "#264f78 !important",
    },
    ".cm-activeLine": {
      backgroundColor: "#161b2240",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#484f58",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-activeLineGutter": {
      color: "#e6edf3",
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
  },
  { dark: true },
);

// GitHub Light theme for CodeMirror
const githubLightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#1f2328",
      fontSize: "13px",
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace',
    },
    ".cm-content": {
      caretColor: "#0969da",
      lineHeight: "1.65",
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#0969da",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "#b6d8fc !important",
    },
    ".cm-activeLine": {
      backgroundColor: "#f6f8fa80",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#8b949e",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-activeLineGutter": {
      color: "#1f2328",
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
  },
  { dark: false },
);

// Dark syntax highlighting (Lezer tag-based)
const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff7b72", fontWeight: "600" },
  { tag: tags.controlKeyword, color: "#ff7b72", fontWeight: "600" },
  { tag: tags.typeName, color: "#ffa657" },
  { tag: tags.string, color: "#a5d6ff" },
  { tag: tags.content, color: "#a5d6ff" },
  { tag: tags.lineComment, color: "#8b949e", fontStyle: "italic" },
  { tag: tags.variableName, color: "#e6edf3" },
  { tag: tags.number, color: "#79c0ff" },
  { tag: tags.contentSeparator, color: "#ff7b72" },
  { tag: tags.modifier, color: "#79c0ff" },
]);

// Light syntax highlighting (Lezer tag-based)
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#cf222e", fontWeight: "600" },
  { tag: tags.controlKeyword, color: "#cf222e", fontWeight: "600" },
  { tag: tags.typeName, color: "#953800" },
  { tag: tags.string, color: "#0a3069" },
  { tag: tags.content, color: "#0a3069" },
  { tag: tags.lineComment, color: "#6e7781", fontStyle: "italic" },
  { tag: tags.variableName, color: "#24292f" },
  { tag: tags.number, color: "#0550ae" },
  { tag: tags.contentSeparator, color: "#cf222e" },
  { tag: tags.modifier, color: "#0550ae" },
]);

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
        isDark ? githubDarkTheme : githubLightTheme,
        syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle),
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
  }, [isDark]); // Recreate view when theme changes

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
