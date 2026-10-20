import { createStore } from "@xstate/store";
import { persist } from "@xstate/store/persist";
import { DEFAULT_THEMES, getTheme } from "../themes/registry";
import type { ThemeDef, ThemeId, ThemeMode } from "../themes/types";
import type { Engine, View } from "../renderers/types";

/** "system" follows the OS light/dark setting, including later changes */
export type ModePreference = ThemeMode | "system";

export interface PreferencesContext {
  mode: ModePreference;
  /** The OS setting, kept current by a media query listener and never persisted */
  systemMode: ThemeMode;
  /** The theme picked for each mode, so switching modes restores the last pick */
  theme: Record<ThemeMode, ThemeId>;
  engine: Engine;
  view: View;
}

const modeOf = (theme: ThemeDef): ThemeMode => (theme.dark ? "dark" : "light");

// A persisted id can be stale (a theme removed in a later release) or belong to
// the other mode. Either way, fall back to that mode's default.
function resolveTheme(id: unknown, mode: ThemeMode): ThemeDef {
  const theme = typeof id === "string" ? getTheme(id) : undefined;
  return theme && modeOf(theme) === mode ? theme : getTheme(DEFAULT_THEMES[mode])!;
}

export function resolvedMode(ctx: Pick<PreferencesContext, "mode" | "systemMode">): ThemeMode {
  return ctx.mode === "system" ? ctx.systemMode : ctx.mode;
}

export function pickedTheme(picks: PreferencesContext["theme"], mode: ThemeMode): ThemeDef {
  return resolveTheme(picks[mode], mode);
}

export function activeTheme(
  ctx: Pick<PreferencesContext, "mode" | "systemMode" | "theme">,
): ThemeDef {
  return pickedTheme(ctx.theme, resolvedMode(ctx));
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

const systemMode = (): ThemeMode =>
  typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light";

const isModePreference = (v: unknown): v is ModePreference =>
  v === "light" || v === "dark" || v === "system";
const isEngine = (v: unknown): v is Engine => v === "beautiful" || v === "pele";
const isView = (v: unknown): v is View => v === "svg" || v === "ascii";

export const preferencesStore = createStore({
  context: {
    mode: "system",
    systemMode: systemMode(),
    theme: { ...DEFAULT_THEMES },
    engine: "beautiful",
    view: "svg",
  } as PreferencesContext,
  on: {
    setMode: (ctx, event: { mode: ModePreference }) => ({ ...ctx, mode: event.mode }),
    systemModeChanged: (ctx, event: { mode: ThemeMode }) => ({ ...ctx, systemMode: event.mode }),
    setTheme: (ctx, event: { id: ThemeId }) => {
      const theme = getTheme(event.id);
      if (!theme) return ctx;
      const themeMode = modeOf(theme);
      // A theme of the other mode switches to that mode; otherwise "system" stays
      const mode = resolvedMode(ctx) === themeMode ? ctx.mode : themeMode;
      return { ...ctx, mode, theme: { ...ctx.theme, [themeMode]: theme.id } };
    },
    setEngine: (ctx, event: { engine: Engine }) => ({ ...ctx, engine: event.engine }),
    setView: (ctx, event: { view: View }) => ({ ...ctx, view: event.view }),
  },
}).with(
  persist({
    name: "mermaid-viewer:prefs",
    pick: ({ mode, theme, engine, view }) => ({ mode, theme, engine, view }),
    merge: (persisted, current) => ({
      mode: isModePreference(persisted.mode) ? persisted.mode : current.mode,
      systemMode: current.systemMode,
      theme: {
        light: resolveTheme(persisted.theme?.light, "light").id,
        dark: resolveTheme(persisted.theme?.dark, "dark").id,
      },
      engine: isEngine(persisted.engine) ? persisted.engine : current.engine,
      view: isView(persisted.view) ? persisted.view : current.view,
    }),
  }),
);

if (typeof window !== "undefined") {
  window.matchMedia(DARK_QUERY).addEventListener("change", (e) => {
    preferencesStore.trigger.systemModeChanged({ mode: e.matches ? "dark" : "light" });
  });
}
