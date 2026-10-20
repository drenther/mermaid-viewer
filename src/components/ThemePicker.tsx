import { Select } from "@base-ui/react/select";
import { useSelector } from "@xstate/store/react";
import { preferencesStore, activeTheme, resolvedMode } from "../stores/preferencesStore";
import { getTheme, themesForMode } from "../themes/registry";
import type { ThemeDef, ThemeId } from "../themes/types";

interface ThemePickerProps {
  portalContainer?: HTMLElement;
}

function Swatch({ theme }: { theme: ThemeDef }) {
  const { bg, surface, fg, accent, series } = theme.tokens;
  return (
    <span className="theme-swatch" aria-hidden="true">
      {[bg, surface, fg, accent, series[0]].map((color, i) => (
        <span key={i} style={{ background: color }} />
      ))}
    </span>
  );
}

export function ThemePicker({ portalContainer }: ThemePickerProps) {
  const mode = useSelector(preferencesStore, (s) => resolvedMode(s.context));
  const theme = useSelector(preferencesStore, (s) => activeTheme(s.context));

  return (
    <Select.Root
      value={theme.id}
      onValueChange={(id: ThemeId | null) => {
        if (id) preferencesStore.trigger.setTheme({ id });
      }}
    >
      <Select.Trigger className="theme-trigger" aria-label="Diagram theme">
        <Select.Value className="theme-trigger-value">
          {(id: ThemeId) => {
            const selected = getTheme(id) ?? theme;
            return (
              <>
                <Swatch theme={selected} />
                <span className="theme-trigger-title">{selected.title}</span>
              </>
            );
          }}
        </Select.Value>
        <Select.Icon className="theme-trigger-icon">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer}>
        <Select.Positioner side="bottom" align="end" sideOffset={4} alignItemWithTrigger={false}>
          <Select.Popup className="dropdown-menu theme-menu">
            <Select.List className="theme-menu-list">
              {themesForMode(mode).map((t) => (
                <Select.Item key={t.id} value={t.id} className="theme-menu-item">
                  <Swatch theme={t} />
                  <span className="theme-menu-item-text">
                    <Select.ItemText className="theme-menu-item-title">{t.title}</Select.ItemText>
                    <span className="theme-menu-item-source">{t.source}</span>
                  </span>
                  <Select.ItemIndicator className="theme-menu-item-check">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
