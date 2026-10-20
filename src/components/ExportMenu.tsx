import { useEffect } from "react";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
import { useStore, useSelector } from "@xstate/store/react";
import { motion, AnimatePresence } from "motion/react";
import type { Engine } from "../renderers/types";
import type { ThemeTokens } from "../themes/types";
import {
  adaptiveSvg,
  asciiHtmlToText,
  bakeTheme,
  canCopyPng,
  copyPngToClipboard,
  downloadBlob,
  svgToPngBlob,
} from "../renderers/export";
import { copyToClipboard } from "../lib/clipboard";

interface ExportMenuProps {
  engine: Engine;
  svg: string;
  ascii: string | null;
  tokens: ThemeTokens;
  themeTitle: string;
  pair: { light: ThemeTokens; dark: ThemeTokens; lightTitle: string; darkTitle: string };
  portalContainer?: HTMLElement;
  disabled?: boolean;
}

const COPIED_MS = 2000;

const exportStoreConfig = {
  context: { copiedAt: null as number | null },
  on: {
    copied: () => ({ copiedAt: Date.now() }),
    reset: () => ({ copiedAt: null }),
  },
};

// svg and ascii are trusted renderer output (beautiful-mermaid or pele),
// not arbitrary user HTML.
export function ExportMenu({
  engine,
  svg,
  ascii,
  tokens,
  themeTitle,
  pair,
  portalContainer,
  disabled,
}: ExportMenuProps) {
  const store = useStore(exportStoreConfig);
  const copiedAt = useSelector(store, (s) => s.context.copiedAt);
  const copied = copiedAt !== null;

  // Restarts on every copy, so the check stays for 2 s after the latest one
  useEffect(() => {
    if (copiedAt === null) return;
    const id = setTimeout(() => store.trigger.reset(), COPIED_MS);
    return () => clearTimeout(id);
  }, [copiedAt, store]);

  const copyText = (text: string) => {
    copyToClipboard(text).then(
      () => store.trigger.copied(),
      () => {},
    );
  };

  const bakedPng = () => svgToPngBlob(bakeTheme(engine, svg, tokens), { background: tokens.bg });

  const handleCopySvg = () => copyText(bakeTheme(engine, svg, tokens));

  const handleCopyAdaptiveSvg = () => copyText(adaptiveSvg(engine, svg, pair.light, pair.dark));

  const handleDownloadSvg = () => {
    const blob = new Blob([bakeTheme(engine, svg, tokens)], { type: "image/svg+xml" });
    downloadBlob(blob, "diagram.svg");
  };

  const handleDownloadPng = () => {
    bakedPng().then(
      (blob) => downloadBlob(blob, "diagram.png"),
      () => {},
    );
  };

  // The PNG promise goes straight to the clipboard so the write starts inside the click.
  const handleCopyPng = () => {
    copyPngToClipboard(bakedPng()).then(
      () => store.trigger.copied(),
      () => {},
    );
  };

  const handleCopyAscii = () => {
    if (ascii) copyText(asciiHtmlToText(ascii));
  };

  const noSvg = disabled || !svg;

  return (
    <Tooltip.Root>
      <Menu.Root>
        {/* Tooltip.Trigger's own `disabled` only stops the tooltip; the button needs it here. */}
        <Tooltip.Trigger
          render={<Menu.Trigger disabled={noSvg} />}
          className="icon-btn"
          aria-label="Export diagram"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.span>
            ) : (
              <motion.span
                key="export"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </motion.span>
            )}
          </AnimatePresence>
        </Tooltip.Trigger>
        <Tooltip.Portal container={portalContainer}>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup className="tooltip-popup">
              {copied ? "Copied!" : "Export diagram"}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
        <Menu.Portal container={portalContainer}>
          <Menu.Positioner side="bottom" align="end" sideOffset={4}>
            <Menu.Popup className="dropdown-menu">
              <Menu.Item className="dropdown-menu-item" onClick={handleCopySvg}>
                Copy SVG <span className="dropdown-menu-note">{themeTitle}</span>
              </Menu.Item>
              <Menu.Item className="dropdown-menu-item" onClick={handleCopyAdaptiveSvg}>
                Copy adaptive SVG{" "}
                <span className="dropdown-menu-note">
                  {pair.lightTitle} ↔ {pair.darkTitle}
                </span>
              </Menu.Item>
              <Menu.Item className="dropdown-menu-item" onClick={handleDownloadSvg}>
                Download SVG <span className="dropdown-menu-note">{themeTitle}</span>
              </Menu.Item>
              <Menu.Separator className="dropdown-menu-separator" />
              <Menu.Item className="dropdown-menu-item" onClick={handleDownloadPng}>
                Download PNG (2×)
              </Menu.Item>
              {canCopyPng() && (
                <Menu.Item className="dropdown-menu-item" onClick={handleCopyPng}>
                  Copy PNG
                </Menu.Item>
              )}
              <Menu.Separator className="dropdown-menu-separator" />
              <Menu.Item className="dropdown-menu-item" onClick={handleCopyAscii} disabled={!ascii}>
                Copy ASCII{" "}
                {!ascii && (
                  <span className="dropdown-menu-note">
                    {engine === "pele" ? "beautiful-mermaid only" : "ASCII view only"}
                  </span>
                )}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </Tooltip.Root>
  );
}
