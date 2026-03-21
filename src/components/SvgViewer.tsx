import React, { useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { useStore, useSelector } from "@xstate/store/react";
import { motion } from "motion/react";

interface SvgViewerProps {
  svgHtml: string;
  portalContainer?: HTMLElement;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;

type Mode = "idle" | "panning" | "pinching";

type Point = { x: number; y: number };

function ptDist(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function ptMid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

interface ViewerContext {
  mode: Mode;
  zoom: number;
  pan: Point;
  pointers: Record<number, Point>;
  dragStart: { x: number; y: number; panX: number; panY: number; zoom: number };
  pinchStart: { distance: number; midX: number; midY: number };
  containerCenter: Point;
}

const viewerStoreConfig = {
  context: {
    mode: "idle",
    zoom: 1,
    pan: { x: 0, y: 0 },
    pointers: {},
    dragStart: { x: 0, y: 0, panX: 0, panY: 0, zoom: 1 },
    pinchStart: { distance: 0, midX: 0, midY: 0 },
    containerCenter: { x: 0, y: 0 },
  } as ViewerContext,
  on: {
    pointerDown: (
      ctx: ViewerContext,
      e: {
        pointerId: number;
        x: number;
        y: number;
        containerCx: number;
        containerCy: number;
      },
    ) => {
      const pointers = { ...ctx.pointers, [e.pointerId]: { x: e.x, y: e.y } };
      const ids = Object.keys(pointers);
      const containerCenter = { x: e.containerCx, y: e.containerCy };

      if (ids.length === 1) {
        return {
          ...ctx,
          mode: "panning" as Mode,
          pointers,
          containerCenter,
          dragStart: {
            x: e.x,
            y: e.y,
            panX: ctx.pan.x,
            panY: ctx.pan.y,
            zoom: ctx.zoom,
          },
        };
      }

      if (ids.length === 2) {
        const pts = Object.values(pointers);
        const d = ptDist(pts[0], pts[1]);
        const m = ptMid(pts[0], pts[1]);
        return {
          ...ctx,
          mode: "pinching" as Mode,
          pointers,
          containerCenter,
          pinchStart: { distance: d, midX: m.x, midY: m.y },
          dragStart: {
            x: m.x,
            y: m.y,
            panX: ctx.pan.x,
            panY: ctx.pan.y,
            zoom: ctx.zoom,
          },
        };
      }

      return { ...ctx, pointers };
    },

    pointerMove: (ctx: ViewerContext, e: { pointerId: number; x: number; y: number }) => {
      if (!(e.pointerId in ctx.pointers)) return ctx;

      const pointers = { ...ctx.pointers, [e.pointerId]: { x: e.x, y: e.y } };

      if (ctx.mode === "panning") {
        const dx = e.x - ctx.dragStart.x;
        const dy = e.y - ctx.dragStart.y;
        return {
          ...ctx,
          pointers,
          pan: { x: ctx.dragStart.panX + dx, y: ctx.dragStart.panY + dy },
        };
      }

      if (ctx.mode === "pinching") {
        const ids = Object.keys(pointers);
        if (ids.length < 2) return { ...ctx, pointers };

        const pts = [pointers[Number(ids[0])], pointers[Number(ids[1])]];
        const d = ptDist(pts[0], pts[1]);
        const m = ptMid(pts[0], pts[1]);

        const scale = d / ctx.pinchStart.distance;
        const nextZoom = clampZoom(ctx.dragStart.zoom * scale);
        const effectiveScale = nextZoom / ctx.dragStart.zoom;

        // Zoom toward initial pinch midpoint (container-center-relative)
        const midRelX = ctx.pinchStart.midX - ctx.containerCenter.x;
        const midRelY = ctx.pinchStart.midY - ctx.containerCenter.y;
        const panFromZoomX = midRelX - effectiveScale * (midRelX - ctx.dragStart.panX);
        const panFromZoomY = midRelY - effectiveScale * (midRelY - ctx.dragStart.panY);

        // Simultaneous pan from midpoint drift
        const driftX = m.x - ctx.pinchStart.midX;
        const driftY = m.y - ctx.pinchStart.midY;

        return {
          ...ctx,
          pointers,
          zoom: nextZoom,
          pan: { x: panFromZoomX + driftX, y: panFromZoomY + driftY },
        };
      }

      return { ...ctx, pointers };
    },

    pointerUp: (ctx: ViewerContext, e: { pointerId: number }) => {
      const { [e.pointerId]: _removed, ...remaining } = ctx.pointers;
      const ids = Object.keys(remaining);

      if (ids.length === 0) {
        return { ...ctx, mode: "idle" as Mode, pointers: remaining };
      }

      if (ids.length === 1 && ctx.mode === "pinching") {
        // Transition from pinch to pan — re-snapshot to avoid jump
        const p = remaining[Number(ids[0])];
        return {
          ...ctx,
          mode: "panning" as Mode,
          pointers: remaining,
          dragStart: {
            x: p.x,
            y: p.y,
            panX: ctx.pan.x,
            panY: ctx.pan.y,
            zoom: ctx.zoom,
          },
        };
      }

      return { ...ctx, pointers: remaining };
    },

    wheel: (ctx: ViewerContext, e: { deltaY: number; cursorX: number; cursorY: number }) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const next = clampZoom(ctx.zoom + delta * ctx.zoom);
      const scale = next / ctx.zoom;
      return {
        ...ctx,
        zoom: next,
        pan: {
          x: e.cursorX - scale * (e.cursorX - ctx.pan.x),
          y: e.cursorY - scale * (e.cursorY - ctx.pan.y),
        },
      };
    },

    zoomIn: (ctx: ViewerContext) => ({
      ...ctx,
      zoom: clampZoom(ctx.zoom + ZOOM_STEP * ctx.zoom),
    }),

    zoomOut: (ctx: ViewerContext) => ({
      ...ctx,
      zoom: clampZoom(ctx.zoom - ZOOM_STEP * ctx.zoom),
    }),

    resetView: (ctx: ViewerContext) => ({
      ...ctx,
      mode: "idle" as Mode,
      zoom: 1,
      pan: { x: 0, y: 0 },
      pointers: {},
    }),

    fitToView: (ctx: ViewerContext, e: { zoom: number }) => ({
      ...ctx,
      zoom: Math.max(e.zoom, MIN_ZOOM),
      pan: { x: 0, y: 0 },
    }),
  },
};

// svgHtml is trusted output from beautiful-mermaid's renderMermaidSVG,
// not arbitrary user HTML.
export function SvgViewer({ svgHtml, portalContainer }: SvgViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const store = useStore(viewerStoreConfig);

  const zoom = useSelector(store, (s) => s.context.zoom);
  const pan = useSelector(store, (s) => s.context.pan);
  const mode = useSelector(store, (s) => s.context.mode);

  // Reset zoom/pan when SVG content changes
  useLayoutEffect(() => {
    store.trigger.resetView();
  }, [svgHtml, store]);

  // Fit to container on initial load
  useEffect(() => {
    if (!containerRef.current || !contentRef.current || !svgHtml) return;
    const container = containerRef.current;
    const svgEl = contentRef.current.querySelector("svg");
    if (!svgEl) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const sw = svgEl.getAttribute("width")
      ? parseFloat(svgEl.getAttribute("width")!)
      : svgEl.getBoundingClientRect().width;
    const sh = svgEl.getAttribute("height")
      ? parseFloat(svgEl.getAttribute("height")!)
      : svgEl.getBoundingClientRect().height;

    if (sw > 0 && sh > 0) {
      const padding = 48;
      const fitZoom = Math.min((cw - padding) / sw, (ch - padding) / sh, 1);
      store.trigger.fitToView({ zoom: fitZoom });
    }
  }, [svgHtml, store]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Don't intercept clicks on interactive elements inside SVG or zoom controls
      if (target.closest("a")) return;
      if (target.closest(".zoom-controls")) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const rect = containerRef.current!.getBoundingClientRect();
      store.trigger.pointerDown({
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        containerCx: rect.left + rect.width / 2,
        containerCy: rect.top + rect.height / 2,
      });
    },
    [store],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      store.trigger.pointerMove({
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [store],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      store.trigger.pointerUp({ pointerId: e.pointerId });
    },
    [store],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      store.trigger.wheel({
        deltaY: e.deltaY,
        cursorX: e.clientX - rect.left - rect.width / 2,
        cursorY: e.clientY - rect.top - rect.height / 2,
      });
    },
    [store],
  );

  const fitToView = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const svgEl = contentRef.current.querySelector("svg");
    if (!svgEl) return;

    const currentZoom = store.getSnapshot().context.zoom;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const sw = svgEl.getAttribute("width")
      ? parseFloat(svgEl.getAttribute("width")!)
      : svgEl.getBoundingClientRect().width / currentZoom;
    const sh = svgEl.getAttribute("height")
      ? parseFloat(svgEl.getAttribute("height")!)
      : svgEl.getBoundingClientRect().height / currentZoom;

    if (sw > 0 && sh > 0) {
      const padding = 48;
      const fitZoom = Math.min((cw - padding) / sw, (ch - padding) / sh);
      store.trigger.fitToView({ zoom: fitZoom });
    }
  }, [store]);

  const pct = Math.round(zoom * 100);

  if (!svgHtml) return null;

  return (
    <div
      ref={containerRef}
      className="svg-viewer"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: mode === "panning" ? "grabbing" : "grab" }}
    >
      <div
        ref={contentRef}
        className="svg-viewer-content"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
        // svgHtml is trusted output from beautiful-mermaid's renderer,
        // not arbitrary user HTML.
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* Floating controls */}
      <div className="zoom-controls">
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.25 }}
              />
            }
            className="zoom-btn"
            onClick={() => store.trigger.zoomIn()}
            aria-label="Zoom in"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Tooltip.Trigger>
          <Tooltip.Portal container={portalContainer}>
            <Tooltip.Positioner side="top" sideOffset={6}>
              <Tooltip.Popup className="tooltip-popup">Zoom in</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>

        <span className="zoom-level">{pct}%</span>

        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.25 }}
              />
            }
            className="zoom-btn"
            onClick={() => store.trigger.zoomOut()}
            aria-label="Zoom out"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Tooltip.Trigger>
          <Tooltip.Portal container={portalContainer}>
            <Tooltip.Positioner side="top" sideOffset={6}>
              <Tooltip.Popup className="tooltip-popup">Zoom out</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>

        <div className="zoom-sep" />

        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.25 }}
              />
            }
            className="zoom-btn"
            onClick={fitToView}
            aria-label="Fit to view"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </Tooltip.Trigger>
          <Tooltip.Portal container={portalContainer}>
            <Tooltip.Positioner side="top" sideOffset={6}>
              <Tooltip.Popup className="tooltip-popup">Fit to view</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.25 }}
              />
            }
            className="zoom-btn"
            onClick={() => store.trigger.resetView()}
            aria-label="Reset to 100%"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </Tooltip.Trigger>
          <Tooltip.Portal container={portalContainer}>
            <Tooltip.Positioner side="top" sideOffset={6}>
              <Tooltip.Popup className="tooltip-popup">Reset to 100%</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
}
