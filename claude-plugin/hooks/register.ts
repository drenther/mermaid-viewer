import type { Register } from "claude-code";

const VIEWER_URL = "https://mermaid.drenther.xyz/#code/";
const MERMAID_FENCE = /^```mermaid[^\S\n]*\n([\s\S]*?)\n```[^\S\n]*$/gm;

// The hooks runtime has no CompressionStream, so the payload is plain
// base64url; the viewer's decompress() falls back to it when inflate fails.
function encode(code: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(code)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function withViewerLinks(text: string): string {
  return text.replace(
    MERMAID_FENCE,
    (block, code: string) =>
      `${block}\n\n[Open in mermaid.drenther.xyz ↗](${VIEWER_URL}${encode(code)})\n`,
  );
}

export const register: Register = (on) => {
  on("ui.render", { component: "AssistantMessage" }, ($, e, next) => {
    const text = withViewerLinks(e.props.text);
    return next(text === e.props.text ? e : { ...e, props: { ...e.props, text } });
  });
};
