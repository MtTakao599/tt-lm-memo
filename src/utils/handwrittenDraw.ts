import type { HandwrittenStroke } from '../types/handwrittenNote'

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: HandwrittenStroke[],
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height)
  for (const stroke of strokes) {
    drawStroke(ctx, stroke, width, height)
  }
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: HandwrittenStroke,
  width: number,
  height: number,
) {
  if (stroke.points.length === 0) {
    return
  }

  const scale = Math.min(width, height)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1, stroke.width * scale)
  ctx.strokeStyle = '#1a2332'
  ctx.globalCompositeOperation =
    stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.beginPath()
  const first = stroke.points[0]
  ctx.moveTo(first.x * width, first.y * height)
  if (stroke.points.length === 1) {
    ctx.lineTo(first.x * width + 0.01, first.y * height + 0.01)
  } else {
    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x * width, point.y * height)
    }
  }
  ctx.stroke()
  ctx.restore()
}
