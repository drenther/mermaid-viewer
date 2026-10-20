import {
  renderMermaidSVG,
  renderMermaidASCII,
  type AsciiRenderOptions,
  type DiagramColors,
} from "beautiful-mermaid";
import type { ThemeTokens } from "../themes/types";
import type { Renderer } from "./types";

type AsciiTheme = NonNullable<AsciiRenderOptions["theme"]>;

function diagramColors(t: ThemeTokens): Required<DiagramColors> {
  return {
    bg: t.bg,
    fg: t.fg,
    line: t.line,
    accent: t.accent,
    muted: t.muted,
    surface: t.surface,
    border: t.border,
  };
}

// The SVG draws arrowheads with --accent, so the ASCII arrows use it too.
// ASCII boxes have no fill, so their borders use the muted text color; the
// border token is too faint on its own.
function asciiTheme(t: ThemeTokens): AsciiTheme {
  return {
    fg: t.fg,
    border: t.muted,
    line: t.line,
    arrow: t.accent,
    accent: t.accent,
    bg: t.bg,
    corner: t.line,
    junction: t.muted,
  };
}

export const beautifulRenderer: Renderer = {
  async render({ code, view, tokens }) {
    try {
      const svg = renderMermaidSVG(code, { ...diagramColors(tokens), transparent: true });
      if (view !== "ascii") {
        return { ok: true, svg, ascii: null, asciiUnsupported: false };
      }
      // ASCII covers fewer diagram types; fall back to the SVG when it can't render.
      try {
        const ascii = renderMermaidASCII(code, { colorMode: "html", theme: asciiTheme(tokens) });
        return { ok: true, svg, ascii, asciiUnsupported: false };
      } catch {
        return { ok: true, svg, ascii: null, asciiUnsupported: true };
      }
    } catch (err) {
      return {
        ok: false,
        error: { message: (err as Error)?.message || "Failed to render diagram" },
      };
    }
  },

  themeVars(t) {
    return {
      "--bg": t.bg,
      "--fg": t.fg,
      "--line": t.line,
      "--accent": t.accent,
      "--muted": t.muted,
      "--surface": t.surface,
      "--border": t.border,
    };
  },
};
