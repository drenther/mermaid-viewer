import type { ThemeTokens } from "../themes/types";

export type Engine = "beautiful" | "pele";
export type View = "svg" | "ascii";

export interface EngineCaps {
  label: string;
  href: string;
  /** Preview views this engine can produce. "svg" is always first. */
  views: readonly View[];
}

export interface RenderRequest {
  code: string;
  view: View;
  /** Used for ASCII colors and the SVG's initial colors. SvgViewer re-applies
   * theme variables on the root <svg>, so a theme change never needs a re-render. */
  tokens: ThemeTokens;
  /** Font the SVG is drawn with; pele measures labels with it. */
  fontFamily?: string;
}

export interface RenderError {
  message: string;
  /** 1-based; absent when the engine gives no position */
  line?: number;
  column?: number;
  /** Source line plus a column marker */
  snippet?: string;
}

export type RenderOutput =
  | { ok: true; svg: string; ascii: string | null; asciiUnsupported: boolean }
  | { ok: false; error: RenderError };

export interface Renderer {
  render(req: RenderRequest): Promise<RenderOutput>;
  /** CSS custom properties that theme this engine's SVG, set on its root <svg>. */
  themeVars(tokens: ThemeTokens): Record<string, string>;
}
