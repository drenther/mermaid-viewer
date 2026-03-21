import { createStore } from "@xstate/store";
import { persist } from "@xstate/store/persist";

const DEFAULT_EDITOR_SIZE = 50; // percentage

export const layoutStore = createStore({
  context: {
    editorSize: DEFAULT_EDITOR_SIZE,
  },
  on: {
    setEditorSize: (_ctx, event: { size: number }) => ({
      editorSize: event.size,
    }),
  },
}).with(
  persist({
    name: "mermaid-viewer:layout",
    pick: (ctx) => ({ editorSize: ctx.editorSize }),
  }),
);
