import { setup, assign, fromPromise, fromCallback, sendTo, type ActorRefFrom } from "xstate";
import { renderMermaidSVG, renderMermaidASCII, THEMES } from "beautiful-mermaid";
import { loadDiagramFromUrl, buildShareUrl } from "../lib/shareUrl";
import { copyToClipboard } from "../lib/clipboard";

export const SAMPLE_DIAGRAM = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[Merge]
  D --> E
  E --> F((End))`;

export type ThemeName = "github-light" | "github-dark";
export type Renderer = "svg" | "ascii";

const hashPresent = typeof window !== "undefined" && window.location.hash.startsWith("#code/");

// ---------------------------------------------------------------------------
// Reusable copy machine — pluggable via `prepare` transform
// ---------------------------------------------------------------------------
// Spawn one per copy button. Send { type: "copy", text } to trigger.
// Read `snapshot.context.copied` for the 2-second UI feedback flag.
//
// The `prepare` function (provided at spawn via input) transforms the raw
// text before copying. Use identity for plain copy, or e.g. `buildShareUrl`
// for share-via-URL.

export const copyMachine = setup({
  types: {
    context: {} as {
      copied: boolean;
      text: string;
      prepare: (text: string) => Promise<string>;
    },
    input: {} as { prepare?: (text: string) => Promise<string> },
    events: {} as { type: "copy"; text: string },
  },
  actors: {
    performCopy: fromPromise<void, { text: string; prepare: (t: string) => Promise<string> }>(
      async ({ input }) => {
        const prepared = await input.prepare(input.text);
        await copyToClipboard(prepared);
      },
    ),
  },
}).createMachine({
  id: "copy",
  initial: "idle",
  context: ({ input }) => ({
    copied: false,
    text: "",
    prepare: input.prepare ?? (async (t: string) => t),
  }),
  states: {
    idle: {
      on: {
        copy: {
          target: "copying",
          actions: assign({ text: ({ event }) => event.text }),
        },
      },
    },
    copying: {
      invoke: {
        src: "performCopy",
        input: ({ context }) => ({
          text: context.text,
          prepare: context.prepare,
        }),
        onDone: "copied",
        onError: "idle",
      },
    },
    copied: {
      entry: assign({ copied: true }),
      after: {
        2000: {
          target: "idle",
          actions: assign({ copied: false }),
        },
      },
    },
  },
});

export type CopyActorRef = ActorRefFrom<typeof copyMachine>;

// ---------------------------------------------------------------------------
// Main app machine
// ---------------------------------------------------------------------------

export const appMachine = setup({
  types: {
    context: {} as {
      code: string;
      theme: ThemeName;
      renderer: Renderer;
      svgOutput: string;
      asciiOutput: string;
      error: string | null;
      asciiUnsupported: boolean;
      codeCopyRef: CopyActorRef;
      svgCopyRef: CopyActorRef;
      asciiCopyRef: CopyActorRef;
      shareCopyRef: CopyActorRef;
    },
    events: {} as
      | { type: "setCode"; code: string }
      | { type: "setTheme"; theme: ThemeName }
      | { type: "setRenderer"; renderer: Renderer }
      | { type: "importFile"; text: string }
      | { type: "loadDiagram"; code: string }
      | { type: "copyCode" }
      | { type: "copySvg" }
      | { type: "copyAscii" }
      | { type: "share" }
      | { type: "hashChanged" },
  },
  actors: {
    loadFromUrl: fromPromise<string | null, void>(async () => {
      return loadDiagramFromUrl();
    }),
    hashWatcher: fromCallback(({ sendBack }) => {
      const handler = () => {
        if (window.location.hash.startsWith("#code/")) {
          sendBack({ type: "hashChanged" });
        }
      };
      window.addEventListener("hashchange", handler);
      return () => window.removeEventListener("hashchange", handler);
    }),
    copyMachine,
  },
  actions: {
    performRender: assign(({ context }) => {
      const trimmed = context.code.trim();
      if (!trimmed) {
        return {
          svgOutput: "",
          asciiOutput: "",
          error: null,
          asciiUnsupported: false,
        };
      }
      try {
        const svg = renderMermaidSVG(trimmed, {
          ...THEMES[context.theme],
          transparent: true,
        });
        if (context.renderer === "svg") {
          return { svgOutput: svg, error: null, asciiUnsupported: false };
        }
        try {
          const ascii = renderMermaidASCII(trimmed, {
            colorMode: "html",
            theme: THEMES[context.theme],
          });
          return {
            svgOutput: svg,
            asciiOutput: ascii,
            error: null,
            asciiUnsupported: false,
          };
        } catch {
          return {
            svgOutput: svg,
            asciiOutput: "",
            asciiUnsupported: true,
            error: null,
          };
        }
      } catch (err: any) {
        return {
          error: err?.message || "Failed to render diagram",
          asciiUnsupported: false,
        };
      }
    }),
    forwardCopyCode: sendTo(
      ({ context }) => context.codeCopyRef,
      ({ context }) => ({ type: "copy" as const, text: context.code }),
    ),
    forwardCopySvg: sendTo(
      ({ context }) => context.svgCopyRef,
      ({ context }) => ({ type: "copy" as const, text: context.svgOutput }),
    ),
    forwardCopyAscii: sendTo(
      ({ context }) => context.asciiCopyRef,
      ({ context }) => ({
        type: "copy" as const,
        text: context.asciiOutput.replace(/<[^>]*>/g, ""),
      }),
    ),
    forwardShare: sendTo(
      ({ context }) => context.shareCopyRef,
      ({ context }) => ({ type: "copy" as const, text: context.code }),
    ),
  },
  guards: {
    hasHash: () => hashPresent,
  },
}).createMachine({
  id: "app",
  context: ({ spawn }) => ({
    code: hashPresent ? "" : SAMPLE_DIAGRAM,
    theme: "github-dark" as ThemeName,
    renderer: "svg" as Renderer,
    svgOutput: "",
    asciiOutput: "",
    error: null,
    asciiUnsupported: false,
    codeCopyRef: spawn("copyMachine", {
      id: "codeCopy",
      input: {},
    }),
    svgCopyRef: spawn("copyMachine", {
      id: "svgCopy",
      input: {},
    }),
    asciiCopyRef: spawn("copyMachine", {
      id: "asciiCopy",
      input: {},
    }),
    shareCopyRef: spawn("copyMachine", {
      id: "shareCopy",
      input: {
        prepare: async (code: string) => {
          return buildShareUrl(code);
        },
      },
    }),
  }),
  initial: "boot",
  states: {
    boot: {
      always: [{ guard: "hasHash", target: "loading" }, { target: "ready" }],
    },
    loading: {
      invoke: {
        src: "loadFromUrl",
        onDone: {
          target: "ready",
          actions: assign({
            code: ({ event }) => event.output || SAMPLE_DIAGRAM,
          }),
        },
        onError: {
          target: "ready",
          actions: assign({ code: SAMPLE_DIAGRAM }),
        },
      },
    },
    ready: {
      invoke: {
        src: "hashWatcher",
      },
      initial: "debouncing",
      states: {
        debouncing: {
          after: {
            300: {
              target: "idle",
              actions: "performRender",
            },
          },
        },
        idle: {},
        loadingFromHash: {
          invoke: {
            src: "loadFromUrl",
            onDone: [
              {
                guard: ({ event }) => event.output != null,
                target: "debouncing",
                actions: assign({ code: ({ event }) => event.output! }),
              },
              { target: "idle" },
            ],
            onError: "idle",
          },
        },
      },
      on: {
        hashChanged: { target: ".loadingFromHash" },
        setCode: {
          actions: assign({ code: ({ event }) => event.code }),
          target: ".debouncing",
        },
        setTheme: {
          actions: assign({ theme: ({ event }) => event.theme }),
          target: ".debouncing",
        },
        setRenderer: {
          actions: assign({ renderer: ({ event }) => event.renderer }),
          target: ".debouncing",
        },
        importFile: {
          actions: assign({ code: ({ event }) => event.text }),
          target: ".debouncing",
        },
        loadDiagram: {
          actions: assign({ code: ({ event }) => event.code }),
          target: ".debouncing",
        },
        copyCode: { actions: "forwardCopyCode" },
        copySvg: { actions: "forwardCopySvg" },
        copyAscii: { actions: "forwardCopyAscii" },
        share: { actions: "forwardShare" },
      },
    },
  },
});
