import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'

interface SvgViewerProps {
  svgHtml: string
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.15

// svgHtml is trusted output from beautiful-mermaid's renderMermaidSVG,
// not arbitrary user HTML.
export function SvgViewer({ svgHtml }: SvgViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Reset zoom/pan when SVG content changes
  useLayoutEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [svgHtml])

  // Fit to container on initial load
  useEffect(() => {
    if (!containerRef.current || !contentRef.current || !svgHtml) return
    const container = containerRef.current
    const svgEl = contentRef.current.querySelector('svg')
    if (!svgEl) return

    const cw = container.clientWidth
    const ch = container.clientHeight
    const sw = svgEl.getAttribute('width') ? parseFloat(svgEl.getAttribute('width')!) : svgEl.getBoundingClientRect().width
    const sh = svgEl.getAttribute('height') ? parseFloat(svgEl.getAttribute('height')!) : svgEl.getBoundingClientRect().height

    if (sw > 0 && sh > 0) {
      const padding = 48
      const fitZoom = Math.min((cw - padding) / sw, (ch - padding) / sh, 1)
      setZoom(Math.max(fitZoom, MIN_ZOOM))
      setPan({ x: 0, y: 0 })
    }
  }, [svgHtml])

  // Wheel zoom — zoom toward cursor position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const cursorX = e.clientX - rect.left - rect.width / 2
    const cursorY = e.clientY - rect.top - rect.height / 2

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom(prev => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta * prev))
      const scale = next / prev
      setPan(p => ({
        x: cursorX - scale * (cursorX - p.x),
        y: cursorY - scale * (cursorY - p.y),
      }))
      return next
    })
  }, [])

  // Drag to pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Don't intercept clicks on interactive elements inside SVG or zoom controls
    if (target.closest('a')) return
    if (target.closest('.zoom-controls')) return

    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    })
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Button controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP * prev))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP * prev))
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const fitToView = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return
    const container = containerRef.current
    const svgEl = contentRef.current.querySelector('svg')
    if (!svgEl) return

    const cw = container.clientWidth
    const ch = container.clientHeight
    const sw = svgEl.getAttribute('width') ? parseFloat(svgEl.getAttribute('width')!) : svgEl.getBoundingClientRect().width / zoom
    const sh = svgEl.getAttribute('height') ? parseFloat(svgEl.getAttribute('height')!) : svgEl.getBoundingClientRect().height / zoom

    if (sw > 0 && sh > 0) {
      const padding = 48
      const fitZoom = Math.min((cw - padding) / sw, (ch - padding) / sh)
      setZoom(Math.max(fitZoom, MIN_ZOOM))
      setPan({ x: 0, y: 0 })
    }
  }, [zoom])

  const pct = Math.round(zoom * 100)

  if (!svgHtml) return null

  return (
    <div
      ref={containerRef}
      className="svg-viewer"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        ref={contentRef}
        className="svg-viewer-content"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* Floating controls */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={zoomIn} title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <span className="zoom-level">{pct}%</span>
        <button className="zoom-btn" onClick={zoomOut} title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <div className="zoom-sep" />
        <button className="zoom-btn" onClick={fitToView} title="Fit to view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
        </button>
        <button className="zoom-btn" onClick={resetView} title="Reset to 100%">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
      </div>
    </div>
  )
}
