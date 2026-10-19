import { expect, test } from "claude-code/testing";

const LINK =
  /\[Open in mermaid\.drenther\.xyz ↗\]\(https:\/\/mermaid\.drenther\.xyz\/#code\/([\w-]+)\)/g;

const FLOWCHART = "flowchart LR\n  A[Café] --> B{Ünïcode ✓}";
const SEQUENCE = "sequenceDiagram\n  Alice->>Bob: hi";

// Mirrors the viewer's base64urlToArrayBuffer + TextDecoder fallback.
function decode(payload: string): string {
  let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

test("links each mermaid block to a viewer URL that decodes back to its code", async ($, on) => {
  let drawn = "";
  on("ui.render", { component: "AssistantMessage" }, (_, e) => {
    drawn = e.props.text;
    return { type: "engine", ref: 1 };
  });

  const text = [
    "Two diagrams:",
    "```mermaid",
    FLOWCHART,
    "```",
    "and",
    "```mermaid",
    SEQUENCE,
    "```",
  ].join("\n");
  await $.ui.render({
    surface: "terminal",
    component: "AssistantMessage",
    requestId: "m1",
    props: { text, isFirstOfReply: true },
  });

  const payloads = [...drawn.matchAll(LINK)].map((match) => match[1] ?? "");
  expect(payloads.map(decode)).toEqual([FLOWCHART, SEQUENCE]);
  expect(drawn).toContain("```\n\n[Open in");
});

test("leaves other code blocks and an unclosed mermaid block alone", async ($, on) => {
  let drawn = "";
  on("ui.render", { component: "AssistantMessage" }, (_, e) => {
    drawn = e.props.text;
    return { type: "engine", ref: 1 };
  });

  const text = "```ts\nconst a = 1;\n```\nstreaming:\n```mermaid\nflowchart LR\n  A --> B";
  await $.ui.render({
    surface: "terminal",
    component: "AssistantMessage",
    requestId: "m2",
    props: { text, isFirstOfReply: true },
  });

  expect(drawn).toBe(text);
});
