import React, { useRef, useEffect, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { StreamLanguage } from '@codemirror/language'

// Simple Mermaid-like syntax mode
const mermaidLanguage = StreamLanguage.define({
  token(stream, _state) {
    // Comments
    if (stream.match(/^%%/)) {
      stream.skipToEnd()
      return 'comment'
    }

    // Keywords (diagram types & directives)
    if (stream.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|xychart-beta|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Deployment)\b/)) {
      return 'keyword'
    }

    // Sub-keywords
    if (stream.match(/^(subgraph|end|participant|actor|loop|alt|else|opt|par|and|critical|note|over|left of|right of|class|classDef|click|style|linkStyle|direction|title|section|as)\b/)) {
      return 'keyword'
    }

    // Direction keywords
    if (stream.match(/^(TD|TB|BT|RL|LR)\b/)) {
      return 'atom'
    }

    // Arrow types
    if (stream.match(/^(-->|==>|-.->|<-->|<-.->|<==>|---|\.\.\.|===|--x|--o|-\.-x|-\.-o|--|\.\.|\|\|--\|\||o--|--o\{|\})/)) {
      return 'operator'
    }

    // Strings in quotes
    if (stream.match(/^"[^"]*"/)) {
      return 'string'
    }

    // Labels in |...|
    if (stream.match(/^\|[^|]*\|/)) {
      return 'string'
    }

    // Bracket content [...], {...}, (...), ((...)), [[...]], [(...)]
    if (stream.match(/^[\[\({]/)) {
      return 'bracket'
    }
    if (stream.match(/^[\]\)}]/)) {
      return 'bracket'
    }

    // Annotations
    if (stream.match(/^<<[^>]+>>/)) {
      return 'meta'
    }

    // Class references :::
    if (stream.match(/^:::[a-zA-Z_-]+/)) {
      return 'variableName'
    }

    // Node IDs (alphanumeric)
    if (stream.match(/^[a-zA-Z_]\w*/)) {
      return 'variableName'
    }

    // Numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return 'number'
    }

    // Skip everything else
    stream.next()
    return null
  },
  startState() { return {} },
})

// GitHub Dark theme for CodeMirror
const githubDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#e6edf3',
    fontSize: '13px',
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace',
  },
  '.cm-content': {
    caretColor: '#79c0ff',
    lineHeight: '1.65',
    padding: '12px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#79c0ff',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#264f78 !important',
  },
  '.cm-activeLine': {
    backgroundColor: '#161b2240',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#484f58',
    border: 'none',
    paddingLeft: '8px',
  },
  '.cm-activeLineGutter': {
    color: '#e6edf3',
    backgroundColor: 'transparent',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 12px 0 4px',
    minWidth: '32px',
    fontSize: '12px',
  },
  '.cm-line': {
    padding: '0 16px',
  },
}, { dark: true })

// GitHub Light theme for CodeMirror
const githubLightTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#1f2328',
    fontSize: '13px',
    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace',
  },
  '.cm-content': {
    caretColor: '#0969da',
    lineHeight: '1.65',
    padding: '12px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#0969da',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#b6d8fc !important',
  },
  '.cm-activeLine': {
    backgroundColor: '#f6f8fa80',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#8b949e',
    border: 'none',
    paddingLeft: '8px',
  },
  '.cm-activeLineGutter': {
    color: '#1f2328',
    backgroundColor: 'transparent',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 12px 0 4px',
    minWidth: '32px',
    fontSize: '12px',
  },
  '.cm-line': {
    padding: '0 16px',
  },
}, { dark: false })

// Dark syntax highlighting
const darkHighlight = EditorView.theme({
  '.tok-keyword': { color: '#ff7b72', fontWeight: '600' },
  '.tok-atom': { color: '#79c0ff' },
  '.tok-string': { color: '#a5d6ff' },
  '.tok-comment': { color: '#8b949e', fontStyle: 'italic' },
  '.tok-variableName': { color: '#e6edf3' },
  '.tok-number': { color: '#79c0ff' },
  '.tok-operator': { color: '#ff7b72' },
  '.tok-bracket': { color: '#8b949e' },
  '.tok-meta': { color: '#d2a8ff' },
}, { dark: true })

// Light syntax highlighting
const lightHighlight = EditorView.theme({
  '.tok-keyword': { color: '#cf222e', fontWeight: '600' },
  '.tok-atom': { color: '#0550ae' },
  '.tok-string': { color: '#0a3069' },
  '.tok-comment': { color: '#6e7781', fontStyle: 'italic' },
  '.tok-variableName': { color: '#24292f' },
  '.tok-number': { color: '#0550ae' },
  '.tok-operator': { color: '#cf222e' },
  '.tok-bracket': { color: '#6e7781' },
  '.tok-meta': { color: '#8250df' },
}, { dark: false })

interface MermaidEditorProps {
  value: string
  onChange: (value: string) => void
  isDark: boolean
}

export function MermaidEditor({ value, onChange, isDark }: MermaidEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Track if update came from external prop change
  const isExternalUpdate = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

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
        mermaidLanguage,
        isDark ? githubDarkTheme : githubLightTheme,
        isDark ? darkHighlight : lightHighlight,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        updateListener,
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [isDark]) // Recreate view when theme changes

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      isExternalUpdate.current = true
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      })
      isExternalUpdate.current = false
    }
  }, [value])

  return (
    <div ref={containerRef} className="cm-wrapper" />
  )
}
