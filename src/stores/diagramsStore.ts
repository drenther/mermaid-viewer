import { createStore } from "@xstate/store";
import { persist } from "@xstate/store/persist";

export interface SavedDiagram {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

interface DiagramsContext {
  diagrams: SavedDiagram[];
}

export const diagramsStore = createStore({
  context: {
    diagrams: [],
  } as DiagramsContext,
  on: {
    saveDiagram: (ctx, e: { name: string; code: string }) => ({
      diagrams: [
        {
          id: crypto.randomUUID(),
          name: e.name,
          code: e.code,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        ...ctx.diagrams,
      ],
    }),

    deleteDiagram: (ctx, e: { id: string }) => ({
      diagrams: ctx.diagrams.filter((d) => d.id !== e.id),
    }),

    renameDiagram: (ctx, e: { id: string; name: string }) => ({
      diagrams: ctx.diagrams.map((d) =>
        d.id === e.id ? { ...d, name: e.name, updatedAt: Date.now() } : d,
      ),
    }),
  },
}).with(
  persist({
    name: "mermaid-viewer:diagrams",
    pick: (ctx) => ({ diagrams: ctx.diagrams }),
  }),
);
