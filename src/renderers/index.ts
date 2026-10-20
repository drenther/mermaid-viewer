import { beautifulRenderer } from "./beautiful";
import { peleRenderer } from "./pele";
import type { Engine, EngineCaps, Renderer, View } from "./types";

export const ENGINE_CAPS: Record<Engine, EngineCaps> = {
  beautiful: {
    label: "beautiful-mermaid",
    href: "https://agents.craft.do/mermaid",
    views: ["svg", "ascii"],
  },
  pele: {
    label: "pele",
    href: "https://pele.run",
    views: ["svg"],
  },
};

const RENDERERS: Record<Engine, Renderer> = {
  beautiful: beautifulRenderer,
  pele: peleRenderer,
};

export function getRenderer(engine: Engine): Renderer {
  return RENDERERS[engine];
}

/** The view to show: the requested one if the engine supports it, else SVG. */
export function effectiveView(engine: Engine, view: View): View {
  return ENGINE_CAPS[engine].views.includes(view) ? view : "svg";
}
