import React, { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import { renderMermaidSVG, renderMermaidASCII, THEMES } from "beautiful-mermaid";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
import { Group, Panel, Separator } from "react-resizable-panels";
import { MermaidEditor } from "./MermaidEditor";
import { SvgViewer } from "./SvgViewer";
import { layoutStore } from "../stores/layoutStore";
import { motion, AnimatePresence } from "motion/react";
import "../styles/app.css";

const SAMPLE_DIAGRAM = `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process A]
  B -->|No| D[Process B]
  C --> E[Merge]
  D --> E
  E --> F((End))`;

type ThemeName = "github-light" | "github-dark";
type Renderer = "svg" | "ascii";

const MOBILE_QUERY = "(max-width: 768px)";
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerSnapshot = () => false;

function App() {
  const [code, setCode] = useState(SAMPLE_DIAGRAM);
  const [theme, setTheme] = useState<ThemeName>("github-dark");
  const [renderer, setRenderer] = useState<Renderer>("svg");
  const [error, setError] = useState<string | null>(null);
  const [asciiUnsupported, setAsciiUnsupported] = useState(false);
  const [svgOutput, setSvgOutput] = useState<string>("");
  const [asciiOutput, setAsciiOutput] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appRootRef = useRef<HTMLDivElement>(null);

  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const themeColors = THEMES[theme];
  const isDark = theme === "github-dark";

  const renderDiagram = useCallback(
    (source: string, currentRenderer: Renderer, currentTheme: ThemeName) => {
      const trimmed = source.trim();
      if (!trimmed) {
        setSvgOutput("");
        setAsciiOutput("");
        setError(null);
        return;
      }

      try {
        // Always render SVG (it's the reliable renderer)
        const svg = renderMermaidSVG(trimmed, {
          ...THEMES[currentTheme],
          transparent: true,
        });
        setSvgOutput(svg);

        if (currentRenderer === "svg") {
          setError(null);
          setAsciiUnsupported(false);
        } else {
          // Try ASCII — may fail on complex diagrams (nested subgraphs, etc.)
          try {
            const ascii = renderMermaidASCII(trimmed, {
              colorMode: "html",
              theme: THEMES[currentTheme],
            });
            setAsciiOutput(ascii);
            setError(null);
            setAsciiUnsupported(false);
          } catch {
            setAsciiOutput("");
            setAsciiUnsupported(true);
            setError(null);
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to render diagram");
        setAsciiUnsupported(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      renderDiagram(code, renderer, theme);
    }, 300);
    return () => clearTimeout(timer);
  }, [code, renderer, theme, renderDiagram]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) setCode(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const [codeCopied, setCodeCopied] = useState(false);
  const [svgCopied, setSvgCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    if (!code) return;
    try {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      navigator.clipboard
        ?.writeText(code)
        .then(() => {
          setCodeCopied(true);
          setTimeout(() => setCodeCopied(false), 2000);
        })
        .catch(() => {});
    }
  }, [code]);

  const handleExportSVG = useCallback(() => {
    if (!svgOutput) return;
    try {
      const textarea = document.createElement("textarea");
      textarea.value = svgOutput;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setSvgCopied(true);
      setTimeout(() => setSvgCopied(false), 2000);
    } catch {
      navigator.clipboard
        ?.writeText(svgOutput)
        .then(() => {
          setSvgCopied(true);
          setTimeout(() => setSvgCopied(false), 2000);
        })
        .catch(() => {});
    }
  }, [svgOutput]);

  const handleCopyASCII = useCallback(() => {
    if (!asciiOutput) return;
    const plain = asciiOutput.replace(/<[^>]*>/g, "");
    try {
      const textarea = document.createElement("textarea");
      textarea.value = plain;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: try the async API
      navigator.clipboard
        ?.writeText(plain)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  }, [asciiOutput]);

  const handleDownloadSVG = useCallback(() => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svgOutput]);

  const handleDownloadPNG = useCallback(() => {
    if (!svgOutput) return;
    const svgTag = svgOutput.match(/<svg[^>]*>/);
    if (!svgTag) return;

    let width = 800;
    let height = 600;

    const widthMatch = svgTag[0].match(/width="([^"]+)"/);
    const heightMatch = svgTag[0].match(/height="([^"]+)"/);
    if (widthMatch && heightMatch) {
      width = parseFloat(widthMatch[1]);
      height = parseFloat(heightMatch[1]);
    } else {
      const viewBoxMatch = svgTag[0].match(/viewBox="[^"]*\s([\d.]+)\s([\d.]+)"/);
      if (viewBoxMatch) {
        width = parseFloat(viewBoxMatch[1]);
        height = parseFloat(viewBoxMatch[2]);
      }
    }

    const scale = 2;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diagram.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgOutput);
  }, [svgOutput]);

  const portalContainer = appRootRef.current ?? undefined;

  // SVG/ASCII output is generated by beautiful-mermaid's renderer from
  // Mermaid DSL — it is trusted library output, not arbitrary user HTML.
  return (
    <Tooltip.Provider delay={400} closeDelay={0}>
      <div
        ref={appRootRef}
        className={`app-root ${isDark ? "dark" : "light"}`}
        style={
          {
            "--bg": themeColors.bg,
            "--fg": themeColors.fg,
            "--accent": themeColors.accent || "#4493f8",
            "--muted": themeColors.muted || "#9198a1",
            "--line": themeColors.line || "#3d444d",
            "--surface": isDark ? "#161b22" : "#f6f8fa",
            "--surface-2": isDark ? "#1c2129" : "#eef1f5",
            "--border": isDark ? "#30363d" : "#d0d7de",
          } as React.CSSProperties
        }
      >
        <div className="app-layout">
          <header className="app-header">
            <div className="header-left">
              <div className="logo-mark">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" opacity="0.6" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" opacity="0.6" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" opacity="0.3" />
                </svg>
              </div>
              <h1>Mermaid Viewer</h1>
            </div>
            <div className="header-controls">
              <ToggleGroup
                value={[theme]}
                onValueChange={(val) => {
                  if (val.length) setTheme(val[val.length - 1] as ThemeName);
                }}
                className="toggle-group"
                aria-label="Theme"
              >
                <Toggle value="github-light" className="toggle-btn" aria-label="Light theme">
                  {theme === "github-light" && (
                    <motion.span
                      layoutId="theme-pill"
                      className="toggle-pill"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  Light
                </Toggle>
                <Toggle value="github-dark" className="toggle-btn" aria-label="Dark theme">
                  {theme === "github-dark" && (
                    <motion.span
                      layoutId="theme-pill"
                      className="toggle-pill"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  Dark
                </Toggle>
              </ToggleGroup>
            </div>
          </header>

          <main className="app-main">
            <Group
              orientation={isMobile ? "vertical" : "horizontal"}
              onLayoutChanged={(layout) => {
                if (!isMobile) {
                  layoutStore.trigger.setEditorSize({ size: layout["editor"] });
                }
              }}
            >
              <Panel
                id="editor"
                className="panel editor-panel"
                defaultSize={isMobile ? "50%" : `${layoutStore.getSnapshot().context.editorSize}%`}
                minSize={isMobile ? "100px" : "200px"}
              >
                <div className="panel-tab">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Editor</span>

                  <div className="panel-tab-actions">
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        className="icon-btn"
                        onClick={handleCopyCode}
                        disabled={!code}
                        aria-label="Copy source"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {codeCopied ? (
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
                              key="copy"
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
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={portalContainer}>
                        <Tooltip.Positioner sideOffset={6}>
                          <Tooltip.Popup className="tooltip-popup">Copy source</Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>

                    <Tooltip.Root>
                      <Tooltip.Trigger
                        className="icon-btn"
                        onClick={handleImport}
                        aria-label="Import .mmd file"
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
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={portalContainer}>
                        <Tooltip.Positioner sideOffset={6}>
                          <Tooltip.Popup className="tooltip-popup">Import .mmd file</Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mmd,.mermaid,.txt,.md"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                <div className="panel-content editor-content">
                  <MermaidEditor value={code} onChange={setCode} isDark={isDark} />
                </div>
              </Panel>

              <Separator className="resize-handle" />

              <Panel
                id="preview"
                className="panel preview-panel"
                minSize={isMobile ? "100px" : "200px"}
              >
                <div className="panel-tab">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Preview</span>

                  <div className="panel-tab-actions">
                    <ToggleGroup
                      value={[renderer]}
                      onValueChange={(val) => {
                        if (val.length) setRenderer(val[val.length - 1] as Renderer);
                      }}
                      className="toggle-group"
                      aria-label="Renderer"
                    >
                      <Toggle value="svg" className="toggle-btn" aria-label="SVG renderer">
                        {renderer === "svg" && (
                          <motion.span
                            layoutId="renderer-pill"
                            className="toggle-pill"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                          />
                        )}
                        SVG
                      </Toggle>
                      <Toggle value="ascii" className="toggle-btn" aria-label="ASCII renderer">
                        {renderer === "ascii" && (
                          <motion.span
                            layoutId="renderer-pill"
                            className="toggle-pill"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                          />
                        )}
                        ASCII
                      </Toggle>
                    </ToggleGroup>

                    {renderer === "svg" ? (
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          className="icon-btn"
                          onClick={handleExportSVG}
                          disabled={!svgOutput}
                          aria-label="Copy SVG code"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {svgCopied ? (
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
                                key="copy"
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
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Tooltip.Trigger>
                        <Tooltip.Portal container={portalContainer}>
                          <Tooltip.Positioner sideOffset={6}>
                            <Tooltip.Popup className="tooltip-popup">Copy SVG code</Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    ) : (
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          className="icon-btn"
                          onClick={handleCopyASCII}
                          disabled={!asciiOutput}
                          aria-label="Copy ASCII"
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
                                key="copy"
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
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Tooltip.Trigger>
                        <Tooltip.Portal container={portalContainer}>
                          <Tooltip.Positioner sideOffset={6}>
                            <Tooltip.Popup className="tooltip-popup">Copy ASCII</Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    )}

                    <Tooltip.Root>
                      <Menu.Root>
                        <Tooltip.Trigger
                          render={<Menu.Trigger />}
                          className="icon-btn"
                          disabled={!svgOutput}
                          aria-label="Download diagram"
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
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </Tooltip.Trigger>
                        <Tooltip.Portal container={portalContainer}>
                          <Tooltip.Positioner sideOffset={6}>
                            <Tooltip.Popup className="tooltip-popup">
                              Download diagram
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                        <Menu.Portal container={portalContainer}>
                          <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                            <Menu.Popup className="dropdown-menu">
                              <Menu.Item className="dropdown-menu-item" onClick={handleDownloadSVG}>
                                Download SVG
                              </Menu.Item>
                              <Menu.Item className="dropdown-menu-item" onClick={handleDownloadPNG}>
                                Download PNG
                              </Menu.Item>
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>
                    </Tooltip.Root>
                  </div>
                </div>
                <div className="panel-content preview-content">
                  <AnimatePresence mode="wait" initial={false}>
                    {error ? (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <div className="error-box">
                          <div className="error-icon">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          </div>
                          <pre className="error-text">{error}</pre>
                        </div>
                      </motion.div>
                    ) : renderer === "ascii" && asciiUnsupported ? (
                      <motion.div
                        key="fallback"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <div className="ascii-fallback">
                          <div className="fallback-notice">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--muted)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>
                              ASCII rendering doesn't support this diagram (nested subgraphs,
                              complex edges). Showing SVG instead.
                            </span>
                            <button
                              className="fallback-switch-btn"
                              onClick={() => setRenderer("svg")}
                            >
                              Switch to SVG
                            </button>
                          </div>
                          <SvgViewer svgHtml={svgOutput} portalContainer={portalContainer} />
                        </div>
                      </motion.div>
                    ) : renderer === "svg" ? (
                      <motion.div
                        key="svg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <SvgViewer svgHtml={svgOutput} portalContainer={portalContainer} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="ascii"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ width: "100%", height: "100%" }}
                      >
                        {/* asciiOutput is trusted output from beautiful-mermaid's renderer */}
                        <pre
                          className="ascii-container"
                          dangerouslySetInnerHTML={{
                            __html: asciiOutput || "Type a diagram to see ASCII output\u2026",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Panel>
            </Group>
          </main>

          <footer className="app-footer">
            <span>Powered by</span>
            <a href="https://agents.craft.do/mermaid" target="_blank" rel="noopener noreferrer">
              beautiful-mermaid
            </a>
          </footer>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

export default App;
