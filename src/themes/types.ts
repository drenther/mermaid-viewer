export type ThemeMode = "light" | "dark";

export type ThemeId =
  | "github-light"
  | "github-dark"
  | "pele"
  | "flexoki"
  | "flexoki-dark"
  | "nord"
  | "everforest"
  | "gruvbox"
  | "rose-pine"
  | "catppuccin-mocha"
  | "catppuccin-latte"
  | "tokyo-night"
  | "dracula"
  | "solarized-light"
  | "kanagawa";

// Color tokens shared by every renderer. Names follow pele's --pele-* variables;
// beautiful-mermaid takes a subset (bg, fg, line, accent, muted, surface, border).
export interface ThemeTokens {
  bg: string;
  fg: string;
  muted: string;
  /** Edges and arrowheads */
  line: string;
  /** Node fill */
  surface: string;
  /** Subgraph fill */
  surfaceAlt: string;
  /** Node and subgraph borders */
  border: string;
  accent: string;
  critical: string;
  /** Chart and category colors (pie slices, git branches, …) */
  series: readonly [string, string, string, string, string, string, string, string];
  /** Corner radius of rounded shapes, in px */
  radius: number;
}

export interface ThemeDef {
  id: ThemeId;
  /** Display name, e.g. "Rosé Pine" */
  title: string;
  dark: boolean;
  /** Where the palette comes from, shown under the name in the picker */
  source: string;
  tokens: ThemeTokens;
}
