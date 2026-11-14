import { useEffect, useRef } from 'react'

const NAVY = '#1E3A8A'
const TEAL = '#0D9488'
const AMBER = '#D97706'

export default function DnaHelixHero() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let frame = 0
    let animationFrame
    let width = 0
    let height = 0
    const pointer = { x: 0.72, y: 0.4, active: false }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const move = (event) => {
      const bounds = canvas.getBoundingClientRect()
      pointer.x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
      pointer.y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
      pointer.active = true
    }
    const leave = () => { pointer.active = false }

    const draw = (time) => {
      const targetAngle = pointer.active ? (pointer.x - 0.5) * 0.62 : 0
      const targetTilt = pointer.active ? (pointer.y - 0.5) * 0.16 : 0
      const speed = 0.00072 + (pointer.active ? Math.abs(pointer.x - 0.5) * 0.00032 : 0)
      const rotation = time * speed
      context.clearRect(0, 0, width, height)

      const centerX = width * 0.53
      const centerY = height * 0.52
      const amplitude = Math.min(width * 0.24, 90)
      const helixHeight = height * 0.83
      const points = []
      const steps = 34
      for (let index = 0; index <= steps; index += 1) {
        const progress = index / steps
        const y = centerY - helixHeight / 2 + progress * helixHeight
        const wave = progress * Math.PI * 4.1 + rotation
        const depth = Math.cos(wave)
        const perspective = 0.72 + depth * 0.25
        const sine = Math.sin(wave)
        const tiltX = (progress - 0.5) * targetAngle * height * 0.7
        const tiltY = (progress - 0.5) * targetTilt * height
        points.push({ strand: 0, x: centerX + sine * amplitude * perspective + tiltX, y: y + tiltY, depth, perspective })
        points.push({ strand: 1, x: centerX - sine * amplitude * perspective + tiltX, y: y + tiltY, depth: -depth, perspective: 0.72 - depth * 0.25 })
      }

      const glow = context.createRadialGradient(centerX, centerY, 4, centerX, centerY, width * 0.46)
      glow.addColorStop(0, 'rgba(13,148,136,.10)')
      glow.addColorStop(1, 'rgba(248,250,252,0)')
      context.fillStyle = glow
      context.fillRect(0, 0, width, height)

      context.lineCap = 'round'
      for (let index = 0; index < steps; index += 1) {
        const left = points[index * 2]
        const right = points[index * 2 + 1]
        const nextLeft = points[(index + 1) * 2]
        const nextRight = points[(index + 1) * 2 + 1]
        context.strokeStyle = `rgba(30,58,138,${0.18 + left.perspective * 0.28})`
        context.lineWidth = 1.2 + left.perspective * 1.25
        context.beginPath(); context.moveTo(left.x, left.y); context.lineTo(nextLeft.x, nextLeft.y); context.stroke()
        context.strokeStyle = `rgba(13,148,136,${0.18 + right.perspective * 0.28})`
        context.lineWidth = 1.2 + right.perspective * 1.25
        context.beginPath(); context.moveTo(right.x, right.y); context.lineTo(nextRight.x, nextRight.y); context.stroke()
        if (index % 2 === 0) {
          const pairAlpha = 0.18 + Math.max(left.perspective, right.perspective) * 0.42
          context.strokeStyle = `rgba(217,119,6,${pairAlpha})`
          context.lineWidth = 0.7 + pairAlpha
          context.beginPath(); context.moveTo(left.x, left.y); context.lineTo(right.x, right.y); context.stroke()
        }
      }

      const sorted = [...points].sort((a, b) => a.perspective - b.perspective)
      sorted.forEach((point, index) => {
        const color = point.strand === 0 ? NAVY : TEAL
        const radius = 1.7 + point.perspective * 2.2
        const alpha = 0.34 + point.perspective * 0.55
        context.shadowBlur = 10 * point.perspective
        context.shadowColor = color
        // Use explicit RGB values for reliable alpha compositing across browsers.
        context.fillStyle = point.strand === 0 ? `rgba(30,58,138,${alpha})` : `rgba(13,148,136,${alpha})`
        context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2); context.fill()
        if (index % 8 === 0) { context.shadowBlur = 0; context.fillStyle = `rgba(217,119,6,${alpha * 0.9})`; context.beginPath(); context.arc(point.x, point.y, 1.2, 0, Math.PI * 2); context.fill() }
      })
      context.shadowBlur = 0
      animationFrame = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    animationFrame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animationFrame); window.removeEventListener('resize', resize); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave) }
  }, [])

  return <div className="helix-hero" aria-label="Interactive DNA double helix visualization"><canvas ref={canvasRef} /><span className="helix-label">interactive molecular view</span></div>
}
