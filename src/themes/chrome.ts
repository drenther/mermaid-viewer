import type { SyntaxTokens, ThemeDef, ThemeTokens } from "./types";

// The whole app takes the selected theme: chrome, editor and preview. Diagram
// palettes put some colors on the background at a contrast that suits a filled
// shape but not text, so every color the app uses as text moves toward the
// foreground until it reads at 4.5:1 (WCAG AA).

const MIN_CONTRAST = 4.5;

const channels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(from: string, to: string, amount: number): string {
  const target = channels(to);
  const mixed = channels(from).map((v, i) => Math.round(v + (target[i] - v) * amount));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** `color`, moved toward `fg` just far enough to read on `bg` */
function readable(color: string, bg: string, fg: string): string {
  for (let step = 0; step < 10; step++) {
    const candidate = mix(color, fg, step / 10);
    if (contrast(candidate, bg) >= MIN_CONTRAST) return candidate;
  }
  return fg;
}

// Most series run red, orange, yellow, green, cyan, blue, purple, pink.
const seriesSyntax = ({ series, muted }: ThemeTokens): SyntaxTokens => ({
  keyword: series[6],
  type: series[2],
  string: series[3],
  number: series[1],
  comment: muted,
});

/** CSS custom properties for everything outside the diagram itself */
export function chromeVars(theme: ThemeDef): Record<string, string> {
  const t = theme.tokens;
  const text = (color: string) => readable(color, t.bg, t.fg);
  const syntax = theme.syntax ?? seriesSyntax(t);
  return {
    "--bg": t.bg,
    "--fg": t.fg,
    "--muted": text(t.muted),
    "--accent": text(t.accent),
    "--critical": text(t.critical),
    "--surface": t.surface,
    "--surface-2": t.surfaceAlt,
    "--border": t.border,
    "--syntax-keyword": text(syntax.keyword),
    "--syntax-type": text(syntax.type),
    "--syntax-string": text(syntax.string),
    "--syntax-number": text(syntax.number),
    "--syntax-comment": text(syntax.comment),
  };
}
