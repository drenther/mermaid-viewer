import type { ThemeDef, ThemeId, ThemeMode, ThemeTokens } from "./types";

// Palettes come from tuios.dev/sketch `themes.go`, a port of pele v1.6.0: pele's own
// default, the themes on pele's site and launch video, plus a few terminal themes.
// The GitHub pair is this app's own palette, with GitHub's editor colors.

type Series = ThemeTokens["series"];

// The launch-video and terminal themes give only five base colors and a series.
// Everything else follows from them: edges use the text color, subgraphs the
// border color, and the accent and critical colors come from the series.
function video(
  id: ThemeId,
  title: string,
  dark: boolean,
  source: string,
  [bg, fg, muted, surface, border]: readonly [string, string, string, string, string],
  series: Series,
): ThemeDef {
  return {
    id,
    title,
    dark,
    source,
    tokens: {
      bg,
      fg,
      muted,
      line: fg,
      surface,
      surfaceAlt: border,
      border,
      accent: series[5],
      critical: series[0],
      series,
      radius: 6,
    },
  };
}

export const THEMES: readonly ThemeDef[] = [
  {
    id: "github-light",
    title: "GitHub light",
    dark: false,
    source: "current app",
    tokens: {
      bg: "#ffffff",
      fg: "#1f2328",
      muted: "#59636e",
      line: "#59636e",
      surface: "#f6f8fa",
      surfaceAlt: "#eef1f5",
      border: "#d0d7de",
      accent: "#0969da",
      critical: "#cf222e",
      series: [
        "#cf222e",
        "#bc4c00",
        "#9a6700",
        "#1a7f37",
        "#1b7c83",
        "#0969da",
        "#8250df",
        "#bf3989",
      ],
      radius: 6,
    },
    syntax: {
      keyword: "#cf222e",
      type: "#953800",
      string: "#0a3069",
      number: "#0550ae",
      comment: "#6e7781",
    },
  },
  {
    id: "github-dark",
    title: "GitHub dark",
    dark: true,
    source: "current app",
    tokens: {
      bg: "#0d1117",
      fg: "#e6edf3",
      muted: "#9198a1",
      line: "#9198a1",
      surface: "#161b22",
      surfaceAlt: "#1c2129",
      border: "#30363d",
      accent: "#4493f8",
      critical: "#f85149",
      series: [
        "#f85149",
        "#db6d28",
        "#d29922",
        "#3fb950",
        "#39c5cf",
        "#4493f8",
        "#a371f7",
        "#db61a2",
      ],
      radius: 6,
    },
    syntax: {
      keyword: "#ff7b72",
      type: "#ffa657",
      string: "#a5d6ff",
      number: "#79c0ff",
      comment: "#8b949e",
    },
  },
  {
    id: "pele",
    title: "pele",
    dark: false,
    source: "pele default",
    tokens: {
      bg: "#ffffff",
      fg: "#1f1f1f",
      muted: "#6e6e6e",
      line: "#1f1f1f",
      surface: "#f3f3f3",
      surfaceAlt: "#e6e6e6",
      border: "#8a8a8a",
      accent: "#5b7bd5",
      critical: "#e45756",
      series: [
        "#4c78a8",
        "#f58518",
        "#54a24b",
        "#e45756",
        "#72b7b2",
        "#eeca3b",
        "#b279a2",
        "#9d755d",
      ],
      radius: 0,
    },
    // The series is in chart order, not hue order
    syntax: {
      keyword: "#4c78a8",
      type: "#b279a2",
      string: "#54a24b",
      number: "#e45756",
      comment: "#6e6e6e",
    },
  },
  {
    id: "flexoki",
    title: "Flexoki",
    dark: false,
    source: "pele.run",
    tokens: {
      bg: "#fffcf0",
      fg: "#100f0f",
      muted: "#6f6e69",
      line: "#100f0f",
      surface: "#f2f0e5",
      surfaceAlt: "#e6e4d9",
      border: "#cecdc3",
      accent: "#205ea6",
      critical: "#af3029",
      series: [
        "#af3029",
        "#bc5215",
        "#ad8301",
        "#66800b",
        "#24837b",
        "#205ea6",
        "#5e409d",
        "#a02f6f",
      ],
      radius: 6,
    },
  },
  {
    id: "flexoki-dark",
    title: "Flexoki dark",
    dark: true,
    source: "pele.run",
    tokens: {
      bg: "#100f0f",
      fg: "#cecdc3",
      muted: "#878580",
      line: "#cecdc3",
      surface: "#1c1b1a",
      surfaceAlt: "#282726",
      border: "#403e3c",
      accent: "#4385be",
      critical: "#d14d41",
      series: [
        "#d14d41",
        "#da702c",
        "#d0a215",
        "#879a39",
        "#3aa99f",
        "#4385be",
        "#8b7ec8",
        "#ce5d97",
      ],
      radius: 6,
    },
  },
  video(
    "nord",
    "Nord",
    true,
    "launch video",
    ["#2e3440", "#d8dee9", "#9eafcc", "#3b4252", "#434c5e"],
    ["#bf616a", "#d08770", "#ebcb8b", "#a3be8c", "#88c0d0", "#81a1c1", "#b48ead", "#b48ead"],
  ),
  video(
    "everforest",
    "Everforest",
    true,
    "launch video",
    ["#2d353b", "#d3c6aa", "#9da9a0", "#232a2e", "#475258"],
    ["#e67e80", "#e69875", "#dbbc7f", "#a7c080", "#83c092", "#7fbbb3", "#d699b6", "#d699b6"],
  ),
  video(
    "gruvbox",
    "Gruvbox dark",
    true,
    "launch video",
    ["#282828", "#fbf1c7", "#bdae93", "#1e2021", "#3c3836"],
    ["#cc241d", "#d65d0e", "#d79921", "#98971a", "#689d6a", "#458588", "#b16286", "#b16286"],
  ),
  video(
    "rose-pine",
    "Rosé Pine",
    true,
    "launch video",
    ["#1f1d2e", "#e0def4", "#908caa", "#191724", "#312f41"],
    ["#eb6f92", "#ea9a97", "#f6c177", "#31748f", "#9ccfd8", "#9ccfd8", "#c4a7e7", "#c4a7e7"],
  ),
  video(
    "catppuccin-mocha",
    "Catppuccin Mocha",
    true,
    "terminal",
    ["#1e1e2e", "#cdd6f4", "#a6adc8", "#313244", "#45475a"],
    ["#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#94e2d5", "#89b4fa", "#cba6f7", "#f5c2e7"],
  ),
  video(
    "catppuccin-latte",
    "Catppuccin Latte",
    false,
    "terminal",
    ["#eff1f5", "#4c4f69", "#5c5f77", "#e6e9ef", "#ccd0da"],
    ["#d20f39", "#fe640b", "#df8e1d", "#40a02b", "#179299", "#1e66f5", "#8839ef", "#ea76cb"],
  ),
  video(
    "tokyo-night",
    "Tokyo Night",
    true,
    "terminal",
    ["#1a1b26", "#c0caf5", "#a9b1d6", "#24283b", "#414868"],
    ["#f7768e", "#ff9e64", "#e0af68", "#9ece6a", "#7dcfff", "#7aa2f7", "#bb9af7", "#ff007c"],
  ),
  video(
    "dracula",
    "Dracula",
    true,
    "terminal",
    ["#282a36", "#f8f8f2", "#a4b0d8", "#343746", "#44475a"],
    ["#ff5555", "#ffb86c", "#f1fa8c", "#50fa7b", "#8be9fd", "#bd93f9", "#ff79c6", "#ff79c6"],
  ),
  video(
    "solarized-light",
    "Solarized light",
    false,
    "terminal",
    ["#fdf6e3", "#073642", "#586e75", "#eee8d5", "#d3cbb7"],
    ["#dc322f", "#cb4b16", "#b58900", "#859900", "#2aa198", "#268bd2", "#6c71c4", "#d33682"],
  ),
  video(
    "kanagawa",
    "Kanagawa",
    true,
    "terminal",
    ["#1f1f28", "#dcd7ba", "#a6a69c", "#2a2a37", "#363646"],
    ["#e46876", "#ffa066", "#e6c384", "#98bb6c", "#7aa89f", "#7e9cd8", "#957fb8", "#d27e99"],
  ),
];

export const DEFAULT_THEMES: Record<ThemeMode, ThemeId> = {
  light: "github-light",
  dark: "github-dark",
};

const byId = new Map<string, ThemeDef>(THEMES.map((t) => [t.id, t]));

/** Unknown ids (e.g. a removed theme still in storage) give undefined. */
export function getTheme(id: string): ThemeDef | undefined {
  return byId.get(id);
}

export function themesForMode(mode: ThemeMode): readonly ThemeDef[] {
  return THEMES.filter((t) => t.dark === (mode === "dark"));
}
