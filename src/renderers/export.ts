import type { ThemeTokens } from "../themes/types";
import { getRenderer } from "./index";
import type { Engine } from "./types";

// The root <svg> open tag. Quoted attribute values may contain ">".
const ROOT_TAG = /<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/;
const STYLE_ATTR = /\sstyle="([^"]*)"/;

function cssText(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

/** Rewrites the root <svg>'s style attribute; an empty result removes it. */
function editRootStyle(svg: string, edit: (style: string) => string): string {
  return svg.replace(ROOT_TAG, (tag) => {
    const match = tag.match(STYLE_ATTR);
    const style = edit(match?.[1] ?? "");
    const attr = style ? ` style="${style}"` : "";
    return match ? tag.replace(STYLE_ATTR, () => attr) : tag.replace(/^<svg/, () => `<svg${attr}`);
  });
}

// beautiful-mermaid writes its colors as custom properties on the root; drop those, keep the rest.
function withoutCustomProps(style: string): string {
  return style
    .split(";")
    .filter((decl) => decl.trim() && !decl.trim().startsWith("--"))
    .join(";");
}

/** Writes the theme's colors into the SVG so it looks the same outside the app. */
export function bakeTheme(engine: Engine, svg: string, tokens: ThemeTokens): string {
  const vars = cssText(getRenderer(engine).themeVars(tokens));
  // pele's root style only reads --pele-* (with fallbacks), so the vars go in front of it.
  if (engine === "pele") return editRootStyle(svg, (style) => (style ? `${vars};${style}` : vars));
  return editRootStyle(svg, (style) => [vars, withoutCustomProps(style)].filter(Boolean).join(";"));
}

/** An SVG that follows the viewer's color scheme: light colors by default, dark ones under
 * prefers-color-scheme: dark. */
export function adaptiveSvg(
  engine: Engine,
  svg: string,
  light: ThemeTokens,
  dark: ThemeTokens,
): string {
  const renderer = getRenderer(engine);
  const selector = engine === "pele" ? ".pele" : "svg";
  const block =
    `<style>${selector}{${cssText(renderer.themeVars(light))}}` +
    `@media (prefers-color-scheme: dark){${selector}{${cssText(renderer.themeVars(dark))}}}</style>`;
  // Inline vars on the root would beat the stylesheet.
  const base = engine === "pele" ? svg : editRootStyle(svg, withoutCustomProps);
  return base.replace(ROOT_TAG, (tag) => tag + block);
}

function svgSize(svg: string): { width: number; height: number } {
  const tag = svg.match(ROOT_TAG)?.[0] ?? "";
  const attr = (name: string) => {
    const value = tag.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1];
    // Percentages say nothing about the drawing's size
    return value && !value.endsWith("%") ? parseFloat(value) : NaN;
  };
  const width = attr("width");
  const height = attr("height");
  if (width > 0 && height > 0) return { width, height };

  const viewBox = tag
    .match(/\sviewBox="([^"]+)"/)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }
  return { width: 800, height: 600 };
}

/** Rasterizes an SVG to PNG. `background` fills behind the diagram; without it the PNG is
 * transparent. */
export function svgToPngBlob(
  svg: string,
  { scale = 2, background }: { scale?: number; background?: string } = {},
): Promise<Blob> {
  const { width, height } = svgSize(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))),
        "image/png",
      );
    };
    img.onerror = () => reject(new Error("Failed to load SVG as an image"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function canCopyPng(): boolean {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function" &&
    (ClipboardItem.supports?.("image/png") ?? true)
  );
}

/** Accepts a promise so callers can start the write inside the click handler: Safari drops
 * the clipboard permission once the gesture's task ends. */
export async function copyPngToClipboard(blob: Blob | Promise<Blob>): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** Plain text from beautiful-mermaid's html color mode: drops the color spans and decodes the
 * entities it escapes. */
export function asciiHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
