// BlackHoleCanvas.tsx
import React, { useEffect, useRef } from 'react'

interface ParticleProps {
  canvas: HTMLCanvasElement
  angle: number
  distance: number
}

class Particle {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  angle: number
  distance: number
  speed: number
  radius: number
  color: string
  rotationSpeed: number

  constructor({ canvas, angle, distance }: ParticleProps) {
    const brightness = Math.floor(Math.random() * 155) + 100
    this.color = `rgba(${brightness}, 0, 0, 1)`
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')!
    this.angle = angle
    this.distance = distance
    this.speed = Math.random() * 0.5 + 0.5
    this.radius = Math.random() * 3 + 1
    this.rotationSpeed = Math.random() * 0.3 - 0.01
  }

  update() {
    this.distance -= this.speed
    this.angle += this.rotationSpeed
    this.radius -= 0.02
    if (this.radius <= 0) {
      this.reset()
    }
  }

  reset() {
    this.distance = (Math.random() * this.canvas.width) / 2
    this.angle = Math.random() * Math.PI * 2
    this.speed = Math.random() * 0.5 + 0.5
    this.radius = Math.random() * 3 + 1
  }

  draw() {
    const x = this.canvas.width / 2 + this.distance * Math.cos(this.angle)
    const y = this.canvas.height / 2 + this.distance * Math.sin(this.angle)
    this.ctx.beginPath()
    this.ctx.arc(x, y, this.radius, 0, Math.PI * 2)
    this.ctx.fillStyle = this.color
    this.ctx.fill()
  }
}

interface AnimationProps {
  canvas: HTMLCanvasElement
}

class Animation {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  particles: Particle[]
  angle: number
  rafId?: number

  constructor({ canvas }: AnimationProps) {
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')!
    this.particles = []
    this.angle = 100
    this.init()
  }

  init() {
    for (let i = 0; i < 1000; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = (Math.random() * this.canvas.width) / 2
      this.particles.push(new Particle({ canvas: this.canvas, angle, distance }))
    }
  }

  update() {
    this.particles.forEach((particle) => particle.update())
  }

  draw() {
    // Clear the canvas without filling it with color
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.save()
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.rotate(this.angle)
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2)
    this.angle += 0.001

    this.particles.forEach((particle) => particle.draw())

    this.ctx.restore()
  }
  animate() {
    this.update()
    this.draw()
    this.rafId = requestAnimationFrame(() => this.animate())
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
  }
}

interface BlackHoleCanvasProps {
  width?: number
  height?: number
}

const BlackHoleCanvas: React.FC<BlackHoleCanvasProps> = ({ width = 800, height = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<Animation | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = width
      canvas.height = height
      animationRef.current = new Animation({ canvas })
      animationRef.current.animate()
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop()
      }
    }
  }, [width, height])

  return (
    <div className="flex justify-center items-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

export default BlackHoleCanvas
