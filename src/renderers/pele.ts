import type { RenderError, Renderer } from "./types";

type PeleModule = typeof import("pele");

// pele carries every diagram type, so it loads on first use instead of with the app.
let peleModule: Promise<PeleModule> | null = null;

function loadPele(): Promise<PeleModule> {
  peleModule ??= import("pele").then(
    (pele) => {
      // pele caches label widths per font. Widths measured before the web fonts
      // loaded are wrong, so drop them once the fonts are in.
      document.fonts.ready.then(() => pele.forgetTextWidths());
      return pele;
    },
    (err) => {
      // Let the next render retry a failed chunk load.
      peleModule = null;
      throw err;
    },
  );
  return peleModule;
}

// pele numbers error lines in the text it parses, not in the source. Before
// parsing it drops these, in this order (pele 1.3–1.7):
const FRONT_MATTER = /^([^\S\n]*)---\s*\n[\s\S]*?\n\1---\s*\n/g;
const DIRECTIVE = /%%\{\s*(?:\w+\s*:|\w+)\s*(?:\w+|(?:(?!\}%%).|\n)*)?\s*(?:\}%%)?/g;
// Comment lines, with any blank lines right above them, then leading blank lines.
// agentflow and eventmodeling keep both.
const COMMENT_LINE = /^\s*%%(?!\{)[^\n]+\n?/gm;
const LEADING_SPACE = /^\s+/g;

/** The source line (1-based) that each line pele parses starts on */
function parsedLines(code: string, keepsComments: boolean): number[] {
  let text = code.replace(/\r\n?/g, "\n");
  const lineAt: number[] = [];
  for (let i = 0, line = 1; i < text.length; i++) {
    lineAt.push(line);
    if (text[i] === "\n") line++;
  }
  // Source index of each character still in `text`
  let at = lineAt.map((_, i) => i);

  const drop = (re: RegExp) => {
    let kept = "";
    const keptAt: number[] = [];
    let from = 0;
    const keep = (to: number) => {
      kept += text.slice(from, to);
      for (let i = from; i < to; i++) keptAt.push(at[i]);
    };
    for (const m of text.matchAll(re)) {
      keep(m.index);
      from = m.index + m[0].length;
    }
    keep(text.length);
    text = kept;
    at = keptAt;
  };

  drop(FRONT_MATTER);
  drop(DIRECTIVE);
  if (!keepsComments) {
    drop(COMMENT_LINE);
    drop(LEADING_SPACE);
  }

  const starts = text ? [lineAt[at[0]]] : [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "\n") starts.push(lineAt[at[i + 1]]);
  }
  return starts;
}

interface SourcePosition {
  line: number;
  column: number;
  snippet: string;
}

const caretAt = (text: string, column: number) => `${text}\n${"-".repeat(column - 1)}^`;

/** Moves a pele error position into the source, checked against the line pele quotes */
function sourcePosition(
  code: string,
  err: { line: number; column: number; snippet: string },
): SourcePosition {
  const lines = code.split(/\r\n?|\n/);
  const parsed = parsedLines(code, false);
  const quoted = err.snippet.split("\n")[0];

  if (quoted.trim()) {
    // Most types parse without comments, agentflow and eventmodeling keep them,
    // and a later pele may count source lines itself.
    const candidates = [parsed[err.line - 1], parsedLines(code, true)[err.line - 1], err.line];
    for (const line of candidates) {
      const text = line === undefined ? undefined : lines[line - 1];
      // pele may have cut the start of the line: indentation, a directive
      if (text?.endsWith(quoted)) {
        const column = err.column + text.length - quoted.length;
        return { line, column, snippet: caretAt(text, column) };
      }
    }
    return { line: parsed[err.line - 1] ?? err.line, column: err.column, snippet: err.snippet };
  }

  // pele quotes an empty line for an error at the end of the input. Point just
  // past the last line with content instead.
  const line = parsed.slice(0, err.line - 1).findLast((l) => lines[l - 1].trim());
  if (line === undefined) return { line: err.line, column: err.column, snippet: "" };
  const column = lines[line - 1].trimEnd().length + 1;
  return { line, column, snippet: caretAt(lines[line - 1], column) };
}

function toRenderError(pele: PeleModule, err: unknown, code: string): RenderError {
  if (!(err instanceof pele.PeleError)) {
    return { message: (err as Error)?.message || "Failed to render diagram" };
  }
  // pele's message repeats the snippet; the preview shows it on its own.
  const error: RenderError = {
    message: err.snippet ? err.message.replace(`\n${err.snippet}`, "") : err.message,
  };
  // pele uses 0 and "" when it has no position
  if (!err.line) return error;
  // Errors without a snippet (agentflow metadata) already count source lines
  const at = err.snippet
    ? sourcePosition(code, err)
    : { line: err.line, column: err.column, snippet: "" };
  error.message = error.message.replace(new RegExp(`\\bline ${err.line}\\b`), `line ${at.line}`);
  error.line = at.line;
  if (at.column) error.column = at.column;
  if (at.snippet) error.snippet = at.snippet;
  return error;
}

export const peleRenderer: Renderer = {
  async render({ code, fontFamily }) {
    let pele: PeleModule;
    try {
      pele = await loadPele();
    } catch (err) {
      return { ok: false, error: { message: (err as Error)?.message || "Failed to load pele" } };
    }
    // Plain render() only: SvgViewer owns pan and zoom, so no mount() or enableZoom().
    try {
      const { svg } = pele.render(code, { fontFamily, responsive: false });
      return { ok: true, svg, ascii: null, asciiUnsupported: false };
    } catch (err) {
      return { ok: false, error: toRenderError(pele, err, code) };
    }
  },

  // --pele-font is left out: pele writes the measured font as its fallback.
  themeVars(t) {
    const vars: Record<string, string> = {
      "--pele-bg": t.bg,
      "--pele-fg": t.fg,
      "--pele-muted": t.muted,
      "--pele-line": t.line,
      "--pele-surface": t.surface,
      "--pele-surface-alt": t.surfaceAlt,
      "--pele-border": t.border,
      "--pele-accent": t.accent,
      "--pele-critical": t.critical,
      "--pele-radius": `${t.radius}px`,
    };
    t.series.forEach((color, i) => {
      vars[`--pele-series-${i + 1}`] = color;
    });
    return vars;
  },
};
