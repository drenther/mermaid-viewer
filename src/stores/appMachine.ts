import { setup, assign, fromPromise, fromCallback, sendTo, type ActorRefFrom } from "xstate";
import { loadDiagramFromUrl, buildShareUrl } from "../lib/shareUrl";
import { copyToClipboard } from "../lib/clipboard";
import { effectiveView, getRenderer } from "../renderers";
import type { Engine, RenderError, RenderOutput, RenderRequest, View } from "../renderers/types";
import { preferencesStore, activeTheme } from "./preferencesStore";

export const SAMPLE_DIAGRAM = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[Merge]
  D --> E
  E --> F((End))`;

const hashPresent = typeof window !== "undefined" && window.location.hash.startsWith("#code/");

/** The engine and view an output was rendered with. They trail the preferences while a
 * re-render is pending, so the preview and exports follow the output on screen. */
export interface RenderedWith {
  engine: Engine;
  view: View;
}

type RenderInput = RenderRequest & { engine: Engine };

function requestedOutput(): RenderedWith {
  const { engine, view } = preferencesStore.getSnapshot().context;
  return { engine, view: effectiveView(engine, view) };
}

// pele sizes shapes from measured label widths, so it must measure the font the
// preview shows the SVG in.
function previewFontFamily(): string {
  const preview = document.querySelector(".preview-content");
  return (preview && getComputedStyle(preview).fontFamily) || "Inter, sans-serif";
}

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
      svgOutput: string;
      asciiOutput: string;
      error: RenderError | null;
      asciiUnsupported: boolean;
      renderedWith: RenderedWith;
      codeCopyRef: CopyActorRef;
      shareCopyRef: CopyActorRef;
    },
    events: {} as
      | { type: "setCode"; code: string }
      | { type: "importFile"; text: string }
      | { type: "loadDiagram"; code: string }
      | { type: "copyCode" }
      | { type: "share" }
      | { type: "hashChanged" }
      | { type: "rendererChanged" }
      | { type: "themeChanged" }
      | { type: "fontsLoaded" },
  },
  actors: {
    loadFromUrl: fromPromise<string | null, void>(async () => {
      return loadDiagramFromUrl();
    }),
    renderDiagram: fromPromise<{ result: RenderOutput; renderedWith: RenderedWith }, RenderInput>(
      async ({ input }) => ({
        result: await getRenderer(input.engine).render(input),
        renderedWith: { engine: input.engine, view: input.view },
      }),
    ),
    hashWatcher: fromCallback(({ sendBack }) => {
      const handler = () => {
        if (window.location.hash.startsWith("#code/")) {
          sendBack({ type: "hashChanged" });
        }
      };
      window.addEventListener("hashchange", handler);
      return () => window.removeEventListener("hashchange", handler);
    }),
    prefsWatcher: fromCallback(({ sendBack }) => {
      let prev = preferencesStore.getSnapshot().context;
      const sub = preferencesStore.subscribe(({ context }) => {
        if (context.engine !== prev.engine || context.view !== prev.view) {
          sendBack({ type: "rendererChanged" });
        } else if (activeTheme(context) !== activeTheme(prev)) {
          sendBack({ type: "themeChanged" });
        }
        prev = context;
      });
      return () => sub.unsubscribe();
    }),
    // Labels measured before the web fonts load are too narrow or too wide.
    fontWatcher: fromCallback(({ sendBack }) => {
      let active = true;
      document.fonts.ready.then(() => {
        if (active) sendBack({ type: "fontsLoaded" });
      });
      return () => {
        active = false;
      };
    }),
    copyMachine,
  },
  actions: {
    clearOutput: assign(() => ({
      svgOutput: "",
      asciiOutput: "",
      error: null,
      asciiUnsupported: false,
      renderedWith: requestedOutput(),
    })),
    forwardCopyCode: sendTo(
      ({ context }) => context.codeCopyRef,
      ({ context }) => ({ type: "copy" as const, text: context.code }),
    ),
    forwardShare: sendTo(
      ({ context }) => context.shareCopyRef,
      ({ context }) => ({ type: "copy" as const, text: context.code }),
    ),
  },
  guards: {
    hasHash: () => hashPresent,
    isBlank: ({ context }) => !context.code.trim(),
    // ASCII colors are inline, so only ASCII needs a re-render. The SVG
    // picks up a theme change through SvgViewer's themeVars.
    showsAscii: () => requestedOutput().view === "ascii",
  },
}).createMachine({
  id: "app",
  context: ({ spawn }) => ({
    code: hashPresent ? "" : SAMPLE_DIAGRAM,
    svgOutput: "",
    asciiOutput: "",
    error: null,
    asciiUnsupported: false,
    renderedWith: requestedOutput(),
    codeCopyRef: spawn("copyMachine", {
      id: "codeCopy",
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
      invoke: [{ src: "hashWatcher" }, { src: "prefsWatcher" }, { src: "fontWatcher" }],
      initial: "debouncing",
      states: {
        // Every input change lands here. Leaving `rendering` stops its actor, so a
        // slow render (pele loads on first use) never overwrites newer output.
        debouncing: {
          after: {
            300: [
              { guard: "isBlank", target: "idle", actions: "clearOutput" },
              { target: "rendering" },
            ],
          },
        },
        rendering: {
          invoke: {
            src: "renderDiagram",
            input: ({ context }) => {
              const prefs = preferencesStore.getSnapshot().context;
              return {
                code: context.code.trim(),
                ...requestedOutput(),
                tokens: activeTheme(prefs).tokens,
                fontFamily: previewFontFamily(),
              };
            },
            onDone: {
              target: "idle",
              actions: assign(({ event }) => {
                const { result, renderedWith } = event.output;
                if (!result.ok) return { error: result.error, asciiUnsupported: false };
                return {
                  svgOutput: result.svg,
                  asciiOutput: result.ascii ?? "",
                  error: null,
                  asciiUnsupported: result.asciiUnsupported,
                  renderedWith,
                };
              }),
            },
            onError: {
              target: "idle",
              actions: assign({
                error: ({ event }) => ({
                  message: (event.error as Error)?.message || "Failed to render diagram",
                }),
                asciiUnsupported: false,
              }),
            },
          },
          on: { fontsLoaded: "debouncing" },
        },
        idle: {
          on: { fontsLoaded: "debouncing" },
        },
        loadingFromHash: {
          invoke: {
            src: "loadFromUrl",
            onDone: [
              {
                guard: ({ event }) => event.output != null,
                target: "debouncing",
                actions: assign({ code: ({ event }) => event.output! }),
              },
              // Back to debouncing, not idle: the hash change may have cut off a render.
              { target: "debouncing" },
            ],
            onError: "debouncing",
          },
        },
      },
      on: {
        hashChanged: { target: ".loadingFromHash" },
        setCode: {
          actions: assign({ code: ({ event }) => event.code }),
          target: ".debouncing",
        },
        rendererChanged: { target: ".debouncing" },
        themeChanged: {
          guard: "showsAscii",
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
        share: { actions: "forwardShare" },
      },
    },
  },
});
