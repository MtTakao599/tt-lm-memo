import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { HandwrittenStroke, HandwrittenTool } from '../types/handwrittenNote'
import { drawStroke, drawStrokes } from '../utils/handwrittenDraw'

type HandwrittenCanvasProps = {
  strokes: HandwrittenStroke[]
  tool: HandwrittenTool
  width: number
  onStroke: (stroke: HandwrittenStroke) => void
}

export function HandwrittenCanvas({
  strokes,
  tool,
  width,
  onStroke,
}: HandwrittenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef(strokes)
  const draftRef = useRef<HandwrittenStroke | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const paint = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      const nextWidth = Math.max(1, Math.round(rect.width * ratio))
      const nextHeight = Math.max(1, Math.round(rect.height * ratio))
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth
        canvas.height = nextHeight
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const visible = draftRef.current
        ? [...strokesRef.current, draftRef.current]
        : strokesRef.current
      drawStrokes(ctx, visible, rect.width, rect.height)
    }

    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [strokes])

  function pointFromEvent(event: PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return null
    }
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
  }

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    if (!ctx) {
      return
    }
    const ratio = window.devicePixelRatio || 1
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const visible = draftRef.current
      ? [...strokesRef.current, draftRef.current]
      : strokesRef.current
    drawStrokes(ctx, visible, rect.width, rect.height)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointerIdRef.current !== null || event.button !== 0) {
      return
    }
    const point = pointFromEvent(event.nativeEvent)
    if (!point) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId
    draftRef.current = { tool, width, points: [point] }
    redraw()
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointerIdRef.current !== event.pointerId || !draftRef.current) {
      return
    }
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent]
    for (const sample of events) {
      const point = pointFromEvent(sample)
      if (point) {
        draftRef.current.points.push(point)
      }
    }
    redraw()
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return
    }
    pointerIdRef.current = null
    const stroke = draftRef.current
    draftRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (stroke && stroke.points.length > 0) {
      onStroke(stroke)
    } else {
      redraw()
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="ink-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
      onContextMenu={(event) => event.preventDefault()}
    />
  )
}

export function HandwrittenPreview({ strokes }: { strokes: HandwrittenStroke[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const width = 160
    const height = 100
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    for (const stroke of strokes) {
      drawStroke(ctx, stroke, width, height)
    }
  }, [strokes])

  return <canvas ref={canvasRef} className="ink-preview" aria-hidden="true" />
}
